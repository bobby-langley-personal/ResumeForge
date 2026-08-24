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

test('nav links are present in hamburger menu', async ({ page }) => {
  await page.getByRole('button', { name: /menu|hamburger/i }).click();
  await expect(page.getByRole('link', { name: /tailor new resume/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /ai resumes/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /my experience/i })).toBeVisible();
});

test('AI Resumes link navigates to dashboard', async ({ page }) => {
  await page.getByRole('button', { name: /menu|hamburger/i }).click();
  await page.getByRole('link', { name: /ai resumes/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /ai résumés/i })).toBeVisible();
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
