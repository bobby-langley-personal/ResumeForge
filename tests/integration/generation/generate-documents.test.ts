import { describe, it, expect, vi, beforeEach } from 'vitest';

// generate-documents uses edge runtime. We mock all I/O so it runs in Node test env.
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
import { makeRequest, freeUser, proUser } from '../../mocks/fixtures';
import { collectSSE } from '../../helpers/sse';

// Helpers to build Anthropic streaming responses
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

const validBody = {
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  jobDescription: 'We need a React + Node.js engineer.',
  backgroundExperience: 'I have 3 years of React and Node.js experience at TechCo.',
};

const RESUME_TEXT = 'NAME: John Doe\nEXPERIENCE:\nAcme | New York\nEngineer | Jan 2022 – Present\n• Built things';

describe('POST /api/generate-documents (SSE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });

    // Default: free user under the limit, no profile
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: freeUser, error: null }))       // users query
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))            // user_profiles query
      .mockReturnValue(makeBuilder({ data: { id: 'app_new_123' }, error: null })); // insert + update

    // Default stream: resume only
    mockStreamCreate.mockReturnValue(Promise.resolve(makeTextStream([RESUME_TEXT])));
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ company: 'Acme' }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 402 FREE_LIMIT_REACHED when weekly limit hit', async () => {
    mockFrom.mockReset();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
    const activeStart = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { ...freeUser, weekly_resume_count: 5, weekly_window_start: activeStart }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValue(makeBuilder({ data: null, error: null }));

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('FREE_LIMIT_REACHED');
    expect(json.upgradeUrl).toBe('/pricing');
  });

  it('emits status, resume_chunk, resume_done, done events in order', async () => {
    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const events = await collectSSE(res);
    const types = events.map(e => e.type);

    expect(types).toContain('status');
    expect(types).toContain('resume_chunk');
    expect(types).toContain('resume_done');
    expect(types).toContain('done');

    // Order: status before resume_chunk before resume_done before done
    expect(types.indexOf('status')).toBeLessThan(types.indexOf('resume_chunk'));
    expect(types.indexOf('resume_chunk')).toBeLessThan(types.indexOf('resume_done'));
    expect(types.indexOf('resume_done')).toBeLessThan(types.indexOf('done'));
  });

  it('resume_chunk events carry content text', async () => {
    const res = await POST(makeRequest(validBody) as any);
    const events = await collectSSE(res);
    const chunks = events.filter(e => e.type === 'resume_chunk');
    expect(chunks.length).toBeGreaterThan(0);
    const combined = chunks.map(e => e.content).join('');
    expect(combined).toContain('NAME: John Doe');
  });

  it('done event carries applicationId and chatEnabled', async () => {
    const res = await POST(makeRequest(validBody) as any);
    const events = await collectSSE(res);
    const done = events.find(e => e.type === 'done');
    expect(done).toBeDefined();
    expect(done?.applicationId).toBe('app_new_123');
    expect(typeof done?.chatEnabled).toBe('boolean');
  });

  it('chatEnabled = true for first 3 free user applications', async () => {
    // freeUser has chat_unlocked_count = 0, so slot available
    const res = await POST(makeRequest(validBody) as any);
    const events = await collectSSE(res);
    const done = events.find(e => e.type === 'done');
    expect(done?.chatEnabled).toBe(true);
  });

  it('chatEnabled = false for free user after 3 applications', async () => {
    mockFrom.mockReset();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { ...freeUser, chat_unlocked_count: 3 }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValue(makeBuilder({ data: { id: 'app_4th' }, error: null }));
    mockStreamCreate.mockReturnValue(Promise.resolve(makeTextStream([RESUME_TEXT])));

    const res = await POST(makeRequest(validBody) as any);
    const events = await collectSSE(res);
    const done = events.find(e => e.type === 'done');
    expect(done?.chatEnabled).toBe(false);
  });

  it('pro users always get chatEnabled = true', async () => {
    mockFrom.mockReset();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { ...proUser, chat_unlocked_count: 10 }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValue(makeBuilder({ data: { id: 'app_pro' }, error: null }));
    mockStreamCreate.mockReturnValue(Promise.resolve(makeTextStream([RESUME_TEXT])));

    const res = await POST(makeRequest(validBody) as any);
    const events = await collectSSE(res);
    const done = events.find(e => e.type === 'done');
    expect(done?.chatEnabled).toBe(true);
  });

  it('emits cover_letter_chunk and cover_letter_done when includeCoverLetter = true', async () => {
    const COVER_LETTER = 'Dear Hiring Manager,\nI am excited to apply...';
    // First call = resume stream, second call = cover letter stream
    mockStreamCreate
      .mockReturnValueOnce(Promise.resolve(makeTextStream([RESUME_TEXT])))
      .mockReturnValueOnce(Promise.resolve(makeTextStream([COVER_LETTER])));

    const res = await POST(makeRequest({ ...validBody, includeCoverLetter: true }) as any);
    const events = await collectSSE(res);
    const types = events.map(e => e.type);

    expect(types).toContain('cover_letter_chunk');
    expect(types).toContain('cover_letter_done');
    // Cover letter comes after resume
    expect(types.indexOf('resume_done')).toBeLessThan(types.indexOf('cover_letter_chunk'));
  });

  it('emits questions_done with answers when questions provided', async () => {
    const ANSWERS_JSON = JSON.stringify({ answers: [{ question: 'Why Acme?', answer: 'Because I love the mission.' }] });
    mockStreamCreate
      .mockReturnValueOnce(Promise.resolve(makeTextStream([RESUME_TEXT])))   // resume
      .mockResolvedValueOnce({                                                // questions (non-streaming)
        content: [{ type: 'text', text: ANSWERS_JSON }],
      });

    const res = await POST(makeRequest({ ...validBody, questions: ['Why Acme?'] }) as any);
    const events = await collectSSE(res);
    const questionsDone = events.find(e => e.type === 'questions_done');
    expect(questionsDone).toBeDefined();
    expect(Array.isArray(questionsDone?.answers)).toBe(true);
    expect((questionsDone?.answers as unknown[]).length).toBe(1);
  });

  it('allows pro users to bypass weekly limit', async () => {
    mockFrom.mockReset();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
    const activeStart = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { ...proUser, weekly_resume_count: 100, weekly_window_start: activeStart }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValue(makeBuilder({ data: { id: 'app_pro_no_limit' }, error: null }));
    mockStreamCreate.mockReturnValue(Promise.resolve(makeTextStream([RESUME_TEXT])));

    const res = await POST(makeRequest(validBody) as any);
    // Should stream (not 402)
    expect(res.status).toBe(200);
    const events = await collectSSE(res);
    expect(events.find(e => e.type === 'done')).toBeDefined();
  });
});
