import { test, expect, BrowserContext, Page } from '@playwright/test';
import HomePage from '../../../../pages/HomePage';
import LoginPage from '../../../../pages/LoginPage';
import MyCasesPage from '../../../../pages/MyCasesPage';
import 'dotenv/config';

// Cases / Kundenservice section is only visible to users with Owner role.
// Single login/logout via beforeAll/afterAll — no per-test auth overhead.
test.describe.serial('My Cases', () => {
  let context: BrowserContext;
  let sharedPage: Page;
  let homePage: HomePage;
  let loginPage: LoginPage;
  let myCasesPage: MyCasesPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      viewport: { width: 1920, height: 1080 },
    });
    sharedPage = await context.newPage();

    homePage    = new HomePage(sharedPage);
    loginPage   = new LoginPage(sharedPage);
    myCasesPage = new MyCasesPage(sharedPage);

    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(process.env.TEST_EMAIL_OWNER!, process.env.TEST_PASSWORD_OWNER!);
    await expect(sharedPage.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 35000 });
  });

  test.afterAll(async () => {
    await homePage.navigate();
    await homePage.logout();
    await context.close();
  });

  test.beforeEach(async () => {
    await homePage.clickMeinCockpit();
    await myCasesPage.navigateToCases();
  });

  test.afterEach(async () => {
    // Hard navigate to base URL to force-close any open SLDS modals
    await homePage.navigate();
  });

  // ── Tests ─────────────────────────────────────────────────────────────────

  test('should display the Create Case button', async () => {
    const isVisible = await myCasesPage.isCreateCaseButtonVisible();
    expect(isVisible).toBe(true);
  });

  test('should open case creation modal when clicking Create Case', async () => {
    await myCasesPage.clickCreateCase();
    const isModalVisible = await myCasesPage.isCaseCreationModalVisible();
    expect(isModalVisible).toBe(true);
    console.log('✓ Case creation modal opened');
  });

  test.skip('should create a new case', async () => {
    await myCasesPage.clickCreateCase();
    await myCasesPage.submitCaseForm(
      'Claim',
      'test automation - do not process',
      'Automated test case created by Playwright. Please ignore.'
    );
    // Modal should close after successful submission
    await expect(sharedPage.locator(myCasesPage.caseCreationModal))
      .not.toBeVisible({ timeout: 15000 });
    console.log('✓ Case created successfully');
  });
});
