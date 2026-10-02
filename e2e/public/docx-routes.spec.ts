/**
 * Public (unauthenticated) checks for DOCX download routes.
 * All three routes must return 401 when no session is present.
 */
import { test, expect } from '@playwright/test';

const DOCX_ROUTES = [
  '/api/download-docx/resume',
  '/api/download-docx/cover-letter',
  '/api/download-docx/polished',
];

for (const route of DOCX_ROUTES) {
  test(`POST ${route} returns 401 when unauthenticated`, async ({ request }) => {
    const res = await request.post(route, {
      data: { applicationId: 'test_app', resumeText: 'test' },
    });
    expect(res.status()).toBe(401);
  });
}
