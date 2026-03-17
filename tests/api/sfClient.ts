import { APIRequestContext } from '@playwright/test';

export interface SfTokenResponse {
  access_token: string;
  instance_url: string;
}

export interface SfOrderRecord {
  Id: string;
  OrderNumber: string;
  Status: string;
  TotalAmount: number | null;
  AccountId?: string;
  Pricebook2Id?: string;
}

export interface SfQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

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

/**
 * Queries Salesforce for an Order by its OrderNumber including AccountId and Pricebook2Id.
 */
export async function getOrderByNumber(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  orderNumber: string
): Promise<SfOrderRecord | null> {
  const soql = `SELECT Id, OrderNumber, Status, TotalAmount, AccountId, Pricebook2Id FROM Order WHERE OrderNumber = '${orderNumber}'`;
  const res = await request.get(
    `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (res.status() !== 200) {
    const body = await res.text();
    throw new Error(`Salesforce query failed — expected 200, got ${res.status()}: ${body}`);
  }

  const result: SfQueryResult<SfOrderRecord> = await res.json();
  return result.totalSize > 0 ? result.records[0] : null;
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
