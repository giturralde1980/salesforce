import { test, expect } from '@playwright/test';
import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/LoginPage';
import ForgotPasswordPage from '../../pages/ForgotPasswordPage';
import 'dotenv/config';

test.describe('Login Tests', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    await homePage.navigate();
  });

  test('User can log in successfully', async ({ page }) => {
    expect(await homePage.isOnHomePage()).toBeTruthy();
    await homePage.clickEinloggen();
    expect(await loginPage.isOnLoginPage()).toBeTruthy();
    await loginPage.login(
      process.env.TEST_EMAIL_OWNER!,
      process.env.TEST_PASSWORD_OWNER!
    );
    await page.waitForURL('**/s/**');
    await loginPage.takeScreenshot('after-login');
  });

  test.afterEach(async ({ page }) => {
    await homePage.logout();
  });
});
