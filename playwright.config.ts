import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests/web/opella+',
  timeout: 90000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,  // 1 retry es suficiente, no 2
  workers: process.env.CI ? 4 : 1,  // 4 en paralelo en CI
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  use: {
    baseURL: process.env.BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },

  projects: [
    {
      name: 'Microsoft Edge',
      use: {
        channel: 'msedge',
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: ['--start-maximized'],
        },
      },
    },
  ],
});
