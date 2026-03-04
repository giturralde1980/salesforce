import { Page } from '@playwright/test';
import BasePage from './BasePage';

export default class ForgotPasswordPage extends BasePage {
  readonly emailInput: string;
  readonly resetPasswordButton: string;
  readonly cancelButton: string;
  readonly forgotPasswordTitle: string;

  constructor(page: Page) {
    super(page);
    this.emailInput = 'input[type="email"], input[placeholder*="mail"]';
    this.resetPasswordButton = 'button:has-text("Passwort zurücksetzen")';
    this.cancelButton = 'a:has-text("Abbrechen")';
    this.forgotPasswordTitle = 'text=Passwort zurücksetzen';
  }

  async isOnForgotPasswordPage(): Promise<boolean> {
    await this.page.waitForSelector(this.forgotPasswordTitle);
    return await this.page.isVisible(this.forgotPasswordTitle);
  }

  async fillEmail(email: string): Promise<void> {
    await this.page.fill(this.emailInput, email);
  }

  async clickResetPassword(): Promise<void> {
    await this.page.click(this.resetPasswordButton);
  }

  async clickCancel(): Promise<void> {
    await this.page.click(this.cancelButton);
  }

  async submitReset(email: string): Promise<void> {
    await this.fillEmail(email);
    await this.clickResetPassword();
  }

  async getSuccessMessage(): Promise<string | null> {
    const message = this.page.locator('text=/éxito|success|Überprüfen Sie bitte Ihren Posteingang|enviado|sent|correo|email/i').first();
    return await message.textContent();
  }
}
