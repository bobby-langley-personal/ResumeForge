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

import { DELETE } from '@/app/api/applications/route';
import { GET, DELETE as DELETE_ONE } from '@/app/api/applications/[id]/route';
import { makeRequest, freeUser, applicationWithChat } from '../../mocks/fixtures';

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.update = vi.fn(chain);
  b.delete = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

function makeParams(id: string) {
  return Promise.resolve({ id });
}

describe('DELETE /api/applications (bulk)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const req = makeRequest({ ids: ['app1'] }, undefined, 'DELETE');
    const res = await DELETE(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when ids is not provided', async () => {
    const req = makeRequest({}, undefined, 'DELETE');
    const res = await DELETE(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when ids is empty array', async () => {
    const req = makeRequest({ ids: [] }, undefined, 'DELETE');
    const res = await DELETE(req as any);
    expect(res.status).toBe(400);
  });

  it('deletes matching applications and returns 204', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest({ ids: ['app1', 'app2'] }, undefined, 'DELETE');
    const res = await DELETE(req as any);
    expect(res.status).toBe(204);
  });

  it('filters by user_id so users cannot delete others applications', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest({ ids: ['other_users_app'] }, undefined, 'DELETE');
    await DELETE(req as any);

    // The .eq('user_id', userId) call must have been made
    const eqCalls = (builder.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((call: unknown[]) => call[0] === 'user_id')).toBe(true);
  });
});

describe('GET /api/applications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
    mockCurrentUser.mockResolvedValue({ fullName: 'John Doe', firstName: 'John' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(makeRequest({}) as any, { params: makeParams(applicationWithChat.id) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when application not found', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'not found' } }));
    const res = await GET(makeRequest({}) as any, { params: makeParams('nonexistent') });
    expect(res.status).toBe(404);
  });

  it('returns 403 when application belongs to different user', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { ...applicationWithChat, user_id: 'other' }, error: null }));
    const res = await GET(makeRequest({}) as any, { params: makeParams(applicationWithChat.id) });
    expect(res.status).toBe(403);
  });

  it('returns 200 with application content and candidateName', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: applicationWithChat, error: null }));
    const res = await GET(makeRequest({}) as any, { params: makeParams(applicationWithChat.id) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.company).toBe(applicationWithChat.company);
    expect(json.candidateName).toBe('John Doe');
    expect(json.resumeContent).toBe(applicationWithChat.resume_content);
  });
});

describe('DELETE /api/applications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const req = makeRequest({}, undefined, 'DELETE');
    const res = await DELETE_ONE(req as any, { params: makeParams(applicationWithChat.id) });
    expect(res.status).toBe(401);
  });

  it('deletes application and returns 204', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);
    const req = makeRequest({}, undefined, 'DELETE');
    const res = await DELETE_ONE(req as any, { params: makeParams(applicationWithChat.id) });
    expect(res.status).toBe(204);
  });
});
