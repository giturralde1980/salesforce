import { Page } from '@playwright/test';
import BasePage from './BasePage';

export default class HomePage extends BasePage {
  readonly einloggenButton2: string;
  readonly einloggenButton: string;
  readonly wunschlistenButton: string;
  readonly meinCockpitLink: string;
  readonly meinBestellungsLink: string;
  readonly productSearchInput: string;
  readonly productSearchButton: string;
  readonly profileMenuTrigger: string;
  readonly abmeldenLink: string;
  readonly alleProductsLink: string;
  readonly selfRegisterButton: string;

  constructor(page: Page) {
    super(page);
    this.einloggenButton2 = 'text=Log In.';
    this.einloggenButton = 'text=Einloggen';
    this.wunschlistenButton = 'text=Wunschlisten';
    this.meinCockpitLink = 'a[href="/DE/s/my-cockpit"]';
    this.meinBestellungsLink = '[title="BESTELLUNG."]';
    this.productSearchInput = 'input[placeholder*="Produktnamen oder PZN eingeben"]';
    this.productSearchButton = 'class="lwc-4b3m8g3ufrr search-input-with-button"';
    this.profileMenuTrigger = 'button:has(span.slds-avatar)';
    this.abmeldenLink = 'a:has-text("Abmelden")';
    this.alleProductsLink = 'a:has-text("Alle")';
    this.selfRegisterButton = '.slds-button.slds-button_neutral.slds-button_stretch.b2b-button';
  }

  async clickAlleProducts(): Promise<void> {
    await this.page.locator(this.alleProductsLink).first().click();
  }

  async clickEinloggen(): Promise<void> {
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }),
      this.page.click(this.einloggenButton)
    ]);
  }

  async clickMeinCockpit(): Promise<void> {
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      this.page.click(this.meinCockpitLink)
    ]);
  }

  async clickMeinBestellungs(): Promise<void> {
    await this.page.click(this.meinBestellungsLink);
  }

  async clickSelfRegister(): Promise<void> {
    await this.page.click(this.selfRegisterButton);
  }

  async isOnHomePage(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.einloggenButton, { timeout: 5000 });
      return await this.page.isVisible(this.einloggenButton);
    } catch (error) {
      return false;
    }
  }

  async isMeinCockpitVisible(): Promise<boolean> {
    try {
      return await this.page.isVisible(this.meinCockpitLink);
    } catch (error) {
      return false;
    }
  }

  async logout(): Promise<void> {
    await this.page.click(this.profileMenuTrigger);
    await this.page.waitForSelector(this.abmeldenLink, { state: 'visible' });
    await this.page.click(this.abmeldenLink);
    await this.page.waitForSelector(this.einloggenButton2, { state: 'visible', timeout: 30000 });
  }

  async isWunschlistenVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.wunschlistenButton, { state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
