import { APIRequestContext } from '@playwright/test';

// ─── Response / Record interfaces ────────────────────────────────────────────

export interface SfTokenResponse {
  access_token: string;
  instance_url: string;
}

export interface SfQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

export interface SfAccountRecord {
  Id: string;
  Name: string;
}

export interface SfOrderRecord {
  Id: string;
  OrderNumber: string;
  Status: string;
  TotalAmount: number | null;
  AccountId?: string;
  Pricebook2Id?: string;
}

export interface SfOrderDetailRecord {
  Id: string;
  OrderNumber: string;
  Status: string;
  EffectiveDate: string;
  CreatedDate: string;
  CreatedBy?: { Name: string };
  Account?: { Name: string };
  TotalAmount: number | null;
}

export interface SfOrderItemRecord {
  Id: string;
  Quantity: number;
  UnitPrice: number;
  Product2?: { Name: string };
}

export interface SfHealthLicenseRecord {
  Id: string;
  Name: string;
  Contact__c: string;
  IsActive__c: boolean;
  EffectiveFrom__c: string;
  EffectiveTo__c: string;
  ExternalId__c?: string;
  CreatedDate: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Obtains a Salesforce access token using the client_credentials OAuth flow.
 * Required env vars: SF_CLIENT_ID, SF_CLIENT_SECRET
 */
export async function getSfAccessToken(request: APIRequestContext): Promise<SfTokenResponse> {
  const params = new URLSearchParams();
  params.append('grant_type',    'client_credentials');
  params.append('client_id',     process.env.SF_CLIENT_ID!);
  params.append('client_secret', process.env.SF_CLIENT_SECRET!);

  const res = await request.post(
    'https://sanofi-chcrm-eu--uat1.sandbox.my.salesforce.com/services/oauth2/token',
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: params.toString(),
    }
  );

  if (res.status() !== 200) {
    const body = await res.text();
    throw new Error(`Salesforce OAuth failed — expected 200, got ${res.status()}: ${body}`);
  }

  return res.json() as Promise<SfTokenResponse>;
}

// ─── Generic query ────────────────────────────────────────────────────────────

/**
 * Executes any SOQL query and returns the full query result.
 */
