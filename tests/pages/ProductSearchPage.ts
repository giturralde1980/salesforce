import { Page } from '@playwright/test';
import BasePage from './BasePage';

interface SearchResult {
  name: string;
  html: string;
}

interface EANSearchResult {
  found: boolean;
  expectedCode: string;
  actualCode: string | null;
  matches: boolean;
  searchMethod: string;
  error?: string;
}

interface PageStructure {
  searchInputs: number;
  buttons: (string | undefined)[];
  pageTitle: string;
  url: string;
}

export default class ProductSearchPage extends BasePage {
  readonly productSearchInput: string;
  readonly searchButton: string;
  readonly searchResults: string;
  readonly noResultsMessage: string;

  constructor(page: Page) {
    super(page);
    this.productSearchInput = 'input[placeholder*="Produktnamen"], input[placeholder*="PZN"]';
    this.searchButton = 'button:has-text("Suchen")';
    this.searchResults = '.search-results, [class*="product"], [data-testid*="product"]';
    this.noResultsMessage = 'text=Keine Ergebnisse, text=No results';
  }

  async isOnProductSearchPage(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.productSearchInput, { timeout: 5000 });
      return await this.page.isVisible(this.productSearchInput);
    } catch (error) {
      return false;
    }
  }

  async searchForProduct(productName: string): Promise<void> {
    await this.page.fill(this.productSearchInput, productName);
    console.log(`✓ Entered search term: "${productName}"`);
  }

  async clickSearch(): Promise<void> {
    try {
      await this.page.click(this.searchButton);
      console.log('✓ Clicked search button');
    } catch (error) {
      await this.page.press(this.productSearchInput, 'Enter');
      console.log('✓ Pressed Enter to search');
    }
    await this.page.waitForTimeout(2000);
  }

  async getSearchResults(): Promise<SearchResult[]> {
    const results = await this.page.evaluate(() => {
      const productElements = document.querySelectorAll('[class*="product"], [data-testid*="product"]');
      return Array.from(productElements)
        .map(el => ({
          name: el.textContent?.trim().substring(0, 100) ?? '',
          html: el.outerHTML.substring(0, 150)
        }))
        .filter(p => p.name.length > 0);
    });
    return results;
  }

  async hasSearchResults(): Promise<boolean> {
    try {
      const results = await this.getSearchResults();
      return results.length > 0;
    } catch (error) {
      return false;
    }
  }

  async getResultCount(): Promise<number> {
    const results = await this.getSearchResults();
    return results.length;
  }

  async debugPageStructure(): Promise<PageStructure> {
    const structure = await this.page.evaluate(() => {
      return {
        searchInputs: document.querySelectorAll('input[type="text"], input[placeholder*="Produkt"], input[placeholder*="PZN"]').length,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).slice(0, 5),
        pageTitle: document.title,
        url: window.location.href
      };
    });

    console.log('Page Structure:');
    console.log(JSON.stringify(structure, null, 2));

    return structure as PageStructure;
  }

  async findProductByEANCode(expectedCode: string): Promise<EANSearchResult> {
    const result = await this.page.evaluate((code) => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node: Node | null;
      while ((node = walker.nextNode()) !== null) {
        if (node.textContent?.trim() === code) {
          return {
            found: true,
            expectedCode: code,
            actualCode: node.textContent.trim(),
            matches: true,
            searchMethod: 'text-node'
          };
        }
      }

      return {
        found: false,
        expectedCode: code,
        actualCode: null,
        matches: false,
        error: 'Código no encontrado en DOM',
        searchMethod: 'text-node'
      };
    }, expectedCode);

    return result;
  }
}
