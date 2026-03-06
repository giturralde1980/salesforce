import { test, expect } from '@playwright/test';
import HomePage from '../../../pages/HomePage';
import LoginPage from '../../../pages/LoginPage';
import MyCockpitPage from '../../../pages/MyCockpitPage';
import MENU_ITEMS from '../../../fixtures/menuItems';
import 'dotenv/config';

test.describe('Role-Based Access Tests', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let myCockpitPage: MyCockpitPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    myCockpitPage = new MyCockpitPage(page);
    await homePage.navigate();
  });

  test('Role: Owner - All expected menu data-names are visible', async ({ page }) => {

    // Data-names esperados para OWNER (7 items visibles)
    const expectedDataNames = MENU_ITEMS.owner;

    // Hacer login
    expect(await homePage.isOnHomePage()).toBeTruthy();

    await homePage.clickEinloggen();
    expect(await loginPage.isOnLoginPage()).toBeTruthy();

    await loginPage.login(
      process.env.TEST_EMAIL_OWNER!,
      process.env.TEST_PASSWORD_OWNER!
    );

    // Ir a my-cockpit
    await page.waitForTimeout(2000);

    await homePage.clickMeinCockpit();

    try {
      await page.waitForSelector('.slds-nav-vertical__section', { timeout: 15000 });
    } catch (error) {
      throw error;
    }

    await page.waitForTimeout(1000);

    // Obtener todos los items
    const sectionData = await myCockpitPage.getAllSectionItemsData();


    expect(sectionData.found).toBeTruthy();
    expect(sectionData.items.length).toBeGreaterThan(0);

    // Log visible items for debugging
    sectionData.items.forEach(item => {
    });

    // Verificar que están presentes todos los items esperados
    for (const expectedName of expectedDataNames) {
      const item = sectionData.items.find(i => i.dataName === expectedName);
      expect(item, `Data-name "${expectedName}" debe estar visible`).toBeDefined();
      if (item) {
      }
    }

  });

  test.skip('Role: Employee Other - Limited set of data-names is visible', async ({ page }) => {

    // Data-names esperados para EMPLEADO OTHER (solo 2 items visibles)
    const expectedDataNames = MENU_ITEMS.empleadoOther;

    expect(await homePage.isOnHomePage()).toBeTruthy();

    await homePage.clickEinloggen();
    expect(await loginPage.isOnLoginPage()).toBeTruthy();

    await loginPage.login(
      process.env.TEST_EMAIL_OWNER!,
      process.env.TEST_PASSWORD_OWNER!
    );

    // Ir a my-cockpit
    await page.waitForTimeout(2000);

    await homePage.clickMeinCockpit();

    try {
      await page.waitForSelector('.slds-nav-vertical__section', { timeout: 15000 });
    } catch (error) {
      throw error;
    }

    await page.waitForTimeout(1000);

    // Obtener todos los items
    const sectionData = await myCockpitPage.getAllSectionItemsData();


    expect(sectionData.found).toBeTruthy();
    expect(sectionData.items.length).toBeGreaterThan(0);

    const visibleDataNames = sectionData.items.map(item => item.dataName);

    // Log visible items for debugging
    sectionData.items.forEach(item => {
    });

    // Verificar que ve exactamente los items esperados
    for (const expectedName of expectedDataNames) {
      expect(visibleDataNames).toContain(expectedName);
    }

    // Verificar que NO ve otros items que solo Owner debería ver
    const shouldNotSee = MENU_ITEMS.ownerOnlyItems;
    for (const itemName of shouldNotSee) {
      const isVisible = visibleDataNames.includes(itemName);
      expect(isVisible).toBeFalsy();
    }

  });

  test.skip('Role: Employee Purchase Manager - Role-specific data-names are visible', async ({ page }) => {

    // Data-names esperados para EMPLEADO PURCHASE MANAGER
    // TODO: Definir qué items debe ver este rol
    const expectedDataNames = [
      'myOrders',
      'myInvoices',
      'profile',
      'myEconsentPreferences'
    ];

    // Hacer login
    expect(await homePage.isOnHomePage()).toBeTruthy();
    await homePage.clickEinloggen();
    expect(await loginPage.isOnLoginPage()).toBeTruthy();

    await loginPage.login(
      process.env.TEST_EMAIL_OWNER!,
      process.env.TEST_PASSWORD_OWNER!
    );

    // Ir a my-cockpit
    await page.waitForTimeout(2000);
    await homePage.clickMeinCockpit();

    // Esperar a que cargue
    await page.waitForSelector('.slds-nav-vertical__section', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Obtener todos los items
    const sectionData = await myCockpitPage.getAllSectionItemsData();
    const visibleItems = sectionData.items.filter(item => item.visible);

    visibleItems.forEach(item => {
    });

    // Verificar que ve exactamente los items esperados
    const visibleDataNames = visibleItems.map(item => item.dataName);

    for (const expectedName of expectedDataNames) {
      expect(visibleDataNames).toContain(expectedName);
    }

  });
});
