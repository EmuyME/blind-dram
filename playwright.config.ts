import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定ファイル
 * Blind Dram E2Eテスト用
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // デフォルト並列が高いと dev サーバー上で apiRequestContext が ECONNRESET になりやすい
  workers: process.env.CI ? 1 : 3,
  reporter: 'html',
  timeout: 60000, // 60秒に延長
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000,
  },
});
