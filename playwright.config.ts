import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests/web',
  timeout: 90000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
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
        viewport: null,
        launchOptions: {
          args: ['--start-maximized'],
        },
      },
    },
  ],
});
