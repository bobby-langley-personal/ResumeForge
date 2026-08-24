/**
 * Public page smoke tests — no auth required.
 */
import { test, expect } from '@playwright/test';

// ── No-500 checks ─────────────────────────────────────────────────────────────

test('pricing page returns 200', async ({ page }) => {
  const res = await page.goto('/pricing');
  expect(res?.status()).toBeLessThan(400);
});

test('sign-in page returns 200', async ({ page }) => {
  const res = await page.goto('/sign-in');
  expect(res?.status()).toBeLessThan(400);
});

// ── Auth redirects ─────────────────────────────────────────────────────────────

const protectedRoutes = [
  '/tailor',
  '/dashboard',
  '/resumes',
  '/interview',
  '/polished-resume',
];

for (const route of protectedRoutes) {
  test(`${route} redirects unauthenticated users`, async ({ page }) => {
    await page.goto(route);
    // Clerk redirects to /sign-in (same-domain) or accounts.clerk.com
    await expect(page).toHaveURL(/sign-in|accounts\.clerk\.com/, { timeout: 10_000 });
  });
}

// ── Sign-in page content ───────────────────────────────────────────────────────

test('sign-in page shows Easy Apply wordmark', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: /easy apply/i })).toBeVisible();
});

test('sign-in page has an input field', async ({ page }) => {
  await page.goto('/sign-in');
  // Clerk dev mode may show only social buttons; click "sign in with email" if needed
  const emailInput = page.locator('input[name="identifier"], input[type="email"], input[type="text"]');
  const inputVisible = await emailInput.first().isVisible().catch(() => false);
  if (!inputVisible) {
    // Clerk social-first mode renders an email link/button to reveal the identifier field
    const emailLink = page.getByRole('link', { name: /email/i }).or(page.getByRole('button', { name: /email/i }));
    if (await emailLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailLink.first().click();
    }
  }
  await expect(emailInput.first()).toBeVisible({ timeout: 10_000 });
});
