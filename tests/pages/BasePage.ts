import { Page } from '@playwright/test';

export default class BasePage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string = ''): Promise<void> {
    await this.page.addLocatorHandler(
      this.page.locator('#onetrust-accept-btn-handler'),
      async (btn) => { await btn.click(); }
    );
    await this.page.goto(process.env.BASE_URL + path);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }
}
