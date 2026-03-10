import { Page } from '@playwright/test';
import BasePage from './BasePage';

export default class MyCasesPage extends BasePage {
  // Salesforce internal nav key (language-agnostic, used in hidden sidebar)
  readonly casesNavKey: string;
  // Visible nav label — locale-specific, passed via constructor for multi-country
  readonly casesNavLabel: string;

  // "Anfrage erstellen." — language-agnostic via SVG data-key
  readonly createCaseBtn: string;

  // The LWC modal is NOT a native <dialog> — it's .slds-modal__container
  readonly caseCreationModal: string;

  // Form fields — Salesforce internal names are language-agnostic
  // Type combobox: button[name="Type"] with role="combobox"
  readonly modalTypCombobox: string;
  // Options in the Type dropdown — targeted by data-value (Salesforce internal)
  readonly modalTypOptionClaim: string;
  readonly modalTypOptionRequest: string;
  // Subject input: <input name="Subject">
  readonly modalSubjectInput: string;
  // Description textarea: <textarea name="Description">
  readonly modalDescriptionInput: string;
  // Submit: type="submit" (language-agnostic)
  readonly modalSubmitBtn: string;
  // Cancel: type="button" with slds-button_neutral class
  readonly modalCancelBtn: string;

  constructor(page: Page, casesNavLabel: string = 'Kundenservice.') {
    super(page);
    this.casesNavKey   = '[data-name="customerService"]';
    this.casesNavLabel = casesNavLabel;
    this.createCaseBtn = 'button:has(svg[data-key="questions_and_answers"])';

    // Modal content div — always present and visible when the create-case modal is open
    this.caseCreationModal = '.slds-modal__content';

    // Form field selectors — all language-agnostic via Salesforce field names
    this.modalTypCombobox     = 'button[name="Type"][role="combobox"]';
    this.modalTypOptionClaim   = '[role="option"][data-value="Claim"]';   // Reklamation / FR equiv
    this.modalTypOptionRequest = '[role="option"][data-value="Request"]'; // Anforderung / FR equiv
    this.modalSubjectInput     = 'input[name="Subject"]';
    this.modalDescriptionInput = 'textarea[name="Description"]';
    this.modalSubmitBtn        = 'button[type="submit"].slds-button_brand';
    this.modalCancelBtn        = 'button[type="button"].slds-button_neutral';
  }

  /**
   * Navigates to the Customer Service / Cases section from the MyCockpit left nav.
   * Uses native JS click — more reliable than Playwright synthetic events for LWC.
   */
  async navigateToCases(): Promise<void> {
    await this.page.waitForSelector('.slds-nav-vertical__section', { timeout: 15000 });
    await this.page.waitForTimeout(1000);

    const clicked = await this.page.evaluate((label) => {
      const allEls = Array.from(document.querySelectorAll('*')) as HTMLElement[];
      for (const el of allEls) {
        const directText = Array.from(el.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent?.trim())
          .join('');
        if (directText === label && el.offsetParent !== null) {
          el.click();
          return true;
        }
      }
      return false;
    }, this.casesNavLabel);

    if (!clicked) throw new Error(`Could not navigate to Cases — nav item "${this.casesNavLabel}" not found`);

    await this.page.locator(this.createCaseBtn).waitFor({ state: 'visible', timeout: 20000 });
  }

  /**
   * Clicks the "Create case" button and waits for the SLDS modal to open.
   */
  async clickCreateCase(): Promise<void> {
    const btn = this.page.locator(this.createCaseBtn);
    await btn.waitFor({ state: 'visible', timeout: 15000 });
    await btn.click();
    await this.page.locator(this.caseCreationModal).waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Fills and submits the case creation form.
   * Uses Salesforce internal field names — language-agnostic.
   * @param typeValue  data-value of the Type option: 'Claim' | 'Request'
   * @param subject    Text for the Subject field
   * @param description Text for the Description field
   */
  async submitCaseForm(
    typeValue: 'Claim' | 'Request',
    subject: string,
    description: string
  ): Promise<void> {
    // All selectors scoped within the modal container to avoid matching
    // elements elsewhere on the page
    const modal = this.page.locator(this.caseCreationModal);

    // 1. Open the Type combobox and select the desired option
    const typCombobox = modal.locator(this.modalTypCombobox);
    await typCombobox.waitFor({ state: 'visible', timeout: 10000 });
    await typCombobox.click();

    // Options render outside the modal in a fixed listbox — use page scope
    const option = this.page.locator(`[role="option"][data-value="${typeValue}"]`);
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    // Allow LWC to re-render the modal after selection
    await this.page.waitForTimeout(500);

    // 2. Fill Subject (scoped within modal)
    const subjectInput = modal.locator(this.modalSubjectInput);
    await subjectInput.waitFor({ state: 'visible', timeout: 5000 });
    await subjectInput.fill(subject);

    // 3. Fill Description (scoped within modal)
    const descriptionInput = modal.locator(this.modalDescriptionInput);
    await descriptionInput.waitFor({ state: 'visible', timeout: 5000 });
    await descriptionInput.fill(description);

    // 4. Submit (scoped within modal)
    const submitBtn = modal.locator(this.modalSubmitBtn);
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click();
  }

  /**
   * Closes the modal by clicking the Cancel button.
   * Safe to call even if no modal is open.
   */
  async closeCaseModal(): Promise<void> {
    try {
      const modal = this.page.locator(this.caseCreationModal);
      const isOpen = await modal.isVisible().catch(() => false);
      if (!isOpen) return;

      const cancelBtn = this.page.locator(this.modalCancelBtn);
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
      await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    } catch { /* modal was not open */ }
  }

  async isCreateCaseButtonVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.createCaseBtn).waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async isCaseCreationModalVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.caseCreationModal).waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
