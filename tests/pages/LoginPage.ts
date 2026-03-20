import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  private readonly usernameInput = '#username';
  private readonly passwordInput = '#password';
  private readonly loginButton   = '#Login';
  private readonly errorMessage  = '#error';

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto(process.env.SF_BASE_URL!);
    await this.page.waitForLoadState('networkidle');
  }

  async login(username: string, password: string) {
    await this.page.locator(this.usernameInput).fill(username);
    await this.page.locator(this.passwordInput).fill(password);
    await this.page.locator(this.loginButton).click();
    await this.page.waitForURL(/\/lightning\//, { timeout: 30_000 });
    await this.page.waitForLoadState('networkidle');
  }

  async loginWithEnvCredentials() {
    await this.login(process.env.SF_WEB_USERNAME!, process.env.SF_WEB_PASSWORD!);
  }

  async logout() {
    await this.page.locator('a[href="/secur/logout.jsp"]').click();
    await this.page.waitForURL(/login\.salesforce\.com|\/login/, { timeout: 15_000 });
  }

  async expectLoginError() {
    await expect(this.page.locator(this.errorMessage)).toBeVisible();
  }
}
