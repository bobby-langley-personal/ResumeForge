/**
 * Navigation — authenticated.
 * Verifies the hamburger menu and all nav links work.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tailor');
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
});

test('hamburger menu opens', async ({ page }) => {
  await page.getByRole('button', { name: /menu|hamburger/i }).click();
  await expect(page.getByRole('link', { name: /tailor new resume/i })).toBeVisible();
});

test('nav links are present', async ({ page }) => {
  // On desktop the links are persistent; on mobile they're in the hamburger
  const hasDesktopNav = await page.getByRole('link', { name: /my applications/i }).isVisible();
  if (!hasDesktopNav) {
    await page.getByRole('button', { name: /menu|hamburger/i }).click();
  }
  await expect(page.getByRole('link', { name: /tailor new r[eé]sum[eé]/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /my applications/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /my experience/i }).first()).toBeVisible();
});

test('My Applications link navigates to dashboard', async ({ page }) => {
  const hasDesktopNav = await page.getByRole('link', { name: /my applications/i }).isVisible();
  if (!hasDesktopNav) {
    await page.getByRole('button', { name: /menu|hamburger/i }).click();
  }
  await page.getByRole('link', { name: /my applications/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /my applications/i })).toBeVisible();
});

test('My Experience link navigates to resumes page', async ({ page }) => {
  await page.getByRole('button', { name: /menu|hamburger/i }).click();
  await page.getByRole('link', { name: /my experience/i }).click();
  await expect(page).toHaveURL(/\/resumes/);
  await expect(page.getByRole('heading', { name: /my experience/i })).toBeVisible();
});

test('logo navigates to home', async ({ page }) => {
  await page.getByRole('link', { name: /easy apply/i }).first().click();
  await expect(page).toHaveURL(/^\//);
});
