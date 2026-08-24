/**
 * Experience Interview page — authenticated.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/interview');
  await page.waitForLoadState('networkidle');
  // Interview page does async preloading — wait for it to settle
  await page.waitForTimeout(1500);
});

test('page loads without error', async ({ page }) => {
  // Should not show a 500 or blank page
  const body = await page.locator('body').textContent();
  expect(body?.length).toBeGreaterThan(50);
});

test('shows locked screen or onboarding content', async ({ page }) => {
  // Free users who hit limit see locked screen; others see intro/onboarding
  const isLocked = await page.getByText(/interview role limit reached/i).isVisible().catch(() => false);
  const isIntro = await page.getByText(/add experience|let.*interview|tell us about/i).isVisible().catch(() => false);
  const isLoading = await page.getByText(/loading|preparing/i).isVisible().catch(() => false);
  expect(isLocked || isIntro || isLoading).toBe(true);
});

test('locked screen has upgrade link if limit reached', async ({ page }) => {
  const isLocked = await page.getByText(/interview role limit reached/i).isVisible().catch(() => false);
  if (isLocked) {
    await expect(page.getByRole('link', { name: /upgrade|pricing/i })).toBeVisible();
  } else {
    test.skip(); // not locked, test not applicable
  }
});
