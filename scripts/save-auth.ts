/**
 * Script one-time: abre el browser, hace login manual y guarda el storageState.
 * Ejecutar con: npx ts-node scripts/save-auth.ts
 */
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const authDir = path.join(process.cwd(), 'auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto(`${process.env.SF_BASE_URL}`);

  console.log('\n================================================');
  console.log('  Haz login manualmente en el browser.');
  console.log('  Completa la verificación por email si aparece.');
  console.log('  Espera a estar en Lightning y pulsa ENTER aquí.');
  console.log('================================================\n');

  await new Promise<void>(resolve => {
    process.stdin.once('data', () => resolve());
  });

  await context.storageState({ path: 'auth/storageState.json' });
  console.log('✓ Auth state guardado en auth/storageState.json');

  await browser.close();
  process.exit(0);
})();
