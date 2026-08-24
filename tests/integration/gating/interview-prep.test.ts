import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  Anthropic: vi.fn(function MockAnthropicConstructor(this: Record<string, unknown>) {
    this.messages = { create: mockMessagesCreate };
  }),
}));

import { POST } from '@/app/api/interview-prep/route';
import { makeRequest, freeUser, proUser, applicationWithChat, applicationWithPrep } from '../../mocks/fixtures';

const MOCK_PREP = {
  questions: [
    { category: 'technical', question: 'Tell me about React', hint: ['Hooks', 'State'], resumeReference: 'Built React apps' },
    { category: 'behavioral', question: 'Describe a challenge', hint: ['STAR method'], resumeReference: 'Led team migration' },
  ],
};

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.update = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

const validBody = {
  applicationId: applicationWithChat.id,
  jobTitle: applicationWithChat.job_title,
  company: applicationWithChat.company,
  jobDescription: applicationWithChat.job_description,
  generatedResume: applicationWithChat.resume_content ?? '',
};

describe('POST /api/interview-prep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(MOCK_PREP) }],
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ applicationId: 'x' }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 404 when application not found', async () => {
    const appBuilder = makeBuilder({ data: null, error: { message: 'not found' } });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    mockFrom.mockReturnValueOnce(appBuilder).mockReturnValueOnce(userBuilder);

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(404);
  });

  it('returns 403 when application belongs to different user', async () => {
    const appBuilder = makeBuilder({ data: { ...applicationWithChat, user_id: 'other' }, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    mockFrom.mockReturnValueOnce(appBuilder).mockReturnValueOnce(userBuilder);

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(403);
  });

  it('returns 402 PREP_LIMIT_REACHED for free user with count >= 2 on first-time gen', async () => {
    const appBuilder = makeBuilder({ data: applicationWithChat, error: null }); // no interview_prep → first-time
    const userBuilder = makeBuilder({ data: { ...freeUser, interview_prep_count: 2 }, error: null });
    mockFrom.mockReturnValueOnce(appBuilder).mockReturnValueOnce(userBuilder);

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('PREP_LIMIT_REACHED');
  });

  it('allows regen even when free user has count >= 2', async () => {
    const appBuilder = makeBuilder({ data: applicationWithPrep, error: null }); // has interview_prep → regen
    const userBuilder = makeBuilder({ data: { ...freeUser, interview_prep_count: 2 }, error: null });
    const updateBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(updateBuilder);

    const res = await POST(makeRequest({ ...validBody, applicationId: applicationWithPrep.id }) as any);
    expect(res.status).toBe(200);
  });

  it('allows pro user with count >= 2 on first-time gen', async () => {
    const appBuilder = makeBuilder({ data: applicationWithChat, error: null });
    const userBuilder = makeBuilder({ data: { ...proUser, interview_prep_count: 5 }, error: null });
    const updateBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(updateBuilder);

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(200);
  });

  it('returns 200 with InterviewPrep on success', async () => {
    const appBuilder = makeBuilder({ data: applicationWithChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    const updateBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(updateBuilder);

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.questions).toBeDefined();
    expect(Array.isArray(json.questions)).toBe(true);
  });
});
