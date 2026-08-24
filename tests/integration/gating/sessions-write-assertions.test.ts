/**
 * Write-assertion tests for interview/sessions POST route.
 * Verifies telemetry, counter increments, insert payload, and security filters.
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

import { POST } from '@/app/api/interview/sessions/route';
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

const validBody = {};

describe('interview/sessions POST — write assertions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('logs experience_interview_locked_click with correct args when 402 returned', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, experience_interview_count: 2 }, error: null });
    mockFrom.mockReturnValueOnce(userBuilder);

    await POST(makeRequest(validBody) as any);

    expect(vi.mocked(logUserEvent)).toHaveBeenCalledWith(
      freeUser.id,
      'experience_interview_locked_click',
      { interviewCount: 2 }
    );
  });

  it('does NOT log event on successful session creation', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, experience_interview_count: 0 }, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'sess_new' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    await POST(makeRequest(validBody) as any);

    expect(vi.mocked(logUserEvent)).not.toHaveBeenCalled();
  });

  it('inserts session with user_id set to the authenticated user', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, experience_interview_count: 0 }, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'sess_123' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    await POST(makeRequest(validBody) as any);

    const insertArgs = (insertBuilder.insert as Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(insertArgs.user_id).toBe(freeUser.id);
    expect(insertArgs.status).toBe('draft');
  });

  it('increments experience_interview_count for free user', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, experience_interview_count: 1 }, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'sess_123' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    await POST(makeRequest(validBody) as any);

    // Wait for fire-and-forget
    await new Promise(r => setTimeout(r, 10));

    const countUpdate = (countBuilder.update as Mock).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(countUpdate?.experience_interview_count).toBe(2); // was 1, now 2
    const eqCalls = (countBuilder.eq as Mock).mock.calls as [string, unknown][];
    expect(eqCalls.some(([k, v]) => k === 'id' && v === freeUser.id)).toBe(true);
  });

  it('does NOT increment experience_interview_count for pro users', async () => {
    const userBuilder = makeBuilder({ data: { ...proUser, experience_interview_count: 5 }, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'sess_pro' }, error: null });
    const suspiciousCountBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(suspiciousCountBuilder);

    await POST(makeRequest(validBody) as any);

    await new Promise(r => setTimeout(r, 10));

    expect((suspiciousCountBuilder.update as Mock).mock.calls).toHaveLength(0);
  });

  it('returns 402 without inserting a session when limit reached', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, experience_interview_count: 2 }, error: null });
    const suspiciousBuilder = makeBuilder();
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(suspiciousBuilder);

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(402);
    expect((suspiciousBuilder.insert as Mock).mock.calls).toHaveLength(0);
  });

  it('each user only increments their own counter (multi-user isolation)', async () => {
    const userId1 = 'user_aaa';
    const userId2 = 'user_bbb';

    // First user request
    mockAuth.mockResolvedValueOnce({ userId: userId1 });
    const userBuilder1 = makeBuilder({ data: { ...freeUser, id: userId1, experience_interview_count: 0 }, error: null });
    const insertBuilder1 = makeBuilder({ data: { id: 'sess_1' }, error: null });
    const countBuilder1 = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder1)
      .mockReturnValueOnce(insertBuilder1)
      .mockReturnValueOnce(countBuilder1);

    await POST(makeRequest(validBody) as any);
    await new Promise(r => setTimeout(r, 10));

    const eq1Calls = (countBuilder1.eq as Mock).mock.calls as [string, unknown][];
    expect(eq1Calls.some(([k, v]) => k === 'id' && v === userId1)).toBe(true);
    expect(eq1Calls.some(([k, v]) => k === 'id' && v === userId2)).toBe(false);

    // Second user request
    mockAuth.mockResolvedValueOnce({ userId: userId2 });
    const userBuilder2 = makeBuilder({ data: { ...freeUser, id: userId2, experience_interview_count: 0 }, error: null });
    const insertBuilder2 = makeBuilder({ data: { id: 'sess_2' }, error: null });
    const countBuilder2 = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder2)
      .mockReturnValueOnce(insertBuilder2)
      .mockReturnValueOnce(countBuilder2);

    await POST(makeRequest(validBody) as any);
    await new Promise(r => setTimeout(r, 10));

    const eq2Calls = (countBuilder2.eq as Mock).mock.calls as [string, unknown][];
    expect(eq2Calls.some(([k, v]) => k === 'id' && v === userId2)).toBe(true);
    expect(eq2Calls.some(([k, v]) => k === 'id' && v === userId1)).toBe(false);
  });
});
