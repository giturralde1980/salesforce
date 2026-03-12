import { test, expect, BrowserContext, Page } from '@playwright/test';
import HomePage from '../../../pages/HomePage';
import LoginPage from '../../../pages/LoginPage';
import 'dotenv/config';

// Single login/logout via beforeAll/afterAll — no per-test auth overhead
test.describe.serial('Favourites page', { tag: ['@smoke'] }, () => {
  let context: BrowserContext;
  let sharedPage: Page;
  let homePage: HomePage;
  let loginPage: LoginPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      viewport: { width: 1920, height: 1080 },
    });
    sharedPage = await context.newPage();

    homePage  = new HomePage(sharedPage);
    loginPage = new LoginPage(sharedPage);

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
    await sharedPage.goto(process.env.BASE_URL! + '/DE/s/mylists');
    await sharedPage.waitForLoadState('networkidle', { timeout: 30000 });
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status === 'passed') {
      await testInfo.attach('screenshot', {
        body: await sharedPage.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    }
  });

  // ── One test per concern — granular failure reporting ─────────────────────

  test('should navigate to the favourites page', async () => {
    expect(sharedPage.url()).toContain('/mylists');
    console.log(`✓ Favourites URL: ${sharedPage.url()}`);
  });

  test('should display "Meine Wunschlisten" page title', async () => {
    const heading = sharedPage.locator('h1.slds-text-heading_large');
    await expect(heading).toBeVisible({ timeout: 20000 });
    const title = await heading.textContent();
    expect(title?.trim()).toContain('Meine Wunschlisten');
    console.log(`✓ Title: ${title?.trim()}`);
  });

  test('should display main page content', async () => {
    const content = await sharedPage.locator('main, [role="main"]').first().textContent();
    expect(content?.trim().length ?? 0, 'Favourites page must have content').toBeGreaterThan(50);
    console.log(`✓ Page content loaded (${content?.trim().length} chars)`);
  });
});