export async function soqlQuery<T>(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  soql: string
): Promise<SfQueryResult<T>> {
  const res = await request.get(
    `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (res.status() !== 200) {
    const body = await res.text();
    throw new Error(`SOQL query failed — expected 200, got ${res.status()}: ${body}`);
  }

  return res.json() as Promise<SfQueryResult<T>>;
}

/**
 * Returns true if a record with the given Id still exists in the given SObject.
 */
export async function recordExists(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  sobject: string,
  id: string
): Promise<boolean> {
  const result = await soqlQuery<{ Id: string }>(
    request, instanceUrl, accessToken,
    `SELECT Id FROM ${sobject} WHERE Id = '${id}'`
  );
  return result.totalSize > 0;
}

// ─── Pricebook ────────────────────────────────────────────────────────────────

/**
 * Returns the Id of the standard Pricebook2.
 */
export async function getStandardPricebookId(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string
): Promise<string> {
  const result = await soqlQuery<{ Id: string }>(
    request, instanceUrl, accessToken,
    `SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1`
  );

  if (result.totalSize === 0) throw new Error('Standard Pricebook not found');
  return result.records[0].Id;
}

// ─── Order ────────────────────────────────────────────────────────────────────

/**
 * Queries Salesforce for an Order by its OrderNumber including AccountId and Pricebook2Id.
 */
export async function getOrderByNumber(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  orderNumber: string
): Promise<SfOrderRecord | null> {
  const result = await soqlQuery<SfOrderRecord>(
    request, instanceUrl, accessToken,
    `SELECT Id, OrderNumber, Status, TotalAmount, AccountId, Pricebook2Id FROM Order WHERE OrderNumber = '${orderNumber}'`
  );
  return result.totalSize > 0 ? result.records[0] : null;
}

/**
 * Returns full Order details (with CreatedBy and Account relationship fields) by Id.
 */
export async function getOrderById(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  orderId: string
): Promise<SfOrderDetailRecord | null> {
  const result = await soqlQuery<SfOrderDetailRecord>(
    request, instanceUrl, accessToken,
    `SELECT Id, OrderNumber, Status, EffectiveDate, CreatedDate, CreatedBy.Name, Account.Name, TotalAmount
     FROM Order WHERE Id = '${orderId}'`
  );
  return result.totalSize > 0 ? result.records[0] : null;
}

/**
 * Returns all OrderItems for a given Order Id.
 */
export async function getOrderItems(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  orderId: string
): Promise<SfOrderItemRecord[]> {
  const result = await soqlQuery<SfOrderItemRecord>(
    request, instanceUrl, accessToken,
    `SELECT Id, Quantity, UnitPrice, Product2.Name FROM OrderItem WHERE OrderId = '${orderId}'`
  );
  return result.records;
}

/**
 * Creates a new Order in Salesforce.
 * Returns the Id of the created record.
 */
export async function createOrder(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  payload: { AccountId: string; Pricebook2Id: string; EffectiveDate: string; Status: string }
): Promise<string> {
  const res = await request.post(
    `${instanceUrl}/services/data/v59.0/sobjects/Order`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    }
  );

  if (res.status() !== 201) {
    const body = await res.text();
    throw new Error(`Create Order failed — expected 201, got ${res.status()}: ${body}`);
  }

  const json: { id: string } = await res.json();
  return json.id;
}

// ─── Contact ──────────────────────────────────────────────────────────────────

/**
 * Creates a new Contact in Salesforce associated to an Account.
 * Role__c is a custom picklist: 'owner' | 'employee' | 'purchase_manager'
 * Returns the Id of the created record.
 */
export async function createContact(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  payload: {
    FirstName: string;
    LastName: string;
    Email: string;
    AccountId: string;
    Role__c?: string;
  }
): Promise<string> {
  const res = await request.post(
    `${instanceUrl}/services/data/v59.0/sobjects/Contact`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    }
  );

  if (res.status() !== 201) {
    const body = await res.text();
    throw new Error(`Create Contact failed — expected 201, got ${res.status()}: ${body}`);
  }

  const json: { id: string } = await res.json();
  return json.id;
}

// ─── Health License Code ──────────────────────────────────────────────────────

/**
 * Creates a new healthlicensecode__c record in Salesforce linked to a Contact.
 * Returns the Id of the created record.
 */
export async function createHealthLicenseCode(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  payload: {
    Contact__c: string;
    Name: string;
    IsActive__c: boolean;
    EffectiveFrom__c: string;
    EffectiveTo__c: string;
    ExternalId__c?: string;
  }
): Promise<string> {
  const res = await request.post(
    `${instanceUrl}/services/data/v59.0/sobjects/healthlicensecode__c`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    }
  );

  if (res.status() !== 201) {
    const body = await res.text();
    throw new Error(`Create healthlicensecode__c failed — expected 201, got ${res.status()}: ${body}`);
  }

  const json: { id: string } = await res.json();
  return json.id;
}

/**
 * Returns a healthlicensecode__c record by Id, or null if not found.
 */
export async function getHealthLicenseCodeById(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  id: string
): Promise<SfHealthLicenseRecord | null> {
  const result = await soqlQuery<SfHealthLicenseRecord>(
    request, instanceUrl, accessToken,
    `SELECT Id, Name, Contact__c, IsActive__c, EffectiveFrom__c, EffectiveTo__c, ExternalId__c, CreatedDate
     FROM healthlicensecode__c WHERE Id = '${id}'`
  );
  return result.totalSize > 0 ? result.records[0] : null;
}

// ─── Generic delete ───────────────────────────────────────────────────────────

/**
 * Deletes a Salesforce record by SObject type and Id.
 */
export async function deleteRecord(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  sobject: string,
  id: string
): Promise<void> {
  const res = await request.delete(
    `${instanceUrl}/services/data/v59.0/sobjects/${sobject}/${id}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (res.status() !== 204) {
    const body = await res.text();
    throw new Error(`Delete ${sobject} failed — expected 204, got ${res.status()}: ${body}`);
  }
}
