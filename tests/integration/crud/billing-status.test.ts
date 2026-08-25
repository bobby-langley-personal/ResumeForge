import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));
vi.mock('@/lib/log-api', () => ({ logApiCall: vi.fn() }));

import { GET } from '@/app/api/billing/status/route';
import { NextRequest } from 'next/server';
import { freeUser, proUser } from '../../mocks/fixtures';

const makeGetRequest = () => new NextRequest('http://localhost/api/billing/status', { method: 'GET' });

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  // count query uses different shape
  b.count = undefined;
  b.head = undefined;
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

function makeCountBuilder(count: number) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve({ count, error: null }).then(resolve));
  return b;
}

describe('GET /api/billing/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns all gating counts for a free user', async () => {
    const userData = { ...freeUser, chat_unlocked_count: 2, interview_prep_count: 1, experience_interview_count: 0 };
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: userData, error: null }))
      .mockReturnValue(makeCountBuilder(3));

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subscription_status).toBe('free');
    expect(json.chat_unlocked_count).toBe(2);
    expect(json.interview_prep_count).toBe(1);
    expect(json.experience_interview_count).toBe(0);
    expect(json.document_count).toBe(3);
  });

  it('returns effective weekly_resume_count = 0 when window expired', async () => {
    const expiredWindowStart = new Date(Date.now() - SEVEN_DAYS_MS - 1000).toISOString();
    const userData = { ...freeUser, weekly_resume_count: 4, weekly_window_start: expiredWindowStart };
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: userData, error: null }))
      .mockReturnValue(makeCountBuilder(0));

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.weekly_resume_count).toBe(0);
    expect(json.weekly_window_ends_at).toBeNull();
  });

  it('returns actual weekly_resume_count when window is active', async () => {
    const activeWindowStart = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const userData = { ...freeUser, weekly_resume_count: 3, weekly_window_start: activeWindowStart };
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: userData, error: null }))
      .mockReturnValue(makeCountBuilder(0));

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.weekly_resume_count).toBe(3);
    expect(json.weekly_window_ends_at).not.toBeNull();
  });

  it('returns weekly_window_ends_at when window is active', async () => {
    const activeWindowStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const userData = { ...freeUser, weekly_resume_count: 1, weekly_window_start: activeWindowStart };
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: userData, error: null }))
      .mockReturnValue(makeCountBuilder(0));

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.weekly_window_ends_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date string
  });

  it('returns defaults when user row not found', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValue(makeCountBuilder(0));

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.subscription_status).toBe('free');
    expect(json.tailored_resume_count).toBe(0);
    expect(json.chat_unlocked_count).toBe(0);
  });

  it('returns pro subscription_status for pro users', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: proUser, error: null }))
      .mockReturnValue(makeCountBuilder(10));

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.subscription_status).toBe('pro');
  });
});
