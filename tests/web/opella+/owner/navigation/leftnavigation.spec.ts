import { test, expect } from '@playwright/test';
import HomePage from '../../../../pages/HomePage';
import LoginPage from '../../../../pages/LoginPage';
import MyCockpitPage from '../../../../pages/MyCockpitPage';
import MENU_ITEMS from '../../../../fixtures/menuItems';
import 'dotenv/config';

test.describe('Navigation Tests - Menu Items', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let myCockpitPage: MyCockpitPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    myCockpitPage = new MyCockpitPage(page);
    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(process.env.TEST_EMAIL_OWNER!, process.env.TEST_PASSWORD_OWNER!);
    await page.waitForTimeout(2000);
    await homePage.clickMeinCockpit();
    await page.waitForSelector('.slds-nav-vertical__section', { timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  test('Verify all owner menu items exist and clicking shows content', async ({ page }) => {
    const menuItems = MENU_ITEMS.owner;
    for (const itemName of menuItems) {
      const count = await page.locator(`[data-name="${itemName}"]`).count();
      expect(count).toBeGreaterThan(0);
      const initialMainContent = await page.locator('main, [role="main"], .slds-col').first().textContent();
      const initialLength = initialMainContent ? initialMainContent.trim().length : 0;
      const selector = `[data-name="${itemName}"]`;
      const elements = await page.locator(selector).all();
      let clicked = false;
      for (const el of elements) {
        try {
          await el.click({ force: true, timeout: 5000 });
          clicked = true;
          break;
        } catch (e) {
        }
      }
      expect(clicked).toBe(true);
      await page.waitForTimeout(1500);
      const newMainContent = await page.locator('main, [role="main"], .slds-col').first().textContent();
      const newLength = newMainContent ? newMainContent.trim().length : 0;
      const hasContent = newLength > 50;
      expect(hasContent).toBe(true);
    }
  });
});
