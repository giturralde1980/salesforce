import { test } from '@playwright/test';
import { ServiceConsolePage } from '../pages/ServiceConsolePage';
import { CasePage } from '../pages/CasePage';

test.describe('Cases', () => {
  test('crear nuevo caso', async ({ page }) => {
    const console = new ServiceConsolePage(page);
    const casePage = new CasePage(page);

    await console.open();
    await console.navigateTo('Cases');
    await console.clickNew();

    await casePage.selectCaseOrigin('Web');
    await casePage.fillSubject('test automation');
    await casePage.fillDescription('Estamos haciendo una POC con Playwright y creación de casos.');
    await casePage.save();
    await casePage.expectSaved();
  });
});
