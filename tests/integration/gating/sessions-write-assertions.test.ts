/**
 * Write-assertion tests for PATCH /api/interview/sessions/[id].
 * Verifies per-role gating: free users are limited to 2 completed roles (lifetime).
 * experience_interview_count tracks total roles completed, not sessions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));
vi.mock('@/lib/log-user-event', () => ({ logUserEvent: vi.fn() }));

import { PATCH } from '@/app/api/interview/sessions/[id]/route';
import { logUserEvent } from '@/lib/log-user-event';
import { makeRequest, freeUser, proUser } from '../../mocks/fixtures';

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  b.single = vi.fn(() => Promise.resolve(result));
  b.update = vi.fn(chain);
  b.insert = vi.fn(chain);
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

const SESSION_ID = 'sess_abc';
const params = { params: Promise.resolve({ id: SESSION_ID }) };

function makePatchRequest(body: Record<string, unknown>) {
  return makeRequest(body, {}, 'PATCH');
}

describe('interview/sessions PATCH — role gating write assertions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 402 INTERVIEW_LIMIT_REACHED when adding a role would exceed limit', async () => {
    // User already has 2 roles; trying to add a 3rd
    const sessionBuilder = makeBuilder({ data: { completed_roles: ['role1', 'role2'] }, error: null });
    const userBuilder = makeBuilder({ data: { ...freeUser, experience_interview_count: 2 }, error: null });
    mockFrom
      .mockReturnValueOnce(sessionBuilder) // session fetch
      .mockReturnValueOnce(userBuilder);   // user fetch

    const res = await PATCH(
      makePatchRequest({ completed_roles: ['role1', 'role2', 'role3'] }) as any,
      params as any
    );

    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('INTERVIEW_LIMIT_REACHED');
    expect(json.upgradeUrl).toBe('/pricing');
  });

  it('logs experience_interview_locked_click with correct args when 402 returned', async () => {
    const sessionBuilder = makeBuilder({ data: { completed_roles: ['role1', 'role2'] }, error: null });
    const userBuilder = makeBuilder({ data: { ...freeUser, experience_interview_count: 2 }, error: null });
    mockFrom
      .mockReturnValueOnce(sessionBuilder)
      .mockReturnValueOnce(userBuilder);

    await PATCH(
      makePatchRequest({ completed_roles: ['role1', 'role2', 'role3'] }) as any,
      params as any
    );

    expect(vi.mocked(logUserEvent)).toHaveBeenCalledWith(
      freeUser.id,
      'experience_interview_locked_click',
      { usedRoles: 2, limit: 2 }
    );
  });

  it('allows adding a role when free user is under the limit', async () => {
    const sessionBuilder = makeBuilder({ data: { completed_roles: ['role1'] }, error: null });
    const userBuilder = makeBuilder({ data: { ...freeUser, experience_interview_count: 1 }, error: null });
    const updateBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(sessionBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(updateBuilder);

    const res = await PATCH(
      makePatchRequest({ completed_roles: ['role1', 'role2'] }) as any,
      params as any
    );

    expect(res.status).toBe(204);
  });

  it('increments experience_interview_count when a new role is added', async () => {
    const sessionBuilder = makeBuilder({ data: { completed_roles: ['role1'] }, error: null });
    const userBuilder = makeBuilder({ data: { ...freeUser, experience_interview_count: 1 }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    const sessionUpdateBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(sessionBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(countBuilder)    // fire-and-forget counter update
      .mockReturnValue(sessionUpdateBuilder); // session update

    await PATCH(
      makePatchRequest({ completed_roles: ['role1', 'role2'] }) as any,
      params as any
    );

    await new Promise(r => setTimeout(r, 10));

    const countUpdate = (countBuilder.update as Mock).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(countUpdate?.experience_interview_count).toBe(2); // was 1, now 2
    const eqCalls = (countBuilder.eq as Mock).mock.calls as [string, unknown][];
    expect(eqCalls.some(([k, v]) => k === 'id' && v === freeUser.id)).toBe(true);
  });

  it('does NOT increment experience_interview_count for pro users', async () => {
    const sessionBuilder = makeBuilder({ data: { completed_roles: ['role1', 'role2'] }, error: null });
    const userBuilder = makeBuilder({ data: { ...proUser, experience_interview_count: 5 }, error: null });
    const suspiciousBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(sessionBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(suspiciousBuilder);

    await PATCH(
      makePatchRequest({ completed_roles: ['role1', 'role2', 'role3'] }) as any,
      params as any
    );

    await new Promise(r => setTimeout(r, 10));

    expect((suspiciousBuilder.update as Mock).mock.calls).toHaveLength(1); // only the session update, not counter
  });

  it('each user only increments their own counter (multi-user isolation)', async () => {
    const userId1 = 'user_aaa';
    const userId2 = 'user_bbb';

    mockAuth.mockResolvedValueOnce({ userId: userId1 });
    const sessionBuilder1 = makeBuilder({ data: { completed_roles: [] }, error: null });
    const userBuilder1 = makeBuilder({ data: { ...freeUser, id: userId1, experience_interview_count: 0 }, error: null });
    const countBuilder1 = makeBuilder({ data: null, error: null });
    const updateBuilder1 = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(sessionBuilder1)
      .mockReturnValueOnce(userBuilder1)
      .mockReturnValueOnce(countBuilder1)
      .mockReturnValue(updateBuilder1);

    await PATCH(makePatchRequest({ completed_roles: ['role1'] }) as any, params as any);
    await new Promise(r => setTimeout(r, 10));

    const eq1Calls = (countBuilder1.eq as Mock).mock.calls as [string, unknown][];
    expect(eq1Calls.some(([k, v]) => k === 'id' && v === userId1)).toBe(true);
    expect(eq1Calls.some(([k, v]) => k === 'id' && v === userId2)).toBe(false);
  });
});
