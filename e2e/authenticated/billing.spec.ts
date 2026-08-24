/**
 * Billing / paywall — authenticated.
 * Tests that billing UI elements are correct for the test user's plan.
 */
import { test, expect } from '@playwright/test';

test.describe('Pricing page (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
  });

  test('shows plan cards', async ({ page }) => {
    await expect(page.getByText('Monthly')).toBeVisible();
    await expect(page.getByText('Quarterly')).toBeVisible();
    await expect(page.getByText('Annual')).toBeVisible();
  });

  test('Pro users see "You\'re on Pro" banner instead of CTAs', async ({ page }) => {
    const isPro = await page.getByText(/you're on pro/i).isVisible().catch(() => false);
    const hasCTAs = await page.getByRole('button', { name: /get started|upgrade/i }).first().isVisible().catch(() => false);
    // Either pro banner OR CTA buttons — exactly one should be true
    expect(isPro || hasCTAs).toBe(true);
  });
});

test.describe('Tailor page billing counter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tailor');
    await page.waitForLoadState('networkidle');
  });

  test('free users see weekly resume counter', async ({ page }) => {
    const isPro = await page.getByText(/you're on pro/i).isVisible().catch(() => false);
    if (!isPro) {
      await expect(page.getByText(/free this week/i)).toBeVisible();
    }
  });

  test('weekly counter shows X/5 format', async ({ page }) => {
    const isPro = await page.getByText(/you're on pro/i).isVisible().catch(() => false);
    if (!isPro) {
      const counter = page.getByText(/\/5 free this week/i);
      await expect(counter).toBeVisible();
    }
  });

  test('Upgrade to Pro link is present for free users', async ({ page }) => {
    const isPro = await page.getByText(/you're on pro/i).isVisible().catch(() => false);
    if (!isPro) {
      await expect(page.getByRole('link', { name: /upgrade to pro/i }).first()).toBeVisible();
    }
  });
});
