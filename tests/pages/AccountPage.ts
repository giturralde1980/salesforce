import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AccountPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async clickNewContact() {
    await this.page.click('button[name="Global.NewContact"]');
    await this.page.waitForLoadState('domcontentloaded');
  }
}
