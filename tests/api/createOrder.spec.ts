import { test, expect } from '@playwright/test';
import { getSfAccessToken, getOrderByNumber, createOrder, deleteRecord } from './sfClient';
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

    // Step 2b: get the standard Pricebook Id from Salesforce
    const pbRes = await request.get(
      `${instance_url}/services/data/v59.0/query?q=${encodeURIComponent(
        `SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1`
      )}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    expect(pbRes.status(), 'GET pricebook must return 200').toBe(200);
    const pbResult = await pbRes.json();
    expect(pbResult.totalSize, 'Standard Pricebook must exist').toBeGreaterThan(0);
    const Pricebook2Id: string = pbResult.records[0].Id;
    console.log(`✓ Standard Pricebook found — Id: ${Pricebook2Id}`);

    // Step 3: create a new order
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const createdId = await createOrder(request, instance_url, access_token, {
      AccountId: AccountId!,
      Pricebook2Id: Pricebook2Id!,
      EffectiveDate: today,
      Status: 'Draft',
    });
    expect(createdId, 'Created order Id must be present').toBeTruthy();
    console.log(`✓ Order created — Id: ${createdId}`);

    // Step 4: query the created order with full details
    const soqlRes = await request.get(
      `${instance_url}/services/data/v59.0/query?q=${encodeURIComponent(
        `SELECT Id, OrderNumber, Status, EffectiveDate, CreatedDate, CreatedBy.Name, Account.Name, TotalAmount
         FROM Order WHERE Id = '${createdId}'`
      )}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    expect(soqlRes.status(), 'GET order details must return 200').toBe(200);
    const result = await soqlRes.json();
    expect(result.totalSize).toBe(1);
    const order = result.records[0];
    console.log('─── Order details ───────────────────────────');
    console.log(`  OrderNumber  : ${order.OrderNumber}`);
    console.log(`  Status       : ${order.Status}`);
    console.log(`  EffectiveDate: ${order.EffectiveDate}`);
    console.log(`  CreatedDate  : ${order.CreatedDate}`);
    console.log(`  CreatedBy    : ${order.CreatedBy?.Name}`);
    console.log(`  Account      : ${order.Account?.Name}`);
    console.log(`  TotalAmount  : ${order.TotalAmount ?? 'n/a'}`);

    // Step 4b: query OrderItems (may be empty for a fresh Draft order)
    const itemsRes = await request.get(
      `${instance_url}/services/data/v59.0/query?q=${encodeURIComponent(
        `SELECT Id, Quantity, UnitPrice, Product2.Name FROM OrderItem WHERE OrderId = '${createdId}'`
      )}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    expect(itemsRes.status(), 'GET order items must return 200').toBe(200);
    const items = await itemsRes.json();
    console.log(`  OrderItems   : ${items.totalSize} item(s)`);
    for (const item of items.records) {
      console.log(`    - ${item.Product2?.Name ?? 'unknown'} | qty: ${item.Quantity} | price: ${item.UnitPrice}`);
    }
    console.log('─────────────────────────────────────────────');

    // Step 5: delete the created order
    await deleteRecord(request, instance_url, access_token, 'Order', createdId);
    console.log(`✓ Order deleted`);

    // Step 6: verify the order no longer exists
    const deletedRes = await request.get(
      `${instance_url}/services/data/v59.0/query?q=${encodeURIComponent(
        `SELECT Id FROM Order WHERE Id = '${createdId}'`
      )}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    expect(deletedRes.status(), 'GET deleted order must return 200').toBe(200);
    const deletedResult = await deletedRes.json();
    expect(deletedResult.totalSize, 'Order must not exist after deletion').toBe(0);
    console.log(`✓ Deletion verified — order no longer exists in Salesforce`);
  });
});
