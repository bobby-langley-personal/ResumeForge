import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockMessagesCreate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockMessagesCreate: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/log-api', () => ({ logApiCall: vi.fn() }));
vi.mock('@/lib/models', () => ({
  getModels: () => Promise.resolve({ SONNET: 'claude-sonnet-4-6', HAIKU: 'claude-haiku-4-5-20251001' }),
}));
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(function MockAnthropic(this: Record<string, unknown>) {
    this.messages = { create: mockMessagesCreate };
  }),
}));

import { POST } from '@/app/api/analyze-fit/route';
import { makeRequest } from '../../mocks/fixtures';

const FIT_ANALYSIS_JSON = JSON.stringify({
  overallFit: 'Strong Fit',
  strengths: [{ point: 'React expertise', source: 'Primary Resume' }],
  gaps: [],
  suggestions: [],
  plannedImprovements: ['Add TypeScript metrics'],
  roleType: 'technical',
});

const KEYWORDS_JSON = JSON.stringify({ keywords: ['react', 'typescript', 'node.js'] });

const validBody = {
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  jobDescription: 'We need React, TypeScript, and Node.js skills.',
  backgroundExperience: 'I have 3 years of React and TypeScript experience.',
};

function makeTextMessage(text: string) {
  return { content: [{ type: 'text', text }] };
}

describe('POST /api/analyze-fit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
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

  it('returns fit analysis with matchScore and keywords when LLM responds correctly', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeTextMessage(FIT_ANALYSIS_JSON))
      .mockResolvedValueOnce(makeTextMessage(KEYWORDS_JSON));

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.overallFit).toBe('Strong Fit');
    expect(json.roleType).toBe('technical');

    // matchScore should be deterministic: "react" + "typescript" matched, "node.js" missing → 2/3 = 67
    expect(typeof json.matchScore).toBe('number');
    expect(json.matchScore).toBe(67);

    // keywords should carry matched/missing breakdown
    expect(json.keywords).toBeDefined();
    expect(json.keywords.matched).toContain('react');
    expect(json.keywords.matched).toContain('typescript');
    expect(json.keywords.missing).toContain('node.js');
  });

  it('omits matchScore and keywords when keyword extraction returns empty list', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeTextMessage(FIT_ANALYSIS_JSON))
      .mockResolvedValueOnce(makeTextMessage(JSON.stringify({ keywords: [] })));

    const res = await POST(makeRequest(validBody) as any);
    const json = await res.json();

    expect(json.matchScore).toBeUndefined();
    expect(json.keywords).toBeUndefined();
  });

  it('omits matchScore and keywords when keyword extraction returns malformed JSON', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeTextMessage(FIT_ANALYSIS_JSON))
      .mockResolvedValueOnce(makeTextMessage('not valid json at all'));

    const res = await POST(makeRequest(validBody) as any);
    const json = await res.json();

    // Should not throw; should just skip score
    expect(res.status).toBe(200);
    expect(json.overallFit).toBe('Strong Fit');
    expect(json.matchScore).toBeUndefined();
  });

  it('runs both Haiku calls in parallel (both messages.create calls made)', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeTextMessage(FIT_ANALYSIS_JSON))
      .mockResolvedValueOnce(makeTextMessage(KEYWORDS_JSON));

    await POST(makeRequest(validBody) as any);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
  });
});
