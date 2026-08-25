import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));
vi.mock('@/lib/log-api', () => ({ logApiCall: vi.fn() }));

import { GET, PUT } from '@/app/api/profile/route';
import { NextRequest } from 'next/server';
import { makeRequest, freeUser } from '../../mocks/fixtures';

const makeGetRequest = () => new NextRequest('http://localhost/api/profile', { method: 'GET' });

const PROFILE = { full_name: 'John Doe', email: 'john@example.com', location: 'New York, NY', linkedin_url: 'https://linkedin.com/in/johndoe' };

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.upsert = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

describe('GET /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns profile when it exists', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: PROFILE, error: null }));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.full_name).toBe('John Doe');
    expect(json.email).toBe('john@example.com');
  });

  it('returns empty defaults when no profile exists', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.full_name).toBe('');
    expect(json.email).toBe('');
    expect(json.location).toBe('');
    expect(json.linkedin_url).toBe('');
  });
});

describe('PUT /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: freeUser.id });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await PUT(makeRequest(PROFILE) as any);
    expect(res.status).toBe(401);
  });

  it('upserts and returns updated profile', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: PROFILE, error: null }));
    const res = await PUT(makeRequest(PROFILE) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.full_name).toBe('John Doe');
  });

  it('uses empty strings for missing fields', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { full_name: 'Jane', email: '', location: '', linkedin_url: '' }, error: null }));
    const res = await PUT(makeRequest({ full_name: 'Jane' }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.full_name).toBe('Jane');
  });

  it('returns 500 on Supabase error', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'DB error' } }));
    const res = await PUT(makeRequest(PROFILE) as any);
    expect(res.status).toBe(500);
  });
});
