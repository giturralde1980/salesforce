import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CasePage extends BasePage {
  private readonly caseOriginBtn  = 'button[aria-label="Case Origin"]';
  private readonly subjectInput   = 'input[name="Subject"]';
private readonly saveBtn        = 'button[name="SaveEdit"]';

  constructor(page: Page) {
    super(page);
  }

  async selectCaseOrigin(value: string) {
    await this.page.click(this.caseOriginBtn);
    await this.page.locator(`li[data-value="${value}"], span[title="${value}"]`).first().click();
  }

  async fillSubject(subject: string) {
    await this.page.locator(this.subjectInput).fill(subject);
  }

  async fillDescription(description: string) {
    await this.page.getByRole('textbox', { name: 'Description' }).fill(description);
  }

  async save() {
    await this.page.click(this.saveBtn);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectSaved() {
    await expect(this.page.locator('lightning-formatted-text, .recordName, h1').first()).toBeVisible();
  }
}
