import { Page } from '@playwright/test';
import BasePage from './BasePage';

export default class LoginPage extends BasePage {
  readonly emailInput: string;
  readonly passwordInput: string;
  readonly submitButton: string;
  readonly forgotPasswordLink: string;

  constructor(page: Page) {
    super(page);
    this.emailInput = 'input[type="email"], input[placeholder*="mail"]';
    this.passwordInput = 'input[type="password"]';
    this.submitButton = 'button:has-text("Log In")';
    this.forgotPasswordLink = 'text=Passwort vergessen?';
  }

  async isOnLoginPage(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.emailInput, { timeout: 5000 });
      return await this.page.isVisible(this.emailInput);
    } catch (error) {
      return false;
    }
  }

  async fillEmail(email: string): Promise<void> {
    await this.page.fill(this.emailInput, email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.page.fill(this.passwordInput, password);
  }

  async clickForgotPassword(): Promise<void> {
    await this.page.click(this.forgotPasswordLink);
  }

  async clickSubmit(): Promise<void> {
    await this.page.click(this.submitButton);
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      this.clickSubmit()
    ]);
  }
}
