import { test, expect, BrowserContext, Page } from '@playwright/test';
import HomePage from '../../../../pages/HomePage';
import LoginPage from '../../../../pages/LoginPage';
import MyCockpitPage from '../../../../pages/MyCockpitPage';
import 'dotenv/config';

// Owner left-nav items — data-name is Salesforce internal (language-agnostic)
const OWNER_NAV_ITEMS = [
  'myOrders',
  'myInvoices',
  'payments',
  'myContracts',
  'customerService',
  'profile',
  'myEconsentPreferences',
] as const;

// Single login/logout via beforeAll/afterAll — no per-test auth overhead
test.describe.serial('Left Navigation - Owner menu items', { tag: ['@smoke'] }, () => {
  let context: BrowserContext;
  let sharedPage: Page;
  let homePage: HomePage;
  let loginPage: LoginPage;
  let myCockpitPage: MyCockpitPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      viewport: { width: 1920, height: 1080 },
    });
    sharedPage = await context.newPage();

    homePage      = new HomePage(sharedPage);
    loginPage     = new LoginPage(sharedPage);
    myCockpitPage = new MyCockpitPage(sharedPage);

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
    await homePage.navigate();
    await homePage.clickMeinCockpit();
    await sharedPage.waitForSelector('.slds-nav-vertical__section', { timeout: 15000 });
    await sharedPage.waitForTimeout(1000);
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status === 'passed') {
      await testInfo.attach('screenshot', {
        body: await sharedPage.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    }
  });

  // ── One test per nav item — granular failure reporting ────────────────────

  for (const navKey of OWNER_NAV_ITEMS) {
    test(`left nav: "${navKey}" is visible and loads content`, async () => {
      // Confirm the item is visible in the nav using MyCockpitPage helper
      const navData = await myCockpitPage.getAllSectionItemsData();
      const item = navData.items.find(i => i.dataName === navKey);
      expect(item, `Nav item "[data-name="${navKey}"]" not found or not visible`).toBeDefined();

      // Click via native JS — reliable for LWC components
      await sharedPage.evaluate((key) => {
        const el = document.querySelector(`[data-name="${key}"]`) as HTMLElement | null;
        el?.click();
      }, navKey);

      await sharedPage.waitForLoadState('networkidle', { timeout: 20000 });

      // Verify meaningful content loaded in the main area
      const content = await sharedPage.locator('.slds-col, main, [role="main"]').first().textContent();
      expect(content?.trim().length ?? 0, `No content loaded after clicking "${navKey}"`).toBeGreaterThan(50);

      console.log(`✓ "${navKey}" section loaded`);
    });
  }
});
