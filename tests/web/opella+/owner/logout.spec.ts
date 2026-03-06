import { test, expect } from '@playwright/test';
import HomePage from '../../../pages/HomePage';
import LoginPage from '../../../pages/LoginPage';
import 'dotenv/config';

test.describe('Logout Tests', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(process.env.TEST_EMAIL_OWNER!, process.env.TEST_PASSWORD_OWNER!);
    await expect(homePage.page.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 20000 });
  });

  test('should log out and show the login button', async ({ page }) => {
    await homePage.logout();
    await expect(homePage.page.locator(homePage.einloggenButton2)).toBeVisible();
  });
});
