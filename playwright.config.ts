import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration — Phase 2: ProductTemplate multi-flow
 *
 * Starts both dev-tool (port 3000) and API server (port 3001) before tests.
 * dev-tool proxies /api/* to the server.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'cd server && pnpm dev',
          url: 'http://localhost:3001/api/health',
          reuseExistingServer: true,
          timeout: 30_000,
        },
        {
          command: 'cd apps/dev-tool && pnpm dev',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 30_000,
          waitForSelector: 'body',
        },
      ],
});
