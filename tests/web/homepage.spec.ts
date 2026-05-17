import { test, expect } from '@playwright/test';
import { ServiceConsolePage } from '../pages/ServiceConsolePage';

test.describe('Home Page', () => {
  test('buscar producto Bicicleta con global search', async ({ page }) => {
    const consolePage = new ServiceConsolePage(page);

    await consolePage.open();
    await consolePage.globalSearch('Bicicleta');

    await expect(page.locator('body')).toContainText('Bicicleta');
  });
});
