/**
 * Auth setup — logs in via Clerk's embedded SignIn component and saves storage state.
 * Runs once before all authenticated test suites.
 *
 * Required env vars:
 *   E2E_TEST_EMAIL    — email of a dedicated test user
 *   E2E_TEST_PASSWORD — password for that user
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '.auth/session.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set to run authenticated tests');
  }

  await page.goto('/sign-in');

  // Clerk's embedded <SignIn /> renders standard inputs
  // Step 1: email / identifier (selector varies by Clerk version)
  // In social-first / dev mode, the identifier field is hidden behind an "email" link
  const emailInput = page.locator('input[name="identifier"], input[type="email"], input[type="text"]').first();
  const inputVisible = await emailInput.isVisible().catch(() => false);
  if (!inputVisible) {
    const emailLink = page.getByRole('link', { name: /email/i }).or(page.getByRole('button', { name: /email/i }));
    if (await emailLink.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emailLink.first().click();
    }
  }
  await emailInput.waitFor({ timeout: 10_000 });
  await emailInput.fill(email);
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 2: password
  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.waitFor({ timeout: 10_000 });
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /continue/i }).click();

  // Wait for redirect to authenticated page
  await expect(page).toHaveURL(/\/(tailor|dashboard|resumes|interview|\?.*|)$/, { timeout: 20_000 });

  await page.context().storageState({ path: AUTH_FILE });
  console.log('[auth.setup] session saved to', AUTH_FILE);
});
