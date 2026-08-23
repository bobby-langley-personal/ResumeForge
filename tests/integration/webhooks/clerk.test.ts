import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockVerify, mockFrom, mockSendEmail, mockGetUser } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
  mockFrom: vi.fn(),
  mockSendEmail: vi.fn(),
  mockGetUser: vi.fn(),
}));

// Mock svix Webhook class
vi.mock('svix', () => ({
  Webhook: vi.fn(function MockWebhook(this: Record<string, unknown>) {
    this.verify = mockVerify;
  }),
}));

// Mock next/headers — returns our controlled svix headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: (key: string) => {
      const map: Record<string, string> = {
        'svix-id': 'svix_id_test',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,test_sig',
      };
      return map[key] ?? null;
    },
  })),
}));

vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(() =>
    Promise.resolve({ users: { getUser: mockGetUser } })
  ),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(function MockResend(this: Record<string, unknown>) {
    this.emails = { send: mockSendEmail };
  }),
}));

// Mock email templates
vi.mock('@/lib/emails/new-member', () => ({
  newMemberHtml: vi.fn(() => '<html>Welcome</html>'),
  newMemberSubject: vi.fn(() => 'New member: test@example.com'),
}));

import { POST } from '@/app/api/webhooks/clerk/route';

process.env.CLERK_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@example.com';
process.env.RESEND_API_KEY = 're_test_key';
process.env.NOTIFICATION_FROM_EMAIL = 'hello@easy-apply.ai';

function makeClerkRequest(payload: unknown) {
  return new Request('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function makeUserCreatedPayload(id = 'user_new_123', email = 'newuser@example.com') {
  return {
    type: 'user.created',
    data: {
      id,
      email_addresses: [{ email_address: email }],
      first_name: 'New',
      last_name: 'User',
    },
  };
}

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.upsert = vi.fn(chain);
  b.delete = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.neq = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

describe('POST /api/webhooks/clerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ id: 'email_123' });
    // Default: no existing user with this email
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
  });

  it('returns 400 when svix headers are missing', async () => {
    // Override headers mock to return null
    const { headers } = await import('next/headers');
    (headers as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      get: () => null,
    });

    const req = makeClerkRequest(makeUserCreatedPayload());
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when webhook signature verification fails', async () => {
    mockVerify.mockImplementation(() => { throw new Error('Invalid signature'); });
    const req = makeClerkRequest(makeUserCreatedPayload());
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('upserts user row on user.created', async () => {
    const payload = makeUserCreatedPayload();
    mockVerify.mockReturnValue(payload);

    const req = makeClerkRequest(payload);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    // mockFrom should have been called for the upsert
    expect(mockFrom).toHaveBeenCalled();
  });

  it('sends admin notification email on user.created', async () => {
    const payload = makeUserCreatedPayload();
    mockVerify.mockReturnValue(payload);

    const req = makeClerkRequest(payload);
    await POST(req as any);
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('returns 400 when email is missing from user.created', async () => {
    const payload = {
      type: 'user.created',
      data: { id: 'user_no_email', email_addresses: [], first_name: 'No', last_name: 'Email' },
    };
    mockVerify.mockReturnValue(payload);
    const req = makeClerkRequest(payload);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 200 for unhandled event types', async () => {
    const payload = { type: 'organization.created', data: {} };
    mockVerify.mockReturnValue(payload);
    const req = makeClerkRequest(payload);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  it('migrates data from existing user row when email already exists', async () => {
    const existingUser = {
      id: 'old_user_id',
      tailored_resume_count: 5,
      subscription_status: 'pro',
      stripe_customer_id: 'cus_old',
      subscription_period_end: null,
    };

    const newPayload = makeUserCreatedPayload('new_user_id', 'existing@example.com');
    mockVerify.mockReturnValue(newPayload);

    // First call: check for existing user by email → found
    // Subsequent calls: migration updates + upsert
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeBuilder({ data: existingUser, error: null });
      return makeBuilder({ data: null, error: null });
    });

    const req = makeClerkRequest(newPayload);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    // Multiple calls expected: find existing, migrate tables, delete old, upsert new
    expect(mockFrom.mock.calls.length).toBeGreaterThan(2);
  });
});
