import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));
vi.mock('@/lib/log-api', () => ({ logApiCall: vi.fn() }));

import { GET, POST } from '@/app/api/resumes/route';
import { NextRequest } from 'next/server';
import { makeRequest, freeUser } from '../../mocks/fixtures';

const makeGetRequest = () => new NextRequest('http://localhost/api/resumes', { method: 'GET' });

const RESUMES = [
  { id: 'r1', user_id: freeUser.id, title: 'My Resume', content: { text: 'Experience...' }, item_type: 'resume', is_default: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'r2', user_id: freeUser.id, title: 'Cover Letter', content: { text: 'Dear...' }, item_type: 'cover_letter', is_default: false, created_at: '2026-01-02', updated_at: '2026-01-02' },
];

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.order = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

describe('GET /api/resumes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns list of resumes', async () => {
    const builder = makeBuilder({ data: RESUMES, error: null });
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    expect(json[0].id).toBe('r1');
  });

  it('returns empty array when user has no resumes', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('normalizes content stored as a JSON string', async () => {
    const withStringContent = [{ ...RESUMES[0], content: JSON.stringify({ text: 'Parsed' }) }];
    const builder = makeBuilder({ data: withStringContent, error: null });
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json[0].content).toEqual({ text: 'Parsed' });
  });
});

describe('POST /api/resumes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest({ title: 'Test', content: { text: 'Hi' } }) as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when title is missing', async () => {
    const res = await POST(makeRequest({ content: { text: 'Hi' } }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when content.text is missing', async () => {
    const res = await POST(makeRequest({ title: 'Test', content: {} }) as any);
    expect(res.status).toBe(400);
  });

  it('creates resume and returns 201', async () => {
    const newResume = { ...RESUMES[0], id: 'r_new' };
    const builder = makeBuilder({ data: newResume, error: null });
    mockFrom.mockReturnValue(builder);

    const res = await POST(makeRequest({ title: 'My Resume', content: { text: 'Work history...' } }) as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('r_new');
  });

  it('clears existing default before setting new default', async () => {
    const clearBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: { ...RESUMES[0], id: 'r_new', is_default: true }, error: null });
    mockFrom
      .mockReturnValueOnce(clearBuilder)  // for the update(.eq.eq) to clear existing default
      .mockReturnValue(insertBuilder);

    const res = await POST(makeRequest({ title: 'New Default', content: { text: 'text' }, is_default: true }) as any);
    expect(res.status).toBe(201);
    // Verify mockFrom was called twice (once to clear, once to insert)
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('does not clear default when is_default is false', async () => {
    const builder = makeBuilder({ data: RESUMES[1], error: null });
    mockFrom.mockReturnValue(builder);

    await POST(makeRequest({ title: 'Non-default', content: { text: 'text' }, is_default: false }) as any);
    // Only one call to mockFrom (just the insert)
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
