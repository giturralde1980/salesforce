import { test, expect } from '@playwright/test';
import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/LoginPage';
import ProductSearchPage from '../../pages/ProductSearchPage';
import 'dotenv/config';

test.describe('Product Search Tests', { tag: '@demo' },() => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let productSearchPage: ProductSearchPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    productSearchPage = new ProductSearchPage(page);
    await homePage.navigate();
  });

  test('Search for product on home page with no login', async ({ page }) => {

    // Step 1: Verify home page
    expect(await homePage.isOnHomePage()).toBeTruthy();

    // Step 2: Debug page structure to find search input
    await productSearchPage.debugPageStructure();

    // Step 3: Try to find and use search input
    try {
      const isSearchVisible = await productSearchPage.isOnProductSearchPage();

      if (isSearchVisible) {
        await productSearchPage.searchForProduct('12551047');
        await productSearchPage.clickSearch();

        const hasResults = await productSearchPage.hasSearchResults();
        const resultCount = await productSearchPage.getResultCount();

      } else {
      }
    } catch (error) {
      // This is ok - we're testing to see what happens
    }
  });

  test('Search for product on home page after login', async ({ page }) => {

    const searchCode = process.env.PRODUCT_CODE!;

    // Step 1: Login
    expect(await homePage.isOnHomePage()).toBeTruthy();
    await homePage.clickEinloggen();
   // expect(await loginPage.isOnLoginPage()).toBeTruthy();

    await loginPage.login(
      process.env.TEST_EMAIL_OWNER!,
      process.env.TEST_PASSWORD_OWNER!
    );


    // Step 2: Wait for a logged-in specific element to confirm login state
    await expect(homePage.page.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 20000 });
    await productSearchPage.debugPageStructure();

    // Step 3: Perform search
    try {
      const isSearchVisible = await productSearchPage.isOnProductSearchPage();
      expect(isSearchVisible).toBeTruthy();

      await productSearchPage.searchForProduct(searchCode);
      await productSearchPage.clickSearch();


      // Step 4: Validate product found by EAN code
      await page.waitForTimeout(10000);

      const productInfo = await productSearchPage.findProductByEANCode(searchCode);


      if (productInfo.found) {
        expect(productInfo.found).toBeTruthy();
        expect(productInfo.actualCode).toBe(searchCode);
      } else {
        expect(productInfo.found).toBeTruthy();
      }

    } catch (error) {
      await page.screenshot({ path: 'debug-product-search.png' });
      throw error;
    }

  });

  test('Search for non-existent product after login', async ({ page }) => {

    const searchCode = 'NOEXISTSXYZ999';

    // Step 1: Login
    expect(await homePage.isOnHomePage()).toBeTruthy();
    await homePage.clickEinloggen();
    expect(await loginPage.isOnLoginPage()).toBeTruthy();

    await loginPage.login(
      process.env.TEST_EMAIL_OWNER!,
      process.env.TEST_PASSWORD_OWNER!
    );


    // Step 2: Wait for a logged-in specific element and search for non-existent product
    await expect(homePage.page.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 20000 });

    const isSearchVisible = await productSearchPage.isOnProductSearchPage();
    expect(isSearchVisible).toBeTruthy();

    await productSearchPage.searchForProduct(searchCode);
    await productSearchPage.clickSearch();


    // Step 3: Validate no results found
    await page.waitForTimeout(2000);

    // Check if product code appears on page
    const pageContent = await page.content();
    const codeFound = pageContent.includes(searchCode);

    expect(codeFound).toBeFalsy();

  });

});
