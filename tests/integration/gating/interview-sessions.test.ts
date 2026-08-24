import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));
vi.mock('@/lib/log-api', () => ({ logApiCall: vi.fn() }));
vi.mock('@/lib/log-user-event', () => ({ logUserEvent: vi.fn() }));

import { GET, POST } from '@/app/api/interview/sessions/route';
import { makeRequest, freeUser, proUser } from '../../mocks/fixtures';

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

const SESSION = { id: 'session_abc', user_id: freeUser.id, status: 'draft', completed_roles: [], draft_state: null };

describe('GET /api/interview/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns session when found', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: SESSION, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session.id).toBe(SESSION.id);
  });

  it('returns null session when none exists', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session).toBeNull();
  });
});

describe('POST /api/interview/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest({}) as any);
    expect(res.status).toBe(401);
  });

  // Role-based gating (FREE_ROLE_LIMIT = 2) happens in PATCH /[id] when completed_roles grows.
  // POST just creates the session — no limit enforced here.
  it('returns 201 with session id on success', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { id: 'session_new' }, error: null }));

    const res = await POST(makeRequest({}) as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeDefined();
  });

  it('returns 201 even when free user has used roles (gate is in PATCH, not here)', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { id: 'session_any' }, error: null }));

    const res = await POST(makeRequest({}) as any);
    expect(res.status).toBe(201);
  });
});
