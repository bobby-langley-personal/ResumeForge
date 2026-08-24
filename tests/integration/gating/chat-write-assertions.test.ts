/**
 * Write-assertion tests for resume-chat route.
 * Verifies WHAT is written to the DB and WHAT telemetry is fired —
 * not just the HTTP response shape.
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

import { POST } from '@/app/api/resume-chat/route';
import { logUserEvent } from '@/lib/log-user-event';
import { makeRequest, applicationWithChat, applicationWithoutChat, freeUser, proUser } from '../../mocks/fixtures';

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

const UPDATED_RESUME = 'NAME: John Doe\nSKILLS:\nReact, Node.js, TypeScript';

const validBody = {
  applicationId: applicationWithChat.id,
  message: 'Add TypeScript to skills',
  currentResumeText: applicationWithChat.resume_content,
  originalResumeText: applicationWithChat.resume_content,
  jobDescription: applicationWithChat.job_description,
  company: applicationWithChat.company,
  jobTitle: applicationWithChat.job_title,
  backgroundExperience: 'I have 3 years of React, Node.js, and TypeScript experience.',
  chatHistory: [
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'ANSWER:\nHello!' },
  ],
};

describe('resume-chat — write assertions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('logs chat_locked_click event with correct args when 402 returned', async () => {
    const appBuilder = makeBuilder({ data: applicationWithoutChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    mockFrom.mockReturnValueOnce(appBuilder).mockReturnValueOnce(userBuilder);

    await POST(makeRequest({ ...validBody, applicationId: applicationWithoutChat.id }) as any);

    expect(vi.mocked(logUserEvent)).toHaveBeenCalledWith(
      freeUser.id,
      'chat_locked_click',
      { applicationId: applicationWithoutChat.id }
    );
  });

  it('does NOT log event when chat succeeds', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ANSWER:\nHere is advice.' }],
    });
    const appBuilder = makeBuilder({ data: applicationWithChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    mockFrom.mockReturnValueOnce(appBuilder).mockReturnValueOnce(userBuilder);

    await POST(makeRequest(validBody) as any);

    expect(vi.mocked(logUserEvent)).not.toHaveBeenCalled();
  });

  it('updates resume_content with the new resume text on CHANGE', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: `CHANGE: Added TypeScript\nRESUME:\n${UPDATED_RESUME}` }],
    });

    const appBuilder = makeBuilder({ data: applicationWithChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    const updateBuilder = makeBuilder();
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(updateBuilder);

    await POST(makeRequest(validBody) as any);

    const updateArgs = (updateBuilder.update as Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(updateArgs.resume_content).toBe(UPDATED_RESUME);
  });

  it('saves chat_history to DB on CHANGE including the new turn', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: `CHANGE: Added TypeScript\nRESUME:\n${UPDATED_RESUME}` }],
    });

    const appBuilder = makeBuilder({ data: applicationWithChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    const updateBuilder = makeBuilder();
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(updateBuilder);

    await POST(makeRequest(validBody) as any);

    const updateArgs = (updateBuilder.update as Mock).mock.calls[0][0] as Record<string, unknown>;
    const history = updateArgs.chat_history as { role: string; content: string }[];
    expect(Array.isArray(history)).toBe(true);
    // History should contain the new user message and AI response
    expect(history.some(m => m.role === 'user' && m.content === validBody.message)).toBe(true);
    expect(history.some(m => m.role === 'assistant')).toBe(true);
  });

  it('scopes the DB update to the correct applicationId and userId', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: `CHANGE: Fixed it\nRESUME:\n${UPDATED_RESUME}` }],
    });

    const appBuilder = makeBuilder({ data: applicationWithChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    const updateBuilder = makeBuilder();
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(updateBuilder);

    await POST(makeRequest(validBody) as any);

    const eqCalls = (updateBuilder.eq as Mock).mock.calls as [string, unknown][];
    const hasAppIdFilter = eqCalls.some(([k, v]) => k === 'id' && v === applicationWithChat.id);
    const hasUserIdFilter = eqCalls.some(([k, v]) => k === 'user_id' && v === freeUser.id);
    expect(hasAppIdFilter).toBe(true);
    expect(hasUserIdFilter).toBe(true);
  });

  it('does NOT write to DB on ANSWER response', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ANSWER:\nHere is advice about your skills section.' }],
    });

    const appBuilder = makeBuilder({ data: applicationWithChat, error: null });
    const userBuilder = makeBuilder({ data: freeUser, error: null });
    const suspiciousBuilder = makeBuilder();
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(userBuilder)
      .mockReturnValue(suspiciousBuilder);

    await POST(makeRequest(validBody) as any);

    // No update should have been called for an ANSWER response
    expect((suspiciousBuilder.update as Mock).mock.calls).toHaveLength(0);
  });
});
