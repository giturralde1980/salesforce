import { test, expect, BrowserContext, Page } from '@playwright/test';
import HomePage from '../../../pages/HomePage';
import LoginPage from '../../../pages/LoginPage';
import ProductListPage from '../../../pages/ProductListPage';
import MyListsPage from '../../../pages/MyListsPage';
import 'dotenv/config';

// test.describe.serial → tests run sequentially sharing a single browser session
// login once (beforeAll) / logout once (afterAll) — no per-test auth overhead
test.describe.serial('Product page functionality: Filtering categories and sorting.',  { tag: ['@smoke'] },() => {
  let context: BrowserContext;
  let sharedPage: Page;
  let homePage: HomePage;
  let loginPage: LoginPage;
  let productListPage: ProductListPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      viewport: { width: 1920, height: 1080 },
    });
    sharedPage = await context.newPage();

    homePage = new HomePage(sharedPage);
    loginPage = new LoginPage(sharedPage);
    productListPage = new ProductListPage(sharedPage);

    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(process.env.TEST_EMAIL_OWNER!, process.env.TEST_PASSWORD_OWNER!);
    await expect(sharedPage.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 35000 });
  });

  test.afterAll(async () => {
    await homePage.logout();
    await context.close();
  });

  test.beforeEach(async () => {
    // Already logged in — navigate back to product list
    await homePage.clickMeinBestellungs();
    await sharedPage.waitForTimeout(1000);
    await homePage.clickAlleProducts();
    await sharedPage.waitForTimeout(2000);
    expect(await productListPage.isProductListVisible()).toBeTruthy();
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status === 'passed') {
      await testInfo.attach('screenshot', {
        body: await sharedPage.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    }
  });

  // ── Product list tests ────────────────────────────────────────────────────

  test('Verify that should display all products with their details', async () => {
    const productCount = await productListPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);
    const titles = await productListPage.getAllProductTitles();
    expect(titles.length).toBe(productCount);
    expect(titles.every(title => title.length > 0)).toBeTruthy();
  });

  test('should display complete information for all products', async () => {
    const productCount = await productListPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);

    const titles = await productListPage.getAllProductTitles();
    expect(titles.length).toBe(productCount);
    expect(titles.every(t => t.length > 0)).toBeTruthy();

    const eans = await sharedPage.locator('c-plp-ean-code span').allTextContents();
    expect(eans.every(e => e.trim().length > 0)).toBeTruthy();
  });

  test('should get all products with "Fokusprodukt" tag', async () => {
    const fokusIndices = await productListPage.getProductsWithTag('Fokusprodukt');
    expect(Array.isArray(fokusIndices)).toBeTruthy();
    console.log(`Productos con tag "Fokusprodukt": ${fokusIndices.length}`);
  });

  // ── Sort tests ────────────────────────────────────────────────────────────

  test('Verify sort: default order is Ascending', async () => {
    const titles = await productListPage.getAllProductTitles();
    expect(titles.length).toBeGreaterThan(0);
    // First title should be <= last title alphabetically (ascending order)
    const first = titles[0];
    const last = titles[titles.length - 1];
    const comparison = first.localeCompare(last, undefined, { sensitivity: 'base', numeric: true });
    expect(comparison).toBeLessThanOrEqual(0);
    console.log(`✓ Ascending: "${first}" ... "${last}"`);
  });

  test('Verify sort: Descending reverses the order', async () => {
    // Capture ascending order first, then switch to descending and compare
    const ascTitles = await productListPage.getAllProductTitles();
    expect(ascTitles.length).toBeGreaterThan(0);

    await productListPage.selectSortByDirection('Descending');
    const descTitles = await productListPage.getAllProductTitles();
    expect(descTitles.length).toBeGreaterThan(0);

    // First title in descending should differ from first title in ascending
    expect(descTitles[0]).not.toBe(ascTitles[0]);
    // First desc >= last desc (descending order)
    const comparison = descTitles[0].localeCompare(descTitles[descTitles.length - 1], undefined, { sensitivity: 'base', numeric: true });
    expect(comparison).toBeGreaterThanOrEqual(0);
    console.log(`✓ Descending: "${descTitles[0]}" ... "${descTitles[descTitles.length - 1]}"`);
  });

  test('Verify sort: Default (best match) keeps products visible', async () => {
    await productListPage.selectSortByDirection('Default');

    const count = await productListPage.getProductCount();
    expect(count).toBeGreaterThan(0);
    console.log(`✓ ${count} productos visibles con ordenación por defecto`);
  });

  // ── Category filter tests ─────────────────────────────────────────────────
  // Facet IDs are Salesforce record IDs (language-agnostic).
  // The value attribute on each checkbox contains the locale-specific label,
  // but data-facet is stable across languages.

  const FACETS = {
    allergie:  '0ZG6N000000Cb0tWAC',
    erkaeltung:'0ZG6N000000Cb0xWAC',
    magenDarm: '0ZG6N000000Cb0vWAC',
    schmerz:   '0ZG6N000000Cb0wWAC',
  } as const;

  test('Verify filter: Allergie category shows fewer products than unfiltered', async () => {
    const totalCount = await productListPage.getProductCount();
    expect(totalCount).toBeGreaterThan(0);

    await productListPage.clickCategoryFilter(FACETS.allergie);

    const filteredCount = await productListPage.getProductCount();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(totalCount);
    console.log(`✓ Allergie filter: ${totalCount} → ${filteredCount} products`);
  });

  test('Verify filter: Erkältung category shows fewer products than unfiltered', async () => {
    const totalCount = await productListPage.getProductCount();
    expect(totalCount).toBeGreaterThan(0);

    await productListPage.clickCategoryFilter(FACETS.erkaeltung);

    const filteredCount = await productListPage.getProductCount();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(totalCount);
    console.log(`✓ Erkältung filter: ${totalCount} → ${filteredCount} products`);
  });

  test('Verify filter: Magen/Darm category applies filter and keeps products visible', async () => {
    const totalCount = await productListPage.getProductCount();
    expect(totalCount).toBeGreaterThan(0);

    await productListPage.clickCategoryFilter(FACETS.magenDarm);

    const isChecked = await productListPage.isCategoryFilterChecked(FACETS.magenDarm);
    expect(isChecked).toBe(true);

    const filteredCount = await productListPage.getProductCount();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(totalCount);
    console.log(`✓ Magen/Darm filter active: ${totalCount} → ${filteredCount} products`);
  });

  test('Verify filter: Schmerz category shows fewer products than unfiltered', async () => {
    const totalCount = await productListPage.getProductCount();
    expect(totalCount).toBeGreaterThan(0);

    await productListPage.clickCategoryFilter(FACETS.schmerz);

    const isChecked = await productListPage.isCategoryFilterChecked(FACETS.schmerz);
    expect(isChecked).toBe(true);

    const filteredCount = await productListPage.getProductCount();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(totalCount);
    console.log(`✓ Schmerz filter: ${totalCount} → ${filteredCount} products`);
  });

  // ── Search tests ──────────────────────────────────────────────────────────

  test('Verify search: valid product code returns results', async () => {
    const searchCode = process.env.PRODUCT_CODE!;
    await homePage.navigate();

    await sharedPage.locator(homePage.productSearchInput).fill(searchCode);
    await sharedPage.locator(homePage.productSearchInput).press('Enter');

    await expect(sharedPage.locator(`text=${searchCode}`).first()).toBeVisible({ timeout: 15000 });
    console.log(`✓ Product code "${searchCode}" found in search results`);
  });

  test('Verify search: non-existent product code returns no results', async () => {
    const searchCode = 'NOEXISTSXYZ999';
    await homePage.navigate();

    await sharedPage.locator(homePage.productSearchInput).fill(searchCode);
    await sharedPage.locator(homePage.productSearchInput).press('Enter');

    await sharedPage.waitForTimeout(3000);
    const pageContent = await sharedPage.content();
    expect(pageContent.includes(searchCode)).toBeFalsy();
    console.log(`✓ No results found for "${searchCode}"`);
  });

  // ── Wishlist tests (pendiente de revisión) ────────────────────────────────

  test.skip('favoriteproduct visibility', async () => {
    const isWunschlistenVisible = await homePage.isWunschlistenVisible();
    expect(isWunschlistenVisible).toBe(true);

    const firstProduct = await productListPage.getProductInfo(0);
    if (firstProduct.inWishlist) {
      await productListPage.clickWishlistByIndex(0);
      await sharedPage.waitForTimeout(2000);
    }
    await productListPage.clickWishlistByIndex(0);
    await sharedPage.waitForTimeout(2000);

    const isInWishlist = await productListPage.isProductInWishlist(0);
    expect(isInWishlist).toBe(true);

    await productListPage.clickWunschlistenButton();
    await expect(sharedPage).toHaveURL(/.*mylists.*/);

    const myListsPage = new MyListsPage(sharedPage);
    await sharedPage.waitForTimeout(2000);
    const isPresent = await myListsPage.isProductInFavorites(firstProduct.title);
    expect(isPresent).toBeTruthy();
  });

  test.skip('should navigate to favourite products page', async () => {
    await productListPage.clickWunschlistenButton();
    await expect(sharedPage).toHaveURL(/\/s\/mylists/);
  });

  test.skip('should add a product to wishlist and see it on the favourites page', async () => {
    const myListsPage = new MyListsPage(sharedPage);
    const productIndex = 1;
    const productInfo = await productListPage.getProductInfo(productIndex);
    if (productInfo.inWishlist) {
      await productListPage.clickWishlistByIndex(productIndex);
      await sharedPage.waitForTimeout(2000);
    }
    await productListPage.clickWishlistByIndex(productIndex);
    await sharedPage.waitForTimeout(2000);
    const finalStatus = await productListPage.isProductInWishlist(productIndex);
    expect(finalStatus).toBe(true);
    await productListPage.clickWunschlistenButton();
    await expect(sharedPage).toHaveURL(/\/s\/mylists/);
    const isPresent = await myListsPage.isProductInFavorites(productInfo.title);
    expect(isPresent).toBeTruthy();
  });

  test.skip('should click wishlist on the first product', async () => {
    const firstProduct = await productListPage.getProductInfo(0);
    await productListPage.clickFirstProductWishlist();
    await sharedPage.waitForTimeout(3500);
    const updatedStatus = await productListPage.isProductInWishlist(0);
    expect(updatedStatus).not.toBe(firstProduct.inWishlist);
  });

  test.skip('should click wishlist on a specific product by name', async () => {
    const productTitle = await productListPage.getProductTitle(1);
    const initialStatus = await productListPage.isProductInWishlist(1);
    await productListPage.clickWishlistByProductName(productTitle);
    await sharedPage.waitForTimeout(1500);
    const updatedStatus = await productListPage.isProductInWishlist(1);
    expect(updatedStatus).not.toBe(initialStatus);
  });

  test.skip('should click wishlist on multiple random products', async () => {
    const productCount = await productListPage.getProductCount();
    const numberOfProductsToSelect = Math.min(3, productCount);
    const selectedIndices = await productListPage.clickRandomWishlists(numberOfProductsToSelect);
    expect(selectedIndices.length).toBe(numberOfProductsToSelect);
  });

  test.skip('should toggle wishlist on first 3 products sequentially', async () => {
    const productCount = await productListPage.getProductCount();
    const numberOfProducts = Math.min(3, productCount);
    for (let i = 0; i < numberOfProducts; i++) {
      const initialStatus = await productListPage.isProductInWishlist(i);
      await productListPage.clickWishlistByIndex(i);
      await sharedPage.waitForTimeout(1000);
      const newStatus = await productListPage.isProductInWishlist(i);
      expect(newStatus).not.toBe(initialStatus);
    }
  });

  test.skip('should toggle wishlist color and verify visual change', async () => {
    const productIndex = 0;
    const firstToggle = await productListPage.toggleWishlistAndVerify(productIndex);
    expect(firstToggle.changed).toBeTruthy();
    expect(firstToggle.before.isActive).not.toBe(firstToggle.after.isActive);
    const secondToggle = await productListPage.toggleWishlistAndVerify(productIndex);
    expect(secondToggle.changed).toBeTruthy();
    expect(secondToggle.after.isActive).toBe(firstToggle.before.isActive);
    expect(secondToggle.after.fillColor).toBe(firstToggle.before.fillColor);
  });

  test.skip('should toggle wishlist on multiple products and verify each', async () => {
    const productCount = await productListPage.getProductCount();
    const productsToTest = Math.min(3, productCount);
    for (let i = 0; i < productsToTest; i++) {
      const toggle1 = await productListPage.toggleWishlistAndVerify(i);
      expect(toggle1.changed).toBeTruthy();
      const toggle2 = await productListPage.toggleWishlistAndVerify(i);
      expect(toggle2.changed).toBeTruthy();
      expect(toggle2.after.isActive).toBe(toggle1.before.isActive);
    }
  });

  test.skip('FUTURE: should add to wishlist and verify in favourites page', async () => {
    const productIndex = 0;
    if (await productListPage.isProductInWishlist(productIndex)) {
      await productListPage.clickWishlistByIndex(productIndex);
      await sharedPage.waitForTimeout(1500);
    }
    const toggle = await productListPage.toggleWishlistAndVerify(productIndex);
    expect(toggle.after.isActive).toBeTruthy();
    // TODO: navegar a favoritos y verificar
  });
});
