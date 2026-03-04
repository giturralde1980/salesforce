import { Page } from '@playwright/test';
import BasePage from './BasePage';

export default class SelfRegisterPage extends BasePage {
  readonly nextButton: string;

  constructor(page: Page) {
    super(page);
    this.nextButton = '.slds-button.slds-button_brand';
  }

  async navigate(): Promise<void> {
    await this.page.goto('https://sanofi-chcrm-eu--sit1.sandbox.my.site.com/DE/s/login/SelfRegister?language=de');
  }

  async clickNextButton(): Promise<void> {
    await this.page.click(this.nextButton);
  }
}
