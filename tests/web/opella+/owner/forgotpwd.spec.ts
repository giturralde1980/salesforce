import { test, expect } from '@playwright/test';
import HomePage from '../../../pages/HomePage';
import LoginPage from '../../../pages/LoginPage';
import ForgotPasswordPage from '../../../pages/ForgotPasswordPage';
import 'dotenv/config';

test.describe('Forgot Password Tests', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let forgotPasswordPage: ForgotPasswordPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    forgotPasswordPage = new ForgotPasswordPage(page);
    await homePage.navigate();
  });

  test('User can request a password reset', async ({ page }) => {
    expect(await homePage.isOnHomePage()).toBeTruthy();
    await homePage.clickEinloggen();
    expect(await loginPage.isOnLoginPage()).toBeTruthy();
    await loginPage.clickForgotPassword();
    expect(await forgotPasswordPage.isOnForgotPasswordPage()).toBeTruthy();
    await forgotPasswordPage.fillEmail('xx@xx.net');
    await forgotPasswordPage.clickResetPassword();
    await page.waitForTimeout(2000);
    const successMessage = await forgotPasswordPage.getSuccessMessage();
    expect(successMessage).toBeTruthy();
  });

  test('User can cancel the password reset and return to login', async ({ page }) => {
    expect(await homePage.isOnHomePage()).toBeTruthy();
    await homePage.clickEinloggen();
    expect(await loginPage.isOnLoginPage()).toBeTruthy();
    await loginPage.clickForgotPassword();
    expect(await forgotPasswordPage.isOnForgotPasswordPage()).toBeTruthy();
    await Promise.all([
      page.waitForNavigation(),
      forgotPasswordPage.clickCancel()
    ]);
    await page.waitForTimeout(1000);
    expect(await loginPage.isOnLoginPage()).toBeTruthy();
  });
});
