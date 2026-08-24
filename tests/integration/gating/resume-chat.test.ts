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
  // Must use regular function (not arrow) so `new Anthropic()` works as a constructor
  Anthropic: vi.fn(function MockAnthropicConstructor(this: Record<string, unknown>) {
    this.messages = { create: mockMessagesCreate };
  }),
}));

import { POST } from '@/app/api/resume-chat/route';
import { makeRequest, applicationWithChat, applicationWithoutChat, freeUser, proUser } from '../../mocks/fixtures';

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  b.update = vi.fn(chain);
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

const validBody = {
  applicationId: applicationWithChat.id,
  message: 'Add React to my skills',
  currentResumeText: applicationWithChat.resume_content,
  originalResumeText: applicationWithChat.resume_content,
  jobDescription: applicationWithChat.job_description,
  company: applicationWithChat.company,
  jobTitle: applicationWithChat.job_title,
  backgroundExperience: 'I have 3 years of React experience.',
  chatHistory: [],
};

describe('POST /api/resume-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ANSWER:\nHere is some advice about your resume.' }],
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ applicationId: 'x', message: 'Hi' }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 403 when application belongs to a different user', async () => {
    const appBuilder = makeBuilder({ data: { ...applicationWithChat, user_id: 'other_user' }, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    mockFrom.mockReturnValueOnce(appBuilder).mockReturnValueOnce(userBuilder);

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(403);
  });

  it('returns 402 CHAT_LOCKED for free user with chat_enabled = false', async () => {
    const appBuilder = makeBuilder({ data: applicationWithoutChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    mockFrom.mockReturnValueOnce(appBuilder).mockReturnValueOnce(userBuilder);

    const res = await POST(makeRequest({ ...validBody, applicationId: applicationWithoutChat.id }) as any);
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('CHAT_LOCKED');
    expect(json.upgradeUrl).toBe('/pricing');
  });

  it('allows pro user even when chat_enabled = false', async () => {
    const appBuilder = makeBuilder({ data: applicationWithoutChat, error: null });
    const userBuilder = makeBuilder({ data: proUser, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(makeBuilder({ data: null, error: null }));

    const res = await POST(makeRequest({ ...validBody, applicationId: applicationWithoutChat.id }) as any);
    expect(res.status).toBe(200);
  });

  it('returns 200 and answer type for ANSWER: response', async () => {
    const appBuilder = makeBuilder({ data: applicationWithChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    mockFrom.mockReturnValueOnce(appBuilder).mockReturnValueOnce(userBuilder);

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.type).toBe('answer');
    expect(typeof json.message).toBe('string');
  });

  it('returns change type and updatedResume for CHANGE: response', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'CHANGE: Added React to Skills\nRESUME:\nNAME: John Doe\nSKILLS:\nReact, Node.js' }],
    });

    const appBuilder = makeBuilder({ data: applicationWithChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(makeBuilder({ data: null, error: null }));

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.type).toBe('change');
    expect(json.message).toBe('Added React to Skills');
    expect(json.updatedResume).toContain('NAME: John Doe');
  });
});
