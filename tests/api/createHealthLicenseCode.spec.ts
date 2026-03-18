import { test, expect } from '@playwright/test';
import {
  getSfAccessToken,
  createContact,
  createHealthLicenseCode,
  getHealthLicenseCodeById,
  recordExists,
  deleteRecord,
} from './sfClient';
import 'dotenv/config';

/**
 * Full pre-registration flow:
 *   1. Use the Opella+ owner Account (SF_ACCOUNT_ID from .env)
 *   2. Create a Contact (FirstName, LastName, Email, Role__c, AccountId)
 *   3. Create a healthlicensecode__c linked to that Contact
 *   4. Verify the healthlicensecode__c record
 *   5. Cleanup: delete healthlicensecode__c, then Contact
 *
 * This mirrors the Opella+ self-registration prerequisites:
 *   Contact → HealthLicenseCode → register with (email + healthcode + account legal number)
 */
test.describe('Salesforce API - Contact + Health License Code flow', () => {
  test('Create Contact and HealthLicenseCode, verify, then delete both', async ({ request }) => {
    // Step 1: get access token
    const { access_token, instance_url } = await getSfAccessToken(request);
    expect(access_token, 'access_token must be present').toBeTruthy();
    console.log(`✓ Token obtained — instance: ${instance_url}`);

    const accountId = process.env.SF_ACCOUNT_ID!;
    expect(accountId, 'SF_ACCOUNT_ID must be set in .env').toBeTruthy();
    console.log(`✓ Account Id: ${accountId}`);

    // Step 2: create Contact associated to the Opella+ owner Account
    const timestamp = Date.now();
    const contactId = await createContact(request, instance_url, access_token, {
      FirstName: 'Playwright',
      LastName: `TestContact-${timestamp}`,
      Email: `playwright.test+${timestamp}@example.com`,
      AccountId: accountId,
      Role__c: 'owner',   // valid values: 'owner' | 'employee' | 'purchase_manager'
    });
    expect(contactId, 'Created Contact Id must be present').toBeTruthy();
    console.log(`✓ Contact created — Id: ${contactId}`);

    // Step 3: create healthlicensecode__c linked to the new Contact
    const today = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const healthCodeId = await createHealthLicenseCode(request, instance_url, access_token, {
      Contact__c: contactId,
      Name: `PW-LICENSE-${timestamp}`,
      IsActive__c: true,
      EffectiveFrom__c: today,
      EffectiveTo__c: oneYearLater,
      ExternalId__c: `playwright-${timestamp}`,
    });
    expect(healthCodeId, 'Created healthlicensecode__c Id must be present').toBeTruthy();
    console.log(`✓ healthlicensecode__c created — Id: ${healthCodeId}`);

    // Step 4: verify healthlicensecode__c record fields
    const rec = await getHealthLicenseCodeById(request, instance_url, access_token, healthCodeId);
    expect(rec, 'healthlicensecode__c must exist after creation').not.toBeNull();

    console.log('─── healthlicensecode__c details ────────────');
    console.log(`  Id             : ${rec!.Id}`);
    console.log(`  Name           : ${rec!.Name}`);
    console.log(`  Contact__c     : ${rec!.Contact__c}`);
    console.log(`  IsActive__c    : ${rec!.IsActive__c}`);
    console.log(`  EffectiveFrom  : ${rec!.EffectiveFrom__c}`);
    console.log(`  EffectiveTo    : ${rec!.EffectiveTo__c}`);
    console.log(`  ExternalId__c  : ${rec!.ExternalId__c}`);
    console.log(`  CreatedDate    : ${rec!.CreatedDate}`);
    console.log('─────────────────────────────────────────────');

    expect(rec!.Contact__c).toBe(contactId);
    expect(rec!.IsActive__c).toBe(true);
    expect(rec!.EffectiveFrom__c).toBe(today);

    // Step 5: cleanup — delete healthlicensecode__c first (child), then Contact (parent)
    await deleteRecord(request, instance_url, access_token, 'healthlicensecode__c', healthCodeId);
    console.log(`✓ healthlicensecode__c deleted`);

    await deleteRecord(request, instance_url, access_token, 'Contact', contactId);
    console.log(`✓ Contact deleted`);

    // Step 6: verify both records are gone
    const healthCodeExists = await recordExists(request, instance_url, access_token, 'healthlicensecode__c', healthCodeId);
    expect(healthCodeExists, 'healthlicensecode__c must not exist after deletion').toBe(false);

    const contactExists = await recordExists(request, instance_url, access_token, 'Contact', contactId);
    expect(contactExists, 'Contact must not exist after deletion').toBe(false);

    console.log(`✓ Both records deleted and verified`);
  });
});
