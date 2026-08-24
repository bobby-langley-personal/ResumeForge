/**
 * Write-assertion tests for generate-documents route.
 * Verifies WHAT is inserted into applications and WHAT counter fields are updated.
 *
 * from() call order per successful request:
 *   [0] users        — subscription/count read
 *   [1] user_profiles — contact info read
 *   [2] applications  — insert (write assertion target)
 *   [3] users         — counter update (write assertion target, free users only)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

const { mockAuth, mockFrom, mockStreamCreate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFrom: vi.fn(),
  mockStreamCreate: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));
vi.mock('@/lib/log-api', () => ({ logApiCall: vi.fn() }));
vi.mock('@/lib/models', () => ({
  getModels: () => Promise.resolve({ SONNET: 'claude-sonnet-4-6', HAIKU: 'claude-haiku-4-5-20251001' }),
}));
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(function MockAnthropic(this: Record<string, unknown>) {
    this.messages = { create: mockStreamCreate };
  }),
}));

import { POST } from '@/app/api/generate-documents/route';
import { collectSSE } from '../../helpers/sse';
import { freeUser, proUser } from '../../mocks/fixtures';

async function* makeTextStream(chunks: string[]) {
  for (const text of chunks) {
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
  }
}

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/generate-documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const RESUME_TEXT = 'NAME: John Doe\nEXPERIENCE:\nAcme | New York\nEngineer | Jan 2022 – Present\n• Built things';

const validBody = {
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  jobDescription: 'We need a React + Node.js engineer.',
  backgroundExperience: 'I have 3 years of React and Node.js experience.',
};

describe('generate-documents — write assertions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
    mockStreamCreate.mockReturnValue(Promise.resolve(makeTextStream([RESUME_TEXT])));
  });

  it('inserts application with user_id set to the authenticated user', async () => {
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_123' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    const insertArgs = (insertBuilder.insert as Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(insertArgs.user_id).toBe(freeUser.id);
  });

  it('inserts application with chat_enabled = true when chat_unlocked_count < 3', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, chat_unlocked_count: 1 }, error: null });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_123' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    const insertArgs = (insertBuilder.insert as Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(insertArgs.chat_enabled).toBe(true);
  });

  it('inserts application with chat_enabled = false when chat_unlocked_count >= 3', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, chat_unlocked_count: 3 }, error: null });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_456' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    const insertArgs = (insertBuilder.insert as Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(insertArgs.chat_enabled).toBe(false);
  });

  it('always inserts chat_enabled = true for pro users', async () => {
    const userBuilder = makeBuilder({ data: { ...proUser, chat_unlocked_count: 10 }, error: null });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_pro' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    const insertArgs = (insertBuilder.insert as Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(insertArgs.chat_enabled).toBe(true);
  });

  it('updates tailored_resume_count and weekly_resume_count for free users', async () => {
    const activeStart = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const userBuilder = makeBuilder({ data: { ...freeUser, tailored_resume_count: 2, weekly_resume_count: 1, weekly_window_start: activeStart, chat_unlocked_count: 0 }, error: null });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_789' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    const countUpdate = (countBuilder.update as Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(countUpdate.tailored_resume_count).toBe(3); // was 2
    expect(countUpdate.weekly_resume_count).toBe(2);   // was 1 (active window)
  });

  it('increments chat_unlocked_count when below 3 (free user)', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, chat_unlocked_count: 1 }, error: null });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_abc' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    const countUpdate = (countBuilder.update as Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(countUpdate.chat_unlocked_count).toBe(2); // was 1
  });

  it('does NOT include chat_unlocked_count in update when already at 3', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, chat_unlocked_count: 3 }, error: null });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_def' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    const countUpdate = (countBuilder.update as Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(countUpdate).not.toHaveProperty('chat_unlocked_count');
  });

  it('scopes counter update to the correct userId', async () => {
    const userBuilder = makeBuilder({ data: { ...freeUser, chat_unlocked_count: 0 }, error: null });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_ghi' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    const eqCalls = (countBuilder.eq as Mock).mock.calls as [string, unknown][];
    expect(eqCalls.some(([k, v]) => k === 'id' && v === freeUser.id)).toBe(true);
  });

  it('does NOT update counters for pro users', async () => {
    const userBuilder = makeBuilder({ data: { ...proUser, chat_unlocked_count: 10 }, error: null });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_pro_2' }, error: null });
    const suspiciousCountBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(suspiciousCountBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    expect((suspiciousCountBuilder.update as Mock).mock.calls).toHaveLength(0);
  });

  it('sets weekly_window_start when window has expired', async () => {
    const expiredStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const userBuilder = makeBuilder({
      data: { ...freeUser, weekly_resume_count: 3, weekly_window_start: expiredStart, chat_unlocked_count: 0 },
      error: null,
    });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_newwindow' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const before = Date.now();
    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);
    const after = Date.now();

    const countUpdate = (countBuilder.update as Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    const newStart = countUpdate.weekly_window_start as string;
    expect(newStart).toBeDefined();
    const newStartMs = new Date(newStart).getTime();
    expect(newStartMs).toBeGreaterThanOrEqual(before);
    expect(newStartMs).toBeLessThanOrEqual(after);
    // weekly count should reset to 1 (expired window means effective count was 0, now +1)
    expect(countUpdate.weekly_resume_count).toBe(1);
  });

  it('preserves existing weekly_window_start when window is still active', async () => {
    const activeStart = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const userBuilder = makeBuilder({
      data: { ...freeUser, weekly_resume_count: 2, weekly_window_start: activeStart, chat_unlocked_count: 0 },
      error: null,
    });
    const profileBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { id: 'app_activewindow' }, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(profileBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValue(countBuilder);

    const res = await POST(makeRequest(validBody) as any);
    await collectSSE(res);

    const countUpdate = (countBuilder.update as Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(countUpdate.weekly_window_start).toBe(activeStart); // unchanged
    expect(countUpdate.weekly_resume_count).toBe(3); // was 2 (active window)
  });

  it('each user only updates their own counter row (multi-user isolation)', async () => {
    const userId1 = 'user_111';
    const userId2 = 'user_222';

    // User 1
    mockAuth.mockResolvedValueOnce({ userId: userId1 });
    const ub1 = makeBuilder({ data: { ...freeUser, id: userId1, chat_unlocked_count: 0 }, error: null });
    const pb1 = makeBuilder({ data: null, error: null });
    const ib1 = makeBuilder({ data: { id: 'app_u1' }, error: null });
    const cb1 = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(ub1).mockReturnValueOnce(pb1)
      .mockReturnValueOnce(ib1).mockReturnValueOnce(cb1);

    const res1 = await POST(makeRequest(validBody) as any);
    await collectSSE(res1);

    const eq1Calls = (cb1.eq as Mock).mock.calls as [string, unknown][];
    expect(eq1Calls.some(([k, v]) => k === 'id' && v === userId1)).toBe(true);
    expect(eq1Calls.some(([k, v]) => k === 'id' && v === userId2)).toBe(false);

    // User 2
    mockAuth.mockResolvedValueOnce({ userId: userId2 });
    const ub2 = makeBuilder({ data: { ...freeUser, id: userId2, chat_unlocked_count: 0 }, error: null });
    const pb2 = makeBuilder({ data: null, error: null });
    const ib2 = makeBuilder({ data: { id: 'app_u2' }, error: null });
    const cb2 = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(ub2).mockReturnValueOnce(pb2)
      .mockReturnValueOnce(ib2).mockReturnValueOnce(cb2);

    const res2 = await POST(makeRequest(validBody) as any);
    await collectSSE(res2);

    const eq2Calls = (cb2.eq as Mock).mock.calls as [string, unknown][];
    expect(eq2Calls.some(([k, v]) => k === 'id' && v === userId2)).toBe(true);
    expect(eq2Calls.some(([k, v]) => k === 'id' && v === userId1)).toBe(false);
  });
});
