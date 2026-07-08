import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration
 *
 * 本配置支持：
 * - 本地开发: pnpm test:e2e
 * - CI: 自动使用 headless 模式
 * - 失败时自动保存 screenshot 和 trace
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // 避免状态冲突
  forbidOnly: !!process.env.CI, // CI 中禁止.only
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry', // 仅首次重试时保存 trace
    screenshot: 'only-on-failure', // 失败时截图
    video: 'on-first-retry', // 首次重试时录像
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120 * 1000,
      },
});
