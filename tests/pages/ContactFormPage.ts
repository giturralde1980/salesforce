import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ContactFormPage extends BasePage {
  private readonly firstNameInput  = 'input.firstName';
  private readonly lastNameInput   = 'input.lastName';
  private readonly emailInput      = 'input[inputmode="email"]';
  private readonly phoneInput      = 'input[type="tel"]';
  private readonly titleInput      = 'div[data-target-selection-name="sfdc:RecordField.Contact.Title"] input';
  private readonly saveBtn         = 'button.cuf-publisherShareButton';
  private readonly saveAndNewBtn   = '.quick-actions-panel button[title="Save & New"]';
  private readonly cancelBtn       = 'button.cuf-publisherCancelButton';

  constructor(page: Page) {
    super(page);
  }

  async fillFirstName(value: string) {
    await this.page.locator(this.firstNameInput).fill(value);
  }

  async fillLastName(value: string) {
    await this.page.locator(this.lastNameInput).fill(value);
  }

  async fillEmail(value: string) {
    await this.page.locator(this.emailInput).fill(value);
  }

  async fillPhone(value: string) {
    await this.page.locator(this.phoneInput).fill(value);
  }

  async fillTitle(value: string) {
    await this.page.locator(this.titleInput).fill(value);
  }

  async save() {
    await this.page.locator(this.saveBtn).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async saveAndNew() {
    await this.page.locator(this.saveAndNewBtn).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async cancel() {
    await this.page.locator(this.cancelBtn).click();
  }

  async expectFormVisible() {
    await expect(this.page.locator('div.quick-actions-panel')).toBeVisible();
  }
}
