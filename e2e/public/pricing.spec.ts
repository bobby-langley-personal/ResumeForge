/**
 * Pricing page — public, no auth required.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/pricing');
});

test('shows page heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /simple.*transparent pricing/i })).toBeVisible();
});

test('shows all three plan cards', async ({ page }) => {
  await expect(page.getByText('Monthly')).toBeVisible();
  await expect(page.getByText('Quarterly')).toBeVisible();
  await expect(page.getByText('Annual')).toBeVisible();
});

test('shows plan prices', async ({ page }) => {
  await expect(page.getByText('$9')).toBeVisible();
  await expect(page.getByText('$23')).toBeVisible();
  await expect(page.getByText('$79')).toBeVisible();
});

test('Annual plan has "Save 27%" badge', async ({ page }) => {
  await expect(page.getByText(/save 27%/i)).toBeVisible();
});

test('Quarterly plan has "Save 15%" badge', async ({ page }) => {
  await expect(page.getByText(/save 15%/i)).toBeVisible();
});

test('has CTA buttons that link to checkout', async ({ page }) => {
  const buttons = page.getByRole('button', { name: /get started|get pro|upgrade/i });
  await expect(buttons.first()).toBeVisible();
});
