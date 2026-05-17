import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ServiceConsolePage extends BasePage {
  private readonly appLauncherBtn  = 'button[title="App Launcher"]';
  private readonly serviceConsole  = 'p.slds-truncate';
  private readonly newBtn = 'a.forceActionLink[title="New"]';

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.page.goto('/lightning/page/home');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.click(this.appLauncherBtn);
    await this.page.locator(this.serviceConsole, { hasText: 'Service Console' }).click();
    await this.page.waitForURL(/lightning/, { timeout: 15_000 });
    await this.page.locator('button[title="Show Navigation Menu"]').waitFor({ timeout: 15_000 });
  }

  async clickNew() {
    await this.page.click(this.newBtn);
    await this.page.waitForLoadState('domcontentloaded');
  }
}
