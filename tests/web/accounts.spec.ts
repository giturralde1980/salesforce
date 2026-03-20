import { test, expect } from '@playwright/test';
import { ServiceConsolePage } from '../pages/ServiceConsolePage';
import { AccountListPage } from '../pages/AccountListPage';
import { AccountPage } from '../pages/AccountPage';
import { ContactFormPage } from '../pages/ContactFormPage';

test.describe('Accounts', () => {
  test('abrir primer account de la lista', async ({ page }) => {
    const consolePage = new ServiceConsolePage(page);
    const accountList = new AccountListPage(page);

    await consolePage.open();
    await consolePage.navigateTo('Accounts');
    await accountList.clickFirstAccount();

    await expect(page).toHaveURL(/\/Account\/.*\/view/);
  });

  test('crear nuevo contacto desde un account', async ({ page }) => {
    const consolePage  = new ServiceConsolePage(page);
    const accountList  = new AccountListPage(page);
    const accountPage  = new AccountPage(page);
    const contactForm  = new ContactFormPage(page);

    await consolePage.open();
    await consolePage.navigateTo('Accounts');
    await accountList.clickFirstAccount();
    await accountPage.clickNewContact();

    await contactForm.expectFormVisible();
    await contactForm.fillFirstName('Test');
    await contactForm.fillLastName('Automation');
    await contactForm.fillEmail('test.automation@poc.com');
    await contactForm.fillPhone('+1 555 000 0000');
    await contactForm.cancel();

    await expect(page).toHaveURL(/\/Account\/.*\/view/);
  });
});
