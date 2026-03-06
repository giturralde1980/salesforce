import { test, expect } from '@playwright/test';
import HomePage from '../../../pages/HomePage';
import 'dotenv/config';

test.describe('Self Register Tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate();
  });

  test.skip('Navigate to self register page and click next button', async ({ page }) => {
    // Click the self register button, which opens in a new window
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      homePage.clickSelfRegister()
    ]);

    // Verify the URL of the new page
    await expect(newPage).toHaveURL('https://sanofi-chcrm-eu--sit1.sandbox.my.site.com/DE/s/login/SelfRegister?language=de');

    // Click the next button on the self register page
    await newPage.click('.slds-button.slds-button_brand');
  });
});
