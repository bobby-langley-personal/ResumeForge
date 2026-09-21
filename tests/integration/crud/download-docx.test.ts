/**
 * Integration tests for /api/download-docx/resume and /api/download-docx/cover-letter
 *
 * These tests mock Supabase and Clerk, but let the real DOCX generator run so we
 * catch any import or packing errors without going to disk.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockCurrentUser, mockFrom } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCurrentUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));
vi.mock('@/lib/log-api', () => ({ logApiCall: vi.fn() }));
vi.mock('@/lib/with-api-logging', () => ({
  withApiLogging: (_route: string, handler: Function) => handler,
}));

import { POST as resumePost } from '@/app/api/download-docx/resume/route';
import { POST as coverLetterPost } from '@/app/api/download-docx/cover-letter/route';
import { makeRequest } from '../../mocks/fixtures';

const RESUME_TEXT = `John Doe | New York | john@example.com

EXPERIENCE
Acme Corp | New York, NY
Software Engineer | Jan 2022 – Present
• Built scalable APIs using Node.js
• Led a team of 3 engineers

EDUCATION
MIT | B.S. Computer Science | 2021`;

const COVER_LETTER_TEXT = `Dear Hiring Manager,

I am excited to apply for the Software Engineer role at Acme Corp.

Sincerely,
John Doe`;

const mockApplication = {
  id: 'app_test_docx',
  user_id: 'user_test_123',
  company: 'Acme Corp',
  job_title: 'Software Engineer',
  resume_content: RESUME_TEXT,
  cover_letter_content: COVER_LETTER_TEXT,
};

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  return b;
}

describe('POST /api/download-docx/resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
    mockCurrentUser.mockResolvedValue({ fullName: 'John Doe', firstName: 'John' });
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: mockApplication, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { full_name: 'John Doe' }, error: null }));
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await (resumePost as any)(makeRequest({ applicationId: 'app_test_docx' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when applicationId is missing', async () => {
    const res = await (resumePost as any)(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 when application not found', async () => {
    mockFrom.mockReset();
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'Not found' } }));
    const res = await (resumePost as any)(makeRequest({ applicationId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('returns 403 when application belongs to different user', async () => {
    mockFrom.mockReset();
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { ...mockApplication, user_id: 'other_user' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { full_name: 'John Doe' }, error: null }));
    const res = await (resumePost as any)(makeRequest({ applicationId: 'app_test_docx' }));
    expect(res.status).toBe(403);
  });

  it('returns a DOCX binary with correct Content-Type', async () => {
    const res = await (resumePost as any)(makeRequest({ applicationId: 'app_test_docx' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('sets Content-Disposition with company and job title in filename', async () => {
    const res = await (resumePost as any)(makeRequest({ applicationId: 'app_test_docx' }));
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('Acme_Corp');
    expect(disposition).toContain('.docx');
  });

  it('returns non-empty binary body', async () => {
    const res = await (resumePost as any)(makeRequest({ applicationId: 'app_test_docx' }));
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(0);
  });
});

describe('POST /api/download-docx/cover-letter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockAuth.mockResolvedValue({ userId: 'user_test_123' });
    mockCurrentUser.mockResolvedValue({ fullName: 'John Doe', firstName: 'John' });
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: mockApplication, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { full_name: 'John Doe' }, error: null }));
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await (coverLetterPost as any)(makeRequest({ applicationId: 'app_test_docx' }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when no cover letter content exists', async () => {
    mockFrom.mockReset();
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { ...mockApplication, cover_letter_content: null }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { full_name: 'John Doe' }, error: null }));
    const res = await (coverLetterPost as any)(makeRequest({ applicationId: 'app_test_docx' }));
    expect(res.status).toBe(404);
  });

  it('returns a DOCX binary with correct Content-Type', async () => {
    const res = await (coverLetterPost as any)(makeRequest({ applicationId: 'app_test_docx' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('filename contains CoverLetter prefix', async () => {
    const res = await (coverLetterPost as any)(makeRequest({ applicationId: 'app_test_docx' }));
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('CoverLetter');
    expect(disposition).toContain('.docx');
  });
});
