import { test, expect } from '@playwright/test';
import {
  getSfAccessToken,
  getOrderByNumber,
  getStandardPricebookId,
  createOrder,
  getOrderById,
  getOrderItems,
  recordExists,
  deleteRecord,
} from './sfClient';
import 'dotenv/config';

test.describe('Salesforce API - Order creation', () => {
  test('Create an order via API and verify it exists', async ({ request }) => {
    // Step 1: get access token
    const { access_token, instance_url } = await getSfAccessToken(request);
    expect(access_token, 'access_token must be present').toBeTruthy();
    console.log(`✓ Token obtained — instance: ${instance_url}`);

    // Step 2: fetch an existing order to reuse its AccountId
    const existingOrder = await getOrderByNumber(request, instance_url, access_token, process.env.ORDER!);
    expect(existingOrder, `Reference order ${process.env.ORDER} not found`).not.toBeNull();
    const { AccountId } = existingOrder!;
    expect(AccountId, 'AccountId must be present on reference order').toBeTruthy();
    console.log(`✓ Reference order found — AccountId: ${AccountId}`);

    // Step 3: get the standard Pricebook Id
    const Pricebook2Id = await getStandardPricebookId(request, instance_url, access_token);
    console.log(`✓ Standard Pricebook found — Id: ${Pricebook2Id}`);

    // Step 4: create a new order
    const today = new Date().toISOString().split('T')[0];
    const createdId = await createOrder(request, instance_url, access_token, {
      AccountId: AccountId!,
      Pricebook2Id,
      EffectiveDate: today,
      Status: 'Draft',
    });
    expect(createdId, 'Created order Id must be present').toBeTruthy();
    console.log(`✓ Order created — Id: ${createdId}`);

    // Step 5: verify order details
    const order = await getOrderById(request, instance_url, access_token, createdId);
    expect(order, 'Order must exist after creation').not.toBeNull();
    console.log('─── Order details ───────────────────────────');
    console.log(`  OrderNumber  : ${order!.OrderNumber}`);
    console.log(`  Status       : ${order!.Status}`);
    console.log(`  EffectiveDate: ${order!.EffectiveDate}`);
    console.log(`  CreatedDate  : ${order!.CreatedDate}`);
    console.log(`  CreatedBy    : ${order!.CreatedBy?.Name}`);
    console.log(`  Account      : ${order!.Account?.Name}`);
    console.log(`  TotalAmount  : ${order!.TotalAmount ?? 'n/a'}`);

    // Step 5b: verify order items (may be empty for a fresh Draft order)
    const items = await getOrderItems(request, instance_url, access_token, createdId);
    console.log(`  OrderItems   : ${items.length} item(s)`);
    for (const item of items) {
      console.log(`    - ${item.Product2?.Name ?? 'unknown'} | qty: ${item.Quantity} | price: ${item.UnitPrice}`);
    }
    console.log('─────────────────────────────────────────────');

    expect(order!.Status).toBe('Draft');
    expect(order!.EffectiveDate).toBe(today);

    // Step 6: delete the created order
    await deleteRecord(request, instance_url, access_token, 'Order', createdId);
    console.log(`✓ Order deleted`);

    // Step 7: verify deletion
    const exists = await recordExists(request, instance_url, access_token, 'Order', createdId);
    expect(exists, 'Order must not exist after deletion').toBe(false);
    console.log(`✓ Deletion verified — order no longer exists in Salesforce`);
  });
});
