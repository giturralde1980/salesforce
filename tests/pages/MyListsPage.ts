import { Page } from '@playwright/test';

export default class MyListsPage {
  page: Page;
  readonly pageTitle: string;
  readonly productCard: string;
  readonly productTitle: string;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = 'h1.slds-text-heading_large';
    this.productCard = '.cMyLists_productCard';
    this.productTitle = '.cMyLists_product-title a';
  }

  async isOnMyListsPage(): Promise<boolean> {
    await this.page.waitForSelector(this.pageTitle, { timeout: 10000 });
    const title = await this.page.textContent(this.pageTitle);
    return (title ?? '').includes('Meine Wunschlisten');
  }

  async getFavoriteProductCount(): Promise<number> {
    await this.page.waitForSelector(this.productCard, { state: 'visible', timeout: 10000 });
    return await this.page.locator(this.productCard).count();
  }

  async getFavoriteProductTitles(): Promise<string[]> {
    await this.page.waitForSelector(this.productCard, { state: 'visible', timeout: 10000 });
    return await this.page.locator(this.productTitle).allTextContents();
  }

  async isProductInFavorites(productTitle: string): Promise<boolean> {
    const titles = await this.getFavoriteProductTitles();
    return titles.some(title => title.trim() === productTitle.trim());
  }
}
