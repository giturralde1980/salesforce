import { chromium } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default async function globalSetup(): Promise<void> {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  await page.goto(process.env.BASE_URL!);

  try {
    await page.locator('#onetrust-accept-btn-handler').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#onetrust-accept-btn-handler').click();
  } catch {
    // Banner de cookies no apareció
  }

  await page.context().storageState({ path: 'auth/cookies.json' });
  await browser.close();
}
