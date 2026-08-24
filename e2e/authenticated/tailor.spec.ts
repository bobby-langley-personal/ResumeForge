/**
 * Tailor page — authenticated.
 */
import { test, expect } from '@playwright/test';

const SAMPLE_JD = `Software Engineer - Full Stack
Acme Corp | San Francisco, CA

We're looking for a full-stack engineer to join our team.
Requirements:
- 3+ years of experience with React and Node.js
- Experience with TypeScript and modern web development
- Strong problem-solving skills`;

test.beforeEach(async ({ page }) => {
  await page.goto('/tailor');
  await page.waitForLoadState('networkidle');
});

// ── Form presence ──────────────────────────────────────────────────────────────

test('shows page heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /tailor my résumé/i })).toBeVisible();
});

test('job description textarea is present', async ({ page }) => {
  await expect(page.locator('#jobDescription')).toBeVisible();
});

test('company and job title fields are present', async ({ page }) => {
  await expect(page.locator('#company')).toBeVisible();
  await expect(page.locator('#jobTitle')).toBeVisible();
});

test('generate button is present', async ({ page }) => {
  await expect(page.locator('#tour-generate')).toBeVisible();
});

test('URL import input is present', async ({ page }) => {
  await expect(page.getByPlaceholder(/paste a job posting url/i)).toBeVisible();
});

test('"Also generate a cover letter" checkbox is present', async ({ page }) => {
  await expect(page.getByText(/also generate a cover letter/i)).toBeVisible();
});

// ── Form behaviour ─────────────────────────────────────────────────────────────

test('generate button is disabled with empty job description', async ({ page }) => {
  const btn = page.locator('#tour-generate');
  await expect(btn).toBeDisabled();
});

test('generate button enables after pasting a job description', async ({ page }) => {
  await page.locator('#jobDescription').fill(SAMPLE_JD);
  const btn = page.locator('#tour-generate');
  await expect(btn).toBeEnabled({ timeout: 5_000 });
});

test('pasting job description triggers auto-parse (company/title fields fill)', async ({ page }) => {
  await page.locator('#jobDescription').fill(SAMPLE_JD);
  // Auto-parse calls /api/parse-job-details — wait for it to populate fields
  await expect(page.locator('#company')).not.toHaveValue('', { timeout: 10_000 });
  await expect(page.locator('#jobTitle')).not.toHaveValue('', { timeout: 10_000 });
});

test('company and job title can be manually edited', async ({ page }) => {
  await page.locator('#company').fill('Test Company');
  await page.locator('#jobTitle').fill('Senior Engineer');
  await expect(page.locator('#company')).toHaveValue('Test Company');
  await expect(page.locator('#jobTitle')).toHaveValue('Senior Engineer');
});

test('cover letter checkbox can be toggled', async ({ page }) => {
  const checkbox = page.getByLabel(/also generate a cover letter/i);
  const initial = await checkbox.isChecked();
  await checkbox.click();
  await expect(checkbox).toBeChecked({ checked: !initial });
});

// ── Billing counter ────────────────────────────────────────────────────────────

test('billing counter is visible for free users OR upgrade link present', async ({ page }) => {
  // Either shows "X/5 free this week" OR the user is Pro (no counter shown)
  const hasBillingCounter = await page.getByText(/free this week/i).isVisible().catch(() => false);
  const isPro = await page.getByText(/pro/i).isVisible().catch(() => false);
  expect(hasBillingCounter || isPro).toBe(true);
});

// ── My Experience panel ────────────────────────────────────────────────────────

test('My Experience panel is present', async ({ page }) => {
  await expect(page.locator('#tour-background')).toBeVisible();
});
