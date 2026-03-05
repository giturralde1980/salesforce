import { test, expect } from '@playwright/test';
import HomePage from '../../../pages/HomePage';
import CountryNavigatorPage, { AMERICAS_COUNTRIES, EUROPE_COUNTRIES, ALL_COUNTRIES } from '../../../pages/CountryNavigatorPage';
import 'dotenv/config';

/**
 * Available countries in the selector:
 * Americas (2): Brazil (BR), Mexico (MX)
 * Europe  (6): France (FR), Germany (DE), Italy (IT), Poland (PL), Portugal (PT), Spain (ES)
 */
test.describe('@CHCCRM01-18649 Country Selector - Footer Panel', { tag: '@smoke' }, () => {
  let homePage: HomePage;
  let countryPage: CountryNavigatorPage;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === 'passed') {
      await testInfo.attach('screenshot', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    }
  });

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    countryPage = new CountryNavigatorPage(page);
    await homePage.navigate();
    await countryPage.waitForPageLoad();
    await countryPage.scrollToFooter();
    await countryPage.openCountrySelector();
  });

  // ─── Panel visibility ────────────────────────────────────────────────────

  test('Country selector panel opens when clicking the footer country button', async () => {
    const isVisible = await countryPage.isSelectorPanelVisible();
    expect(isVisible).toBeTruthy();
  });

  // ─── Americas section ────────────────────────────────────────────────────

  test('Americas section displays exactly 2 countries: Brazil and Mexico', async () => {
    const names = await countryPage.getCountryNamesInSection('Americas');
    console.log(`Americas: ${names.join(', ')}`);
    expect(names).toHaveLength(2);
    for (const country of AMERICAS_COUNTRIES) {
      expect(names, `Expected "${country}" to be present in Americas`).toContain(country);
    }
  });

  // ─── Europe section ──────────────────────────────────────────────────────

  test('Europe section displays exactly 6 countries: France, Germany, Italy, Poland, Portugal, Spain', async () => {
    const names = await countryPage.getCountryNamesInSection('Europe');
    console.log(`Europe: ${names.join(', ')}`);
    expect(names).toHaveLength(6);
    for (const country of EUROPE_COUNTRIES) {
      expect(names, `Expected "${country}" to be present in Europe`).toContain(country);
    }
  });

  // ─── Navigation per country (parameterized) ─────────────────────────────
  // Each country is its own test: isolated failure, independent retry, clear reporting.

  for (const country of ALL_COUNTRIES) {
    test(`Clicking "${country.name}" navigates to a URL containing /${country.iso}/`, async ({ page }) => {
      await countryPage.clickCountryByName(country.region, country.name);

      await page.waitForURL(
        url => url.href.toUpperCase().includes(`/${country.iso}/`),
        { timeout: 15000 }
      );

      expect(
        page.url().toUpperCase(),
        `URL after clicking "${country.name}" must contain /${country.iso}/`
      ).toContain(`/${country.iso}/`);
    });
  }
});
