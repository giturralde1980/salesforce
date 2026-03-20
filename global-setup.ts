import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const AUTH_FILE = path.join(process.cwd(), 'auth/storageState.json');
const SESSION_TTL_HOURS = 8;

function isAuthValid(): boolean {
  if (!fs.existsSync(AUTH_FILE)) return false;
  const age = Date.now() - fs.statSync(AUTH_FILE).mtimeMs;
  return age < SESSION_TTL_HOURS * 60 * 60 * 1000;
}

export default async function globalSetup(): Promise<void> {
  if (isAuthValid()) {
    console.log('✓ Sesión válida, omitiendo login');
    return;
  }

  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto(process.env.SF_BASE_URL!);
  await page.locator('#username').fill(process.env.SF_WEB_USERNAME!);
  await page.locator('#password').fill(process.env.SF_WEB_PASSWORD!);
  await page.locator('#Login').click();

  console.log('⏳ Esperando Lightning... Si aparece verificación, completala manualmente en el browser.');
  await page.waitForURL(/\/lightning\//, { timeout: 5 * 60_000 }); // 5 min para completar verificación

  await context.storageState({ path: AUTH_FILE });
  console.log('✓ Auth guardado en', AUTH_FILE);

  await browser.close();
}
