/**
 * Write-assertion tests for interview-prep route.
 * Verifies WHAT is written to the DB and WHAT telemetry is fired.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

const { mockAuth, mockFrom, mockMessagesCreate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFrom: vi.fn(),
  mockMessagesCreate: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));
vi.mock('@/lib/log-api', () => ({ logApiCall: vi.fn() }));
vi.mock('@/lib/log-user-event', () => ({ logUserEvent: vi.fn() }));
vi.mock('@/lib/models', () => ({
  getModels: () => Promise.resolve({ SONNET: 'claude-sonnet-4-6', HAIKU: 'claude-haiku-4-5-20251001' }),
}));
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(function MockAnthropic(this: Record<string, unknown>) {
    this.messages = { create: mockMessagesCreate };
  }),
}));

import { POST } from '@/app/api/interview-prep/route';
import { logUserEvent } from '@/lib/log-user-event';
import { makeRequest, applicationWithChat, applicationWithPrep, freeUser, proUser } from '../../mocks/fixtures';

const PREP_RESPONSE = JSON.stringify({
  questions: [
    { category: 'technical', question: 'How do you handle async?', hint: ['Promises', 'async/await'], resumeReference: 'Built async pipeline' },
  ],
});

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  b.update = vi.fn(chain);
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

function makeParallelBuilder(appResult: unknown, userResult: unknown) {
  // The route calls Promise.all([supabase.from('applications')..., supabase.from('users')...])
  // Each from() call returns a builder; we need separate builders per call
  const appBuilder = makeBuilder(appResult);
  const userBuilder = makeBuilder(userResult);
  return { appBuilder, userBuilder };
}

const validBody = {
  applicationId: applicationWithChat.id,
  jobTitle: applicationWithChat.job_title,
  company: applicationWithChat.company,
  jobDescription: applicationWithChat.job_description,
  generatedResume: applicationWithChat.resume_content,
};

describe('interview-prep — write assertions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('logs interview_prep_locked_click with correct args when 402 returned', async () => {
    const { appBuilder, userBuilder } = makeParallelBuilder(
      { data: applicationWithChat, error: null },
      { data: { ...freeUser, interview_prep_count: 2 }, error: null }
    );
    mockFrom.mockReturnValueOnce(appBuilder).mockReturnValueOnce(userBuilder);

    await POST(makeRequest(validBody) as any);

    expect(vi.mocked(logUserEvent)).toHaveBeenCalledWith(
      freeUser.id,
      'interview_prep_locked_click',
      { applicationId: applicationWithChat.id, prepCount: 2 }
    );
  });

  it('does NOT log event on successful generation', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: PREP_RESPONSE }],
    });
    const { appBuilder, userBuilder } = makeParallelBuilder(
      { data: applicationWithChat, error: null },
      { data: { ...freeUser, interview_prep_count: 0 }, error: null }
    );
    const updateBuilder = makeBuilder({ data: null, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValue(countBuilder);

    await POST(makeRequest(validBody) as any);

    expect(vi.mocked(logUserEvent)).not.toHaveBeenCalled();
  });

  it('saves interview_prep to the correct applicationId and userId', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: PREP_RESPONSE }],
    });
    const { appBuilder, userBuilder } = makeParallelBuilder(
      { data: applicationWithChat, error: null },
      { data: { ...freeUser, interview_prep_count: 0 }, error: null }
    );
    const updateBuilder = makeBuilder({ data: null, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValue(countBuilder);

    await POST(makeRequest(validBody) as any);

    // The applications update should have been called
    expect((updateBuilder.update as Mock).mock.calls.length).toBeGreaterThan(0);
    const updateArgs = (updateBuilder.update as Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(updateArgs).toHaveProperty('interview_prep');

    // Scoped to correct id and user_id
    const eqCalls = (updateBuilder.eq as Mock).mock.calls as [string, unknown][];
    expect(eqCalls.some(([k, v]) => k === 'id' && v === applicationWithChat.id)).toBe(true);
    expect(eqCalls.some(([k, v]) => k === 'user_id' && v === freeUser.id)).toBe(true);
  });

  it('increments interview_prep_count for free user on first-time generation', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: PREP_RESPONSE }],
    });
    const { appBuilder, userBuilder } = makeParallelBuilder(
      { data: { ...applicationWithChat, interview_prep: null }, error: null },
      { data: { ...freeUser, interview_prep_count: 1 }, error: null }
    );
    const updateBuilder = makeBuilder({ data: null, error: null });
    const countBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValue(countBuilder);

    await POST(makeRequest(validBody) as any);

    // Wait for fire-and-forget counter increment
    await new Promise(r => setTimeout(r, 10));

    const countUpdate = (countBuilder.update as Mock).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(countUpdate?.interview_prep_count).toBe(2); // was 1, should be 2
    const countEq = (countBuilder.eq as Mock).mock.calls as [string, unknown][];
    expect(countEq.some(([k, v]) => k === 'id' && v === freeUser.id)).toBe(true);
  });

  it('does NOT increment interview_prep_count on regen (prep already exists)', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: PREP_RESPONSE }],
    });
    // applicationWithPrep has interview_prep: { questions: [] } — so isFirstTimeGen = false
    const { appBuilder, userBuilder } = makeParallelBuilder(
      { data: applicationWithPrep, error: null },
      { data: { ...freeUser, interview_prep_count: 1 }, error: null }
    );
    const updateBuilder = makeBuilder({ data: null, error: null });
    const suspiciousCountBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValue(suspiciousCountBuilder);

    await POST(makeRequest({ ...validBody, applicationId: applicationWithPrep.id }) as any);

    await new Promise(r => setTimeout(r, 10));

    // The count builder should NOT have been used (no update to interview_prep_count on regen)
    expect((suspiciousCountBuilder.update as Mock).mock.calls).toHaveLength(0);
  });

  it('does NOT increment interview_prep_count for pro users', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: PREP_RESPONSE }],
    });
    const { appBuilder, userBuilder } = makeParallelBuilder(
      { data: { ...applicationWithChat, interview_prep: null }, error: null },
      { data: { ...proUser, interview_prep_count: 5 }, error: null }
    );
    const updateBuilder = makeBuilder({ data: null, error: null });
    const suspiciousCountBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValue(suspiciousCountBuilder);

    await POST(makeRequest(validBody) as any);

    await new Promise(r => setTimeout(r, 10));

    expect((suspiciousCountBuilder.update as Mock).mock.calls).toHaveLength(0);
  });

  it('returns 402 without touching DB beyond the read queries when gated', async () => {
    const { appBuilder, userBuilder } = makeParallelBuilder(
      { data: applicationWithChat, error: null },
      { data: { ...freeUser, interview_prep_count: 2 }, error: null }
    );
    const suspiciousBuilder = makeBuilder();
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(suspiciousBuilder);

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(402);
    expect((suspiciousBuilder.update as Mock).mock.calls).toHaveLength(0);
  });
});
