/**
 * Dashboard (AI Resumes) — authenticated smoke tests.
 */
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('loads the AI Resumes page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ai resumes/i })).toBeVisible();
  });

  test('search bar is present', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });
});
