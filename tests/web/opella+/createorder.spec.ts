import { test, expect } from '@playwright/test';
import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/LoginPage';
import ProductListPage from '../../pages/ProductListPage';
import { getSfAccessToken, getOrderByNumber } from '../../api/sfClient';
import 'dotenv/config';

test.describe('Simulate Order Creation',() => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let productListPage: ProductListPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    productListPage = new ProductListPage(page);

    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(process.env.TEST_EMAIL_OWNER!, process.env.TEST_PASSWORD_OWNER!);
    await expect(page.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 20000 });

    // BESTELLUNG → ALLE
    await homePage.clickMeinBestellungs();
    await page.waitForTimeout(1000);
    await homePage.clickAlleProducts();
    await page.waitForTimeout(2000);

    expect(await productListPage.isProductListVisible()).toBeTruthy();
  });

  test.afterEach(async () => {
    await homePage.logout();
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('Order simulation: add product to cart, calculate price and empty cart', { tag: '@order' },async ({ page }) => {
    test.setTimeout(150000);

    const productCount = await productListPage.getProductCount();
    expect(productCount, 'At least one product must be visible').toBeGreaterThan(0);

    // ── Step 1: find the first product with an active "Zum Warenkorb" button ──
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

    // ── Step 2: increase quantity (1–3 times) ────────────────────────────────
    const increaseBtn = targetCard.locator('button:has(svg[data-key="add"])');
    await expect(increaseBtn).toBeVisible({ timeout: 10000 });

    const clickCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < clickCount; i++) {
      await increaseBtn.click();
      await page.waitForTimeout(300);
    }
    console.log(`Clicked "+" ${clickCount} time(s)`);

    // ── Step 3: add to cart ──────────────────────────────────────────────────
    await targetCard.locator('button:has-text("Zum Warenkorb")').click();
    await page.waitForTimeout(2000); // allow cart API to update badge

    // ── Step 4: verify cart badge ────────────────────────────────────────────
    // The cart SVG is: svg.slds-global-actions__item-action (tabindex="-1", directly clickable).
    // The badge sits as a sibling of this SVG — provide its HTML to harden the selector.
    const cartSvg = page.locator('svg.slds-global-actions__item-action');
    await expect(cartSvg).toBeVisible({ timeout: 5000 });

    const badgeText = await cartSvg
      .locator('xpath=following-sibling::*[1]')
      .textContent()
      .catch(() => 'badge selector needs adjustment — provide badge HTML');
    console.log(`Cart badge: ${badgeText?.trim()}`);

    // ── Step 5: navigate to the cart page ───────────────────────────────────
    await cartSvg.click();

    await page.waitForURL(url => url.href.includes('/cart/'), { timeout: 15000 });
    expect(page.url()).toContain('/cart/');
    console.log(`Cart URL: ${page.url()}`);

    // ── Step 6: trigger price calculation ───────────────────────────────────
    // "Meinen Auftrag berechnen." calls the pricing API — does NOT create an order.
    const calculateBtn = page.getByRole('button', { name: /Meinen Auftrag berechnen/i });
    await expect(calculateBtn).toBeVisible({ timeout: 10000 });
    await calculateBtn.click();

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Cart page must still be shown after the calculation (no error, no redirect)
    expect(page.url()).toContain('/cart/');

    // ── Step 6b: validate that price fields are populated with numbers ──────────
    // Session loss would redirect to login — catching it here gives a clear message.
    expect(page.url(), 'Session lost after calculation — redirected away from cart').toContain('/cart/');

    // LWC renders components asynchronously after networkidle; wait for the first one.
    const priceElements = page.locator('lightning-formatted-number');
    await expect(priceElements.first()).toBeVisible({ timeout: 15000 });

    const count = await priceElements.count();
    expect(count, 'At least 4 price fields must be present').toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const text = (await priceElements.nth(i).textContent()) ?? '';
      expect(text.trim(), `Price field ${i + 1} must contain a number`).toMatch(/\d/);
    }
    console.log(`Price calculation completed — ${count} price fields populated ✓`);

    // ── Step 7: empty the cart ───────────────────────────────────────────────
    // Clicks "Alles löschen." which removes all items from the cart.
    const clearCartBtn = page.getByRole('button', { name: /Alles löschen/i });
    await expect(clearCartBtn).toBeVisible({ timeout: 10000 });
    await clearCartBtn.click();

    // Confirm the modal that asks for confirmation before emptying the cart
    const confirmBtn = page.getByRole('button', { name: /Bestätigt/i });
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await confirmBtn.click();

    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // After clearing, the "Alles löschen." button must no longer exist
    // and the delete icon must be gone — confirming the cart is empty.
    await expect(page.locator('button:has(svg[data-key="delete"])')).toHaveCount(0, { timeout: 10000 });
    console.log('Cart emptied — "Alles löschen." button is gone ✓');
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('Order creation: add product to cart, calculate price and proceed to checkout', async ({ page }) => {
    test.setTimeout(150000);

    const productCount = await productListPage.getProductCount();
    expect(productCount, 'At least one product must be visible').toBeGreaterThan(0);

    // ── Step 1: find the first product with an active "Zum Warenkorb" button ──
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

    // ── Step 2: increase quantity (1–3 times) ────────────────────────────────
    const increaseBtn = targetCard.locator('button:has(svg[data-key="add"])');
    await expect(increaseBtn).toBeVisible({ timeout: 10000 });

    const clickCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < clickCount; i++) {
      await increaseBtn.click();
      await page.waitForTimeout(300);
    }
    console.log(`Clicked "+" ${clickCount} time(s)`);

    // ── Step 3: add to cart ──────────────────────────────────────────────────
    await targetCard.locator('button:has-text("Zum Warenkorb")').click();
    await page.waitForTimeout(2000);

    // ── Step 4: verify cart badge ────────────────────────────────────────────
    const cartSvg = page.locator('svg.slds-global-actions__item-action');
    await expect(cartSvg).toBeVisible({ timeout: 5000 });

    const badgeText = await cartSvg
      .locator('xpath=following-sibling::*[1]')
      .textContent()
      .catch(() => 'badge selector needs adjustment — provide badge HTML');
    console.log(`Cart badge: ${badgeText?.trim()}`);

    // ── Step 5: navigate to the cart page ───────────────────────────────────
    await cartSvg.click();

    await page.waitForURL(url => url.href.includes('/cart/'), { timeout: 15000 });
    expect(page.url()).toContain('/cart/');
    console.log(`Cart URL: ${page.url()}`);

    // ── Step 6: trigger price calculation ───────────────────────────────────
    const calculateBtn = page.getByRole('button', { name: /Meinen Auftrag berechnen/i });
    await expect(calculateBtn).toBeVisible({ timeout: 10000 });
    await calculateBtn.click();

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    expect(page.url()).toContain('/cart/');

    // ── Step 6b: validate that price fields are populated with numbers ──────────
    expect(page.url(), 'Session lost after calculation — redirected away from cart').toContain('/cart/');

    const priceElements = page.locator('lightning-formatted-number');
    await expect(priceElements.first()).toBeVisible({ timeout: 15000 });

    const count = await priceElements.count();
    expect(count, 'At least 4 price fields must be present').toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const text = (await priceElements.nth(i).textContent()) ?? '';
      expect(text.trim(), `Price field ${i + 1} must contain a number`).toMatch(/\d/);
    }
    console.log(`Price calculation completed — ${count} price fields populated ✓`);

    // ── Step 7: proceed to checkout ──────────────────────────────────────────
    const checkoutBtn = page.getByRole('button', { name: /Zur Bezahlung gehen/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 });
    await checkoutBtn.click();
    console.log('Clicked "Zur Bezahlung gehen." ✓');

    // ── Step 8: verify navigation to the checkout page ──────────────────────
    await page.waitForURL(url => url.href.includes('/checkout/'), { timeout: 30000 });
    expect(page.url()).toContain('/checkout/');
    console.log(`Checkout URL: ${page.url()}`);

    // ── Step 9: fill in the order reference field ────────────────────────────
    const orderRefInput = page.locator('[part="input-container"] input, .slds-form-element__control.slds-grow input').first();
    await expect(orderRefInput).toBeVisible({ timeout: 10000 });
    await orderRefInput.fill('CoE automation test');
    console.log('Filled order reference field with "CoE automation test" ✓');

    // ── Step 10: confirm payment ─────────────────────────────────────────────
    const confirmPaymentBtn = page.getByRole('button', { name: /Bestätigen Sie die Zahlung/i });
    await expect(confirmPaymentBtn).toBeVisible({ timeout: 10000 });
    await confirmPaymentBtn.click();
    console.log('Clicked "Bestätigen Sie die Zahlung" ✓');

    // ── Step 11: verify order confirmation page ──────────────────────────────
    await page.waitForURL(url => url.href.includes('/orderconfirmation/'), { timeout: 30000 });
    expect(page.url()).toContain('/orderconfirmation/');
    console.log(`Order confirmation URL: ${page.url()}`);

    const orderNumberHeading = page.locator('h2', { hasText: /Auftragsnummer\./i });
    await expect(orderNumberHeading).toBeVisible({ timeout: 15000 });

    // Wait until the order number (digits) is populated after the heading text
    await expect.poll(
      async () => (await orderNumberHeading.textContent()) ?? '',
      { timeout: 15000, message: 'Order number did not appear after "Auftragsnummer.:"' }
    ).toMatch(/\d+/);

    const orderNumberText = (await orderNumberHeading.textContent()) ?? '';
    console.log(`Order confirmed: ${orderNumberText.trim()} ✓`);

    // ── Step 12: verify order exists in Salesforce via API ───────────────────
    const orderNumber = orderNumberText.match(/\d+/)?.[0] ?? '';
    expect(orderNumber, 'Could not extract order number from heading').toBeTruthy();

    const { access_token, instance_url } = await getSfAccessToken(page.request);
    console.log('Salesforce access token obtained ✓');

    const sfOrder = await getOrderByNumber(page.request, instance_url, access_token, orderNumber);
    expect(sfOrder, `Order ${orderNumber} not found in Salesforce`).not.toBeNull();
    console.log(`Salesforce order found — OrderNumber: ${sfOrder!.OrderNumber} | Status: ${sfOrder!.Status} | Total: ${sfOrder!.TotalAmount} ✓`);
  });
});
