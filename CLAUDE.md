# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Playwright E2E test suite for a Sanofi B2B e-commerce platform running on Salesforce. Tests target the SIT1 environment with German locale (de-DE) and use Microsoft Edge browser.

## Commands

```bash
# Run all tests
npx playwright test

# Run tests in headed mode (visible browser)
npm run test:headed

# Run with debugger attached
npm run test:debug

# Run in interactive UI mode
npm run test:ui

# Run a single test file
npx playwright test login.spec.js
npx playwright test productList.spec.js --headed

# Run tests matching a pattern
npx playwright test -g "Usuario puede hacer login"

# View HTML report from last run
npm run test:report
```

## Architecture

### Page Object Model (POM)

Tests use the Page Object Model pattern with all page objects inheriting from `BasePage`:

```
tests/
├── e2e/           # Test specs (.spec.js files)
├── pages/         # Page Object classes
├── fixtures/      # Test data (e.g., role-based menu items)
└── utils/         # Helper functions
```

**Page Objects:**
- `BasePage` - Base class with `navigate()`, `waitForPageLoad()`, `takeScreenshot()`
- `HomePage` - Landing page with login navigation
- `LoginPage` - Authentication form
- `ProductListPage` - Product catalog with wishlist/cart functionality (most complex)
- `ProductSearchPage` - Product search
- `MyCockpitPage` - User dashboard and menu navigation
- `MyListsPage` - Favorites/wishlist display
- `ForgotPasswordPage`, `SelfRegisterPage` - Auth flows

### Test Pattern

All tests follow this structure:
```javascript
const { test, expect } = require('@playwright/test');
const HomePage = require('../pages/HomePage');

test.describe('Feature Tests', () => {
  let homePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate();
  });

  test('test case name', async ({ page }) => {
    // Test implementation
  });
});
```

### Environment Configuration

Required `.env` variables:
- `BASE_URL` - Target application URL
- `TEST_EMAIL_OWNER` / `TEST_PASSWORD` - Primary test user credentials
- Role-specific credentials for permission testing

### Configuration Notes

- Tests run sequentially (`workers: 1`, `fullyParallel: false`)
- Screenshots captured on failure
- Video recorded on failure
- Trace captured on first retry
- CI retries tests 2 times on failure

## GitHub Copilot Agents

The repository includes three Copilot agents in `.github/agents/`:

- **playwright-test-planner** - Creates comprehensive test plans by exploring the application
- **playwright-test-generator** - Generates Playwright tests from test plans using MCP tools
- **playwright-test-healer** - Debugs and fixes failing tests

These agents use the Playwright MCP server (`npx playwright run-test-mcp-server`).

## Code Conventions

- JavaScript (not TypeScript), ES2024 syntax with CommonJS modules
- Page objects use class-based inheritance from `BasePage`
- Selectors defined as class properties in constructors
- Test comments and some variable names are in Spanish
- Use `data-name` attributes for menu item selectors
- Login flows wait for navigation with `waitForNavigation({ waitUntil: 'networkidle' })`
