import { Page, Locator } from '@playwright/test';
import BasePage from './BasePage';

export const AMERICAS_COUNTRIES = ['Brazil', 'Mexico'];
export const EUROPE_COUNTRIES = ['France', 'Germany', 'Italy', 'Poland', 'Portugal', 'Spain'];

export interface CountryEntry {
  name: string;
  region: 'Americas' | 'Europe';
  iso: string;
}

export const ALL_COUNTRIES: CountryEntry[] = [
  { name: 'Brazil',   region: 'Americas', iso: 'BR' },
  { name: 'Mexico',   region: 'Americas', iso: 'MX' },
  { name: 'France',   region: 'Europe',   iso: 'FR' },
  { name: 'Germany',  region: 'Europe',   iso: 'DE' },
  { name: 'Italy',    region: 'Europe',   iso: 'IT' },
  { name: 'Poland',   region: 'Europe',   iso: 'PL' },
  { name: 'Portugal', region: 'Europe',   iso: 'PT' },
  { name: 'Spain',    region: 'Europe',   iso: 'AR' },
];

export default class CountryNavigatorPage extends BasePage {
  readonly footerCountryCardSelector: string;
  readonly selectorPanelIndicator: string;
  readonly countryCardSelector: string;
  readonly countryNameInCardSelector: string;

  // Americas = column 0, Europe = column 1 (order in the selector panel grid)
  private readonly regionIndex: Record<string, number> = {
    'Americas': 0,
    'Europe':   1,
  };

  constructor(page: Page) {
    super(page);
    this.footerCountryCardSelector  = 'c-chc-footer c-b2b-country-card';
    this.selectorPanelIndicator     = 'div.b2b-welcomeTitle';
    this.countryCardSelector        = 'c-b2b-country-card';
    this.countryNameInCardSelector  = 'div.b2b-countrySelectorTitle';
  }

  async scrollToFooter(): Promise<void> {
    await this.page.locator('c-chc-footer').scrollIntoViewIfNeeded();
  }

  async openCountrySelector(): Promise<void> {
    const trigger = this.page.locator(this.footerCountryCardSelector).first();
    await trigger.waitFor({ state: 'visible', timeout: 20000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    // Wait for the panel title
    await this.page.waitForSelector(this.selectorPanelIndicator, { state: 'visible', timeout: 10000 });
    // Wait for the country cards inside the panel to be rendered
    await this.page
      .locator(`div:has(div.b2b-welcomeTitle) ${this.countryCardSelector}`)
      .first()
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  async isSelectorPanelVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectorPanelIndicator, { state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the slds-col for the given region, scoped to the country selector panel.
   * Scoping via div:has(div.b2b-welcomeTitle) avoids matching page layout columns.
   * Americas = nth(0), Europe = nth(1).
   */
  private getSectionColumn(regionName: string): Locator {
    const index = this.regionIndex[regionName] ?? 0;
    return this.page
      .locator('div:has(> div.b2b-welcomeTitle)')
      .first()
      .locator('div.slds-col')
      .nth(index);
  }

  async getCardsInSection(regionName: string): Promise<Locator[]> {
    return this.getSectionColumn(regionName)
      .locator(this.countryCardSelector)
      .all();
  }

  async getCountryCountInSection(regionName: string): Promise<number> {
    return (await this.getCardsInSection(regionName)).length;
  }

  async getCountryNamesInSection(regionName: string): Promise<string[]> {
    const cards = await this.getCardsInSection(regionName);
    const names: string[] = [];
    for (const card of cards) {
      const name = await card.locator(this.countryNameInCardSelector).first().textContent() ?? '';
      names.push(name.trim());
    }
    return names;
  }

  async clickCountryByName(regionName: string, countryName: string): Promise<void> {
    const card = this.getSectionColumn(regionName)
      .locator(this.countryCardSelector)
      .filter({ hasText: countryName });
    await card.click();
  }

  getCurrentCountryCodeFromUrl(): string {
    const match = this.page.url().match(/\/([A-Z]{2})\//);
    return match ? match[1] : '';
  }
}
