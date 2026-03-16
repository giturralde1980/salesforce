import { test, expect, Page } from '@playwright/test';
import HomePage from '../../../pages/HomePage';
import LoginPage from '../../../pages/LoginPage';
import ProductListPage from '../../../pages/ProductListPage';
import 'dotenv/config';

// ── Shared helper: steps 1–6 identical in both tests ─────────────────────────
// Finds the first orderable product, adds it to cart (qty 2), navigates to cart
// and triggers price calculation. Returns once price fields are populated.
async function addProductToCartAndCalculate(page: Page, productListPage: ProductListPage): Promise<void> {
  const productCount = await productListPage.getProductCount();
  expect(productCount, 'At least one product must be visible').toBeGreaterThan(0);

  // Step 1: find the first product with an active "Zum Warenkorb" button
  const allCards = page.locator(productListPage.productCard);
  let targetCard: ReturnType<typeof page.locator> | null = null;

  for (let i = 0; i < productCount; i++) {
    const card = allCards.nth(i);
    if (await card.locator('button:has-text("Zum Warenkorb")').count() > 0) {
      targetCard = card;
      console.log(`Using product at index ${i}`);
      break;
    }
  }
  if (!targetCard) throw new Error('No product with an active "Zum Warenkorb" button was found');

  await targetCard.scrollIntoViewIfNeeded();

  // Step 2: increase quantity (fixed at 2 — deterministic, reproducible)
  const increaseBtn = targetCard.locator('button:has(svg[data-key="add"])');
  await expect(increaseBtn).toBeVisible({ timeout: 25000 });
  for (let i = 0; i < 2; i++) {
    await increaseBtn.click();
    await page.waitForTimeout(300);
  }
  console.log('Clicked "+" 2 time(s)');

  // Step 3: add to cart
  await targetCard.locator('button:has-text("Zum Warenkorb")').click();
  await page.waitForTimeout(2000); // allow cart API to update badge

  // Step 4: verify cart badge is visible
  const cartSvg = page.locator('svg.slds-global-actions__item-action');
  await expect(cartSvg).toBeVisible({ timeout: 20000 });

  const badgeText = await cartSvg
    .locator('xpath=following-sibling::*[1]')
    .textContent()
    .catch(() => 'badge not found');
  console.log(`Cart badge: ${badgeText?.trim()}`);

  // Step 5: navigate to cart
  await cartSvg.click();
  await page.waitForURL(url => url.href.includes('/cart/'), { timeout: 30000 });
  expect(page.url()).toContain('/cart/');
  console.log(`Cart URL: ${page.url()}`);

  // Step 6: trigger price calculation
  const calculateBtn = page.getByRole('button', { name: /Meinen Auftrag berechnen/i });
  await expect(calculateBtn).toBeVisible({ timeout: 25000 });
  await calculateBtn.click();

  await page.waitForLoadState('networkidle', { timeout: 45000 });
  expect(page.url(), 'Session lost after calculation — redirected away from cart').toContain('/cart/');

  // Step 6b: wait for price fields to be populated by LWC
  const priceElements = page.locator('lightning-formatted-number');
  await expect(priceElements.first()).toBeVisible({ timeout: 30000 });

  const count = await priceElements.count();
  expect(count, 'At least 4 price fields must be present').toBeGreaterThanOrEqual(4);

  for (let i = 0; i < count; i++) {
    const text = (await priceElements.nth(i).textContent()) ?? '';
    expect(text.trim(), `Price field ${i + 1} must contain a number`).toMatch(/\d/);
  }
  console.log(`Price calculation completed — ${count} price fields populated ✓`);
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Simulate Price Calculation / Order Creation', () => {
  test.setTimeout(180000);

  let homePage: HomePage;
  let loginPage: LoginPage;
  let productListPage: ProductListPage;

  test.beforeEach(async ({ page }) => {
    homePage        = new HomePage(page);
    loginPage       = new LoginPage(page);
    productListPage = new ProductListPage(page);

    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(process.env.TEST_EMAIL_OWNER!, process.env.TEST_PASSWORD_OWNER!);
    await expect(page.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 35000 });

    await homePage.clickMeinBestellungs();
    await page.waitForTimeout(1000);
    await homePage.clickAlleProducts();
    await expect(page.locator('c-plp-products-container')).toBeVisible({ timeout: 30000 });
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Screenshot before cleanup — captures the final state as QA evidence
    if (testInfo.status === 'passed') {
      await testInfo.attach('screenshot', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    }
    // Navigate home first to ensure logout works regardless of current page
    try { await homePage.navigate(); } catch {}
    await homePage.logout();
  });

  // ── Smoke: calculate price and empty cart (no order created) ─────────────

  test('Price simulation: add product to cart, calculate price and empty cart', { tag: ['@smoke'] }, async ({ page }) => {
    await addProductToCartAndCalculate(page, productListPage);

    // Step 7: empty the cart
    const clearCartBtn = page.getByRole('button', { name: /Alles löschen/i });
    await expect(clearCartBtn).toBeVisible({ timeout: 25000 });
    await clearCartBtn.click();

    const confirmBtn = page.getByRole('button', { name: /Bestätigt/i });
    await expect(confirmBtn).toBeVisible({ timeout: 25000 });
    await confirmBtn.click();

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await expect(page.locator('button:has(svg[data-key="delete"])')).toHaveCount(0, { timeout: 25000 });
    console.log('Cart emptied — "Alles löschen." button is gone ✓');
  });

  // ── Regression: full order creation flow ─────────────────────────────────

  test('Order creation: add product to cart, calculate price and proceed to checkout', { tag: ['@regression'] }, async ({ page }) => {
    await addProductToCartAndCalculate(page, productListPage);

    // Step 7: proceed to checkout
    const checkoutBtn = page.getByRole('button', { name: /Zur Bezahlung gehen/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 25000 });
    await checkoutBtn.click();
    console.log('Clicked "Zur Bezahlung gehen." ✓');

    // Step 8: verify navigation to checkout
    await page.waitForURL(url => url.href.includes('/checkout/'), { timeout: 45000 });
    expect(page.url()).toContain('/checkout/');
    console.log(`Checkout URL: ${page.url()}`);

    // Step 9: fill order reference
    const orderRefInput = page.locator('[part="input-container"] input, .slds-form-element__control.slds-grow input').first();
    await expect(orderRefInput).toBeVisible({ timeout: 25000 });
    await orderRefInput.fill('CoE automation test');
    console.log('Filled order reference field ✓');

    // Step 10: confirm payment
    const confirmPaymentBtn = page.getByRole('button', { name: /Bestätigen Sie die Zahlung/i });
    await expect(confirmPaymentBtn).toBeVisible({ timeout: 25000 });
    await confirmPaymentBtn.click();
    console.log('Clicked "Bestätigen Sie die Zahlung" ✓');

    // Step 11: verify order confirmation
    await page.waitForURL(url => url.href.includes('/orderconfirmation/'), { timeout: 75000 });
    expect(page.url()).toContain('/orderconfirmation/');
    console.log(`Order confirmation URL: ${page.url()}`);

    const orderNumberHeading = page.locator('h2', { hasText: /Auftragsnummer\./i });
    await expect(orderNumberHeading).toBeVisible({ timeout: 30000 });

    await expect.poll(
      async () => (await orderNumberHeading.textContent()) ?? '',
      { timeout: 30000, message: 'Order number did not appear after "Auftragsnummer.:"' }
    ).toMatch(/\d+/);

    const orderNumberText = (await orderNumberHeading.textContent()) ?? '';
    console.log(`Order confirmed: ${orderNumberText.trim()} ✓`);
  });
});
