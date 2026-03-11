import { test, expect, BrowserContext, Page } from '@playwright/test';
import HomePage from '../../../../pages/HomePage';
import LoginPage from '../../../../pages/LoginPage';
import MyProfilePage from '../../../../pages/MyProfilePage';
import 'dotenv/config';

// Profile section is only visible to users with Owner role.
// Single login/logout via beforeAll/afterAll — no per-test auth overhead.
test.describe.serial('My Profile', () => {
  let context: BrowserContext;
  let sharedPage: Page;
  let homePage: HomePage;
  let loginPage: LoginPage;
  let myProfilePage: MyProfilePage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      viewport: { width: 1920, height: 1080 },
    });
    sharedPage = await context.newPage();

    homePage      = new HomePage(sharedPage);
    loginPage     = new LoginPage(sharedPage);
    myProfilePage = new MyProfilePage(sharedPage);

    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(process.env.TEST_EMAIL_OWNER!, process.env.TEST_PASSWORD_OWNER!);
    await expect(sharedPage.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 35000 });
  });

  test.afterAll(async () => {
    await homePage.navigate();
    await homePage.logout();
    await context.close();
  });

  test.beforeEach(async () => {
    await homePage.clickMeinCockpit();
    await myProfilePage.navigateToProfile();
  });

  test.afterEach(async () => {
    await homePage.navigate();
  });

  // ── Tests ─────────────────────────────────────────────────────────────────

  test('should display the profile section', async () => {
    const isVisible = await myProfilePage.isProfileSectionVisible();
    expect(isVisible).toBe(true);
  });

  test('should display the email update form', async () => {
    const isVisible = await myProfilePage.isEmailFormVisible();
    expect(isVisible).toBe(true);
  });

  test('should display the phone update form', async () => {
    const isVisible = await myProfilePage.isPhoneFormVisible();
    expect(isVisible).toBe(true);
  });

  test('should display the mobile phone update form', async () => {
    const isVisible = await myProfilePage.isMobileFormVisible();
    expect(isVisible).toBe(true);
  });

  test('should display read-only user name', async () => {
    const name = await myProfilePage.getDisplayedName();
    expect(name.length).toBeGreaterThan(0);
    console.log(`✓ Displayed name: ${name}`);
  });

  test('should display read-only user email', async () => {
    const email = await myProfilePage.getDisplayedEmail();
    expect(email.length).toBeGreaterThan(0);
    expect(email).toContain('@');
    console.log(`✓ Displayed email: ${email}`);
  });
});
