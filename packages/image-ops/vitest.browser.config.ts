import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    name: 'worker-browser',
    include: ['src/**/*.worker.test.ts'],
    testTimeout: 30000,
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
  },
  server: {
    // Ensure Vite serves files correctly for worker imports
    fs: {
      strict: false,
    },
  },
});
