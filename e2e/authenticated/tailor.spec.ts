/**
 * Tailor page — authenticated smoke tests.
 * Verifies the generation form loads and key elements are present.
 */
import { test, expect } from '@playwright/test';

test.describe('Tailor page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tailor');
  });

  test('loads the generation form', async ({ page }) => {
    await expect(page.getByPlaceholder(/job description/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /generate/i })).toBeVisible();
  });

  test('company and job title fields are present', async ({ page }) => {
    await expect(page.getByPlaceholder(/company/i)).toBeVisible();
    await expect(page.getByPlaceholder(/job title/i)).toBeVisible();
  });

  test('generate button is disabled when job description is empty', async ({ page }) => {
    const btn = page.getByRole('button', { name: /generate/i });
    await expect(btn).toBeDisabled();
  });
});
