import { Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path = '') {
    await this.page.goto(`${process.env.SF_BASE_URL}${path}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async globalSearch(query: string) {
    await this.page.locator('input[type="search"][placeholder="Search..."]').fill(query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateTo(menuItem: string) {
    await this.page.click('button[title="Show Navigation Menu"]');
    await this.page.locator('span.menuLabel', { hasText: menuItem }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }
}
