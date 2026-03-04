import { test, expect } from '@playwright/test';
import 'dotenv/config';

const SF_HOME_URL = 'https://sanofi-chcrm-eu--uat1.sandbox.lightning.force.com/lightning/page/home';

test.describe('Salesforce direct access', () => {

  test('Navigate to Salesforce and login', async ({ page }) => {
    await page.goto(SF_HOME_URL);

    // SF redirects unauthenticated users to its login page
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login') || page.url().includes('salesforce.com/s/login')) {
      // Fill in Salesforce credentials
      await page.fill('#username', process.env.SF_WEB_USERNAME!);
      await page.fill('#password', process.env.SF_WEB_PASSWORD!);
      await page.click('#Login');

      await page.waitForLoadState('networkidle', { timeout: 30000 });
    }

    // Verify we are on the Lightning home page
    expect(page.url()).toContain('/lightning/page/home');
    console.log(`Salesforce home page reached: ${page.url()} ✓`);
  });

});
