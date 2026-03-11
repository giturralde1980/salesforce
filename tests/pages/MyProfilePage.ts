import { Page } from '@playwright/test';
import BasePage from './BasePage';

export default class MyProfilePage extends BasePage {
  // Nav label — locale-specific, injected for multi-country support
  readonly profileNavLabel: string;

  // Profile section container (language-agnostic CSS class)
  readonly profileContainer: string;

  // ── Read-only user info ──────────────────────────────────────────────────
  // Salesforce RecordField selectors — data-target-selection-name is internal
  readonly nameField: string;
  readonly emailField: string;
  readonly phoneField: string;
  readonly mobilePhoneField: string;

  // ── Email update form (c-b2b-update-email-wrapper) ───────────────────────
  // Current email shown as readonly input
  readonly currentEmailInput: string;
  // Editable fields — name attributes are Salesforce internal (language-agnostic)
  readonly newEmailInput: string;
  readonly confirmEmailInput: string;
  // Submit button scoped to the email wrapper component
  readonly updateEmailBtn: string;

  // ── Phone update form ────────────────────────────────────────────────────
  readonly currentPhoneInput: string;
  readonly newPhoneInput: string;
  readonly confirmPhoneInput: string;
  // Scoped via :has() to the flow section that contains the phone inputs
  readonly updatePhoneBtn: string;

  // ── Mobile phone update form ─────────────────────────────────────────────
  readonly currentMobileInput: string;
  readonly newMobileInput: string;
  readonly confirmMobileInput: string;
  readonly updateMobileBtn: string;

  constructor(page: Page, profileNavLabel: string = 'Mein Profil.') {
    super(page);
    this.profileNavLabel = profileNavLabel;
    this.profileContainer = '.profileContainer';

    // Read-only info — data-target-selection-name is Salesforce internal
    this.nameField        = '[data-target-selection-name="sfdc:RecordField.User.Name"] .slds-form-element__static';
    this.emailField       = '[data-target-selection-name="sfdc:RecordField.User.Email"] a.emailuiFormattedEmail';
    this.phoneField       = '[data-target-selection-name="sfdc:RecordField.User.Phone"] .forceOutputPhone';
    this.mobilePhoneField = '[data-target-selection-name="sfdc:RecordField.User.MobilePhone"] .forceOutputPhone';

    // Email section — scoped within c-b2b-update-email-wrapper (language-agnostic component name)
    this.currentEmailInput = 'c-b2b-update-email-wrapper input[autocomplete="email"]';
    this.newEmailInput     = 'input[name="newEmail"]';
    this.confirmEmailInput = 'input[name="confirmEmail"]';
    this.updateEmailBtn    = 'c-b2b-update-email-wrapper button.slds-button_brand';

    // Phone section — :has() scopes the button to the correct flow section
    this.currentPhoneInput  = 'flowruntime-flow:has(input[name="newPhoneNumber"]) input[type="tel"]';
    this.newPhoneInput      = 'input[name="newPhoneNumber"]';
    this.confirmPhoneInput  = 'input[name="confirmPhoneNumber"]';
    this.updatePhoneBtn     = 'flowruntime-flow:has(input[name="newPhoneNumber"]) button.slds-button_brand';

    // Mobile section
    this.currentMobileInput  = 'flowruntime-flow:has(input[name="newMobileNumber"]) input[type="tel"]';
    this.newMobileInput      = 'input[name="newMobileNumber"]';
    this.confirmMobileInput  = 'input[name="confirmMobileNumber"]';
    this.updateMobileBtn     = 'flowruntime-flow:has(input[name="newMobileNumber"]) button.slds-button_brand';
  }

  /**
   * Navigates to the Profile section from the MyCockpit left nav.
   * Uses native JS click — reliable for LWC components.
   */
  async navigateToProfile(): Promise<void> {
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
    }, this.profileNavLabel);

    if (!clicked) throw new Error(`Could not navigate to Profile — nav item "${this.profileNavLabel}" not found`);

    // Confirm the profile section loaded
    await this.page.locator(this.profileContainer).waitFor({ state: 'visible', timeout: 20000 });
  }

  async isProfileSectionVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.profileContainer).waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async isEmailFormVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.newEmailInput).waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isPhoneFormVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.newPhoneInput).waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isMobileFormVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.newMobileInput).waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getDisplayedName(): Promise<string> {
    const el = this.page.locator(this.nameField).first();
    await el.waitFor({ state: 'visible', timeout: 10000 });
    return (await el.textContent())?.trim() ?? '';
  }

  async getDisplayedEmail(): Promise<string> {
    const el = this.page.locator(this.emailField).first();
    await el.waitFor({ state: 'visible', timeout: 10000 });
    return (await el.textContent())?.trim() ?? '';
  }
}
