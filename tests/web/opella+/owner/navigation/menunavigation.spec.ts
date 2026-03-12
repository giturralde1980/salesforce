import { test, expect, BrowserContext, Page } from '@playwright/test';
import HomePage from '../../../../pages/HomePage';
import LoginPage from '../../../../pages/LoginPage';
import 'dotenv/config';

interface NavItem {
  title: string;
  href: string;
  type: 'link' | 'button';
}

// Top menu bar items — titles are German locale-specific (DE environment)
// BESTELLUNG renders as a dropdown button — navigated via direct URL
const TOP_NAV_ITEMS: NavItem[] = [
  { title: 'Mein Cockpit.',          href: '/DE/s/my-cockpit',                             type: 'link'   },
  { title: 'BESTELLUNG.',            href: '/DE/s/category/bestellung/0ZG6N000000Cb09WAC', type: 'button' },
  { title: 'Sonderaktionen.',        href: '/DE/s/promotions',                              type: 'link'   },
  { title: 'Apothekenfachwissen.',   href: '/DE/s/knowledge-center',                        type: 'link'   },
  { title: 'Schulungen.',            href: '/DE/s/training',                                type: 'link'   },
  { title: 'Kontakt.',               href: '/DE/s/contact',                                 type: 'link'   },
];

// Single login/logout via beforeAll/afterAll — no per-test auth overhead
test.describe.serial('Top Menu Bar - Owner navigation', { tag: ['@smoke'] }, () => {
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
    await homePage.navigate();
    await sharedPage.waitForSelector('[data-menubar-item]', { timeout: 15000 });
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

  for (const item of TOP_NAV_ITEMS) {
    test(`top nav: "${item.title}" is visible and navigates to content`, async () => {
      // Verify the item is visible in the menu bar
      if (item.type === 'link') {
        await expect(
          sharedPage.locator(`a[data-menubar-item][title="${item.title}"]`)
        ).toBeVisible({ timeout: 5000 });

        await sharedPage.locator(`a[data-menubar-item][title="${item.title}"]`).click();
      } else {
        // BESTELLUNG is a dropdown button — verify visibility, navigate via URL
        await expect(
          sharedPage.locator(`button[data-menubar-item][title="${item.title}"]`)
        ).toBeVisible({ timeout: 5000 });

        await sharedPage.goto(process.env.BASE_URL! + item.href);
      }

      await sharedPage.waitForLoadState('networkidle', { timeout: 20000 });

      const content = await sharedPage.locator('main, [role="main"]').first().textContent();
      expect(
        content?.trim().length ?? 0,
        `Expected page "${item.title}" to have content`
      ).toBeGreaterThan(50);

      console.log(`✓ "${item.title}" navigated and loaded content`);
    });
  }
});
