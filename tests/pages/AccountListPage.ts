import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AccountListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async clickAccountByName(name: string) {
    await this.page.locator(`th[data-label="Account Name"] a[title="${name}"]`).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickFirstAccount() {
    await this.page.locator('th[data-label="Account Name"] a.slds-truncate').first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectAccountListVisible() {
    await expect(this.page.locator('table.slds-table')).toBeVisible();
  }
}
