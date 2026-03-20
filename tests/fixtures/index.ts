import { test as base, Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * Fixture que provee una página ya autenticada en Salesforce.
 * La sesión viene del storageState guardado en global-setup.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto(`${process.env.SF_BASE_URL}/lightning/page/home`);
    await page.waitForLoadState('networkidle');
    await use(page);
  },
});

export { expect } from '@playwright/test';
