import { test, expect } from '@playwright/test';
import HomePage from '../../../pages/HomePage';
import LoginPage from '../../../pages/LoginPage';
import 'dotenv/config';

interface NavItem {
  title: string;
  href: string;
  type: 'link' | 'button';
}

const TOP_NAV_ITEMS: NavItem[] = [
  { title: 'Mein Cockpit.',          href: '/DE/s/my-cockpit',                                    type: 'link'   },
  { title: 'BESTELLUNG.',            href: '/DE/s/category/bestellung/0ZG6N000000Cb09WAC',         type: 'button' },
  { title: 'Sonderaktionen.',        href: '/DE/s/promotions',                                     type: 'link'   },
  { title: 'Apothekenfachwissen.',   href: '/DE/s/knowledge-center',                               type: 'link'   },
  { title: 'Schulungen.',            href: '/DE/s/training',                                       type: 'link'   },
  { title: 'Kontakt.',               href: '/DE/s/contact',                                        type: 'link'   },
];

test.describe('Navigation Tests - Top Menu Bar', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(process.env.TEST_EMAIL_OWNER!, process.env.TEST_PASSWORD_OWNER!);
    await page.waitForTimeout(2000);
    // Wait until the top nav bar is rendered after login
    await page.waitForSelector('[data-menubar-item]', { timeout: 15000 });
  });

  test.skip('All top navigation items are visible in the menu bar', async ({ page }) => {
    for (const item of TOP_NAV_ITEMS) {
      if (item.type === 'link') {
        const link = page.locator(`a[data-menubar-item][title="${item.title}"]`);
        await expect(link).toBeVisible({ timeout: 5000 });
      } else {
        // BESTELLUNG renders as a button with a dropdown trigger
        const button = page.locator(`button[data-menubar-item][title="${item.title}"]`);
        await expect(button).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test.skip('Each top nav item navigates to a page with content', async ({ page }) => {
    for (const item of TOP_NAV_ITEMS) {
      // Ensure nav bar is ready before each interaction
      await page.waitForSelector('[data-menubar-item]', { timeout: 10000 });

      if (item.type === 'link') {
        await page.locator(`a[data-menubar-item][title="${item.title}"]`).click();
      } else {
        // BESTELLUNG button opens a dropdown; navigate directly to its category href
        await page.goto(process.env.BASE_URL! + item.href);
      }

      await page.waitForLoadState('networkidle', { timeout: 20000 });

      const content = await page.locator('main, [role="main"]').first().textContent();
      const contentLength = content?.trim().length ?? 0;
      expect(
        contentLength,
        `Expected page "${item.title}" to have content, but got ${contentLength} chars`
      ).toBeGreaterThan(50);
    }
  });
});
