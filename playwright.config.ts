import { defineConfig, devices } from '@playwright/test';

/**
 * E2E test config.
 *
 * Local usage:
 *   npm run test:e2e           — headless Chromium
 *   npm run test:e2e:ui        — interactive UI mode
 *   npm run test:e2e:headed    — headed browser (good for debugging)
 *
 * Auth:
 *   The 'auth' setup project logs in once and saves storage state to
 *   e2e/.auth/session.json. All authenticated tests reuse that state.
 *   Requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars.
 *
 * CI:
 *   Set BASE_URL to the preview/production URL. Skip auth setup if
 *   E2E_TEST_EMAIL is not set (only unauthenticated tests will run).
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Auth setup — logs in once, saves storage state
    {
      name: 'auth',
      testMatch: '**/auth.setup.ts',
    },

    // Unauthenticated tests — no login required
    {
      name: 'public',
      testMatch: '**/public/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Authenticated tests — depend on auth setup
    {
      name: 'authenticated',
      testMatch: '**/authenticated/**/*.spec.ts',
      dependencies: ['auth'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/session.json',
      },
    },
  ],

  // Start Next.js dev server automatically when running locally
  // (skipped in CI — point BASE_URL at a deployed preview instead)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
