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
}

export interface SfQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

/**
 * Obtains a Salesforce access token using the username-password OAuth flow.
 * Required env vars: SF_LOGIN_URL, SF_CLIENT_ID, SF_CLIENT_SECRET, SF_API_USERNAME, SF_API_PASSWORD
 */
export async function getSfAccessToken(request: APIRequestContext): Promise<SfTokenResponse> {
  const res = await request.post(`${process.env.SF_LOGIN_URL}/services/oauth2/token`, {
    form: {
      grant_type:    'client_credentials',
      client_id:     process.env.SF_CLIENT_ID!,
      client_secret: process.env.SF_CLIENT_SECRET!,
    },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Salesforce OAuth failed (${res.status()}): ${body}`);
  }

  return res.json() as Promise<SfTokenResponse>;
}

/**
 * Queries Salesforce for an Order by its OrderNumber.
 * Returns the first matching record, or null if not found.
 */
export async function getOrderByNumber(
  request: APIRequestContext,
  instanceUrl: string,
  accessToken: string,
  orderNumber: string
): Promise<SfOrderRecord | null> {
  const soql = `SELECT Id, OrderNumber, Status, TotalAmount FROM Order WHERE OrderNumber = '${orderNumber}'`;
  const res = await request.get(
    `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Salesforce query failed (${res.status()}): ${body}`);
  }

  const result: SfQueryResult<SfOrderRecord> = await res.json();
  return result.totalSize > 0 ? result.records[0] : null;
}
