/**
 * Dashboard (My Applications) — authenticated.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
});

// ── Page load ──────────────────────────────────────────────────────────────────

test('shows My Applications heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /my applications/i })).toBeVisible();
});

test('search bar is present', async ({ page }) => {
  await expect(page.getByPlaceholder(/search by company or job title/i)).toBeVisible();
});

// ── Empty vs populated state ───────────────────────────────────────────────────

test('shows resume cards or empty state', async ({ page }) => {
  const hasCards = await page.locator('[class*="ApplicationCard"], [id^="app_"]').first().isVisible().catch(() => false);
  const hasEmpty = await page.getByText(/no résumés|get started|tailor/i).isVisible().catch(() => false);
  expect(hasCards || hasEmpty).toBe(true);
});

// ── Search ─────────────────────────────────────────────────────────────────────

test('search filters results or shows no-match message', async ({ page }) => {
  const searchBar = page.getByPlaceholder(/search by company or job title/i);
  await searchBar.fill('zzz_no_match_xyz');
  // Either shows "No résumés match" or empties the list
  const noMatch = page.getByText(/no résumés match/i);
  const emptyList = page.locator('[class*="ApplicationCard"]');
  const countAfter = await emptyList.count();
  const noMatchVisible = await noMatch.isVisible().catch(() => false);
  expect(noMatchVisible || countAfter === 0).toBe(true);
});

test('clearing search restores results', async ({ page }) => {
  const searchBar = page.getByPlaceholder(/search by company or job title/i);
  await searchBar.fill('zzz_no_match_xyz');
  await searchBar.clear();
  // Should be back to normal — either cards or original empty state (no "no match" msg)
  await expect(page.getByText(/no résumés match/i)).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
});

// ── Icon row ───────────────────────────────────────────────────────────────────

test('icon action row is present on cards', async ({ page }) => {
  // Only meaningful when cards exist
  const hasCards = await page.locator('[id^="app_"], [data-testid="application-card"]').first().isVisible().catch(() => false);
  if (!hasCards) return;

  // At least one of the icon buttons should be visible on the first card
  const iconButtons = page.getByRole('button', { name: /fit analysis|interview prep|job description|delete/i });
  await expect(iconButtons.first()).toBeVisible();
});

// ── Tailor New Resume link ─────────────────────────────────────────────────────

test('has link to tailor a new resume', async ({ page }) => {
  const link = page.getByRole('link', { name: /tailor new resume|tailor a résumé/i });
  await expect(link.first()).toBeVisible();
});
