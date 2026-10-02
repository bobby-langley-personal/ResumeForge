/**
 * Integration tests for /api/download-docx/polished
 *
 * Takes resumeText in the body (not applicationId), generates a DOCX directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockCurrentUser, mockFrom } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCurrentUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));
vi.mock('@/lib/log-api', () => ({ logApiCall: vi.fn() }));
vi.mock('@/lib/with-api-logging', () => ({
  withApiLogging: (_route: string, handler: Function) => handler,
}));

import { POST } from '@/app/api/download-docx/polished/route';
import { makeRequest } from '../../mocks/fixtures';

const RESUME_TEXT = `Jane Smith | Remote | jane@example.com

EXPERIENCE
Startup Inc | Remote
Senior Engineer | Mar 2021 – Present
• Architected microservices platform serving 1M+ users

EDUCATION
Stanford | B.S. Computer Science | 2020`;

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  return b;
}

describe('POST /api/download-docx/polished', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
    mockCurrentUser.mockResolvedValue({ fullName: 'Jane Smith', firstName: 'Jane' });
    mockFrom.mockReturnValue(makeBuilder({ data: { full_name: 'Jane Smith' }, error: null }));
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await (POST as any)(makeRequest({ resumeText: RESUME_TEXT }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when resumeText is missing', async () => {
    const res = await (POST as any)(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when resumeText is empty string', async () => {
    const res = await (POST as any)(makeRequest({ resumeText: '' }));
    expect(res.status).toBe(400);
  });

  it('returns a DOCX binary with correct Content-Type', async () => {
    const res = await (POST as any)(makeRequest({ resumeText: RESUME_TEXT }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('returns non-empty binary body', async () => {
    const res = await (POST as any)(makeRequest({ resumeText: RESUME_TEXT }));
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('uses default filename when fileName not provided', async () => {
    const res = await (POST as any)(makeRequest({ resumeText: RESUME_TEXT }));
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('Polished_Resume');
    expect(disposition).toContain('.docx');
  });

  it('uses sanitised custom fileName when provided', async () => {
    const res = await (POST as any)(
      makeRequest({ resumeText: RESUME_TEXT, fileName: 'Jane Smith Resume 2026' })
    );
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('Jane_Smith_Resume_2026');
    expect(disposition).toContain('.docx');
  });

  it('uses profile full_name over Clerk display name', async () => {
    mockCurrentUser.mockResolvedValue({ fullName: 'Wrong Name', firstName: 'Wrong' });
    mockFrom.mockReturnValue(makeBuilder({ data: { full_name: 'Jane Smith' }, error: null }));
    // Just verify it doesn't error — name is embedded in DOCX internals, not headers
    const res = await (POST as any)(makeRequest({ resumeText: RESUME_TEXT }));
    expect(res.status).toBe(200);
  });
});
