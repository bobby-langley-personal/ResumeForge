/**
 * Auth setup — logs in via Clerk sign-in page and saves storage state.
 * Runs once before all authenticated test suites.
 *
 * Required env vars:
 *   E2E_TEST_EMAIL    — email of a dedicated test user
 *   E2E_TEST_PASSWORD — password for that user
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth/session.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set to run authenticated tests');
  }

  await page.goto('/sign-in');

  // Fill Clerk's hosted sign-in form
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait until we've landed on an authenticated page
  await expect(page).toHaveURL(/\/(tailor|dashboard|\?|$)/, { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
