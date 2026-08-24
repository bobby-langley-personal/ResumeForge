/**
 * Public page smoke tests — no auth required.
 * Verifies pages load without errors and have expected content.
 */
import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('pricing page loads with plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/pricing|easy apply/i);
    // Three plan cards
    await expect(page.getByText(/monthly/i)).toBeVisible();
    await expect(page.getByText(/quarterly/i)).toBeVisible();
    await expect(page.getByText(/annual/i)).toBeVisible();
  });

  test('no 500 errors on public routes', async ({ page }) => {
    const routes = ['/pricing'];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} returned non-2xx`).toBeLessThan(400);
    }
  });
});

test.describe('Auth redirects', () => {
  const protectedRoutes = ['/tailor', '/dashboard', '/resumes', '/interview'];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users to sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/sign-in|accounts\.clerk\.com/, { timeout: 10_000 });
    });
  }
});
