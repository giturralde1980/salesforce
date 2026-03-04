import { test, expect } from '@playwright/test';
import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/LoginPage';
import 'dotenv/config';

// Reusable selector for the "no results" empty-state div
const NO_RESULTS_SELECTOR = '.slds-text-color_weak.slds-align_absolute-center.slds-p-vertical_medium';

// NOTE: confirm the exact placeholder text by inspecting the input on Meine Rechnungen.
// Using the generic type="search" selector as fallback until the placeholder is known.
const SEARCH_INPUT_SELECTOR = 'input.slds-input[type="search"]';

test.describe('My Invoices - Meine Rechnungen', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(process.env.TEST_EMAIL_OWNER!, process.env.TEST_PASSWORD_OWNER!);
    await expect(page.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 20000 });
    await homePage.clickMeinCockpit();
    await page.waitForSelector('.slds-nav-vertical__section', { timeout: 15000 });
    await page.waitForTimeout(1000); // allow LWC to finish rendering nav items

    // Navigate to Meine Rechnungen via left nav.
    // Multiple DOM elements share data-name="myInvoices" (desktop + mobile variants,
    // some hidden). Iterate all and force-click the first one that responds.
    const candidates = await page.locator('[data-name="myInvoices"]').all();
    let clicked = false;
    for (const el of candidates) {
      try {
        await el.click({ force: true, timeout: 5000 });
        clicked = true;
        break;
      } catch { /* try next candidate */ }
    }
    if (!clicked) throw new Error('Could not click [data-name="myInvoices"] — no candidate responded');
    await page.waitForTimeout(2000);
  });

  test.afterEach(async () => {
    await homePage.logout();
  });

  // ─── Search: no results ──────────────────────────────────────────────────

  test('Searching for an invalid code shows the empty-state message', async ({ page }) => {
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.click();
    await searchInput.fill('test');

    await page.locator('button[title="Suche."]').click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // The empty-state div must be visible and contain some text
    const noResultsMsg = page.locator(NO_RESULTS_SELECTOR);
    await expect(noResultsMsg).toBeVisible({ timeout: 10000 });
    const msgText = await noResultsMsg.textContent();
    expect(msgText?.trim().length).toBeGreaterThan(0);
  });

  // ─── Search: valid invoice ───────────────────────────────────────────────

  test('Searching for a valid invoice number shows at least one result', async ({ page }) => {
    const invoiceNumber = process.env.INVOICE!;

    const searchInput = page.locator(SEARCH_INPUT_SELECTOR);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.click();
    await searchInput.fill(invoiceNumber);

    await page.locator('button[title="Suche."]').click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // The empty-state message must NOT be present
    await expect(page.locator(NO_RESULTS_SELECTOR)).toHaveCount(0, { timeout: 10000 });

    // The invoice number must appear somewhere in the results
    await expect(page.getByText(invoiceNumber, { exact: false })).toBeVisible({ timeout: 10000 });
  });
});
