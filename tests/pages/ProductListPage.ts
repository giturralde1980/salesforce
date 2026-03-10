// tests/pages/ProductListPage.ts - VERSIÓN CON FIX DE NAVEGACIÓN
import { Page } from '@playwright/test';

interface ProductInfo {
  index: number;
  title: string;
  ean: string;
  inWishlist: boolean;
  tags: string[];
}

export default class ProductListPage {
  protected page: Page;
  readonly productCardsContainer: string;
  readonly productCard: string;
  readonly productTitle: string;
  readonly productEanCode: string;
  readonly wishlistButton: string;
  readonly wishlistIcon: string;
  readonly addToCartButton: string;
  readonly quantityInput: string;
  readonly productTag: string;
  readonly wunschlisteButton: string;
  readonly sortDropdown: string;
  readonly sortDropdownItem: string;

  constructor(page: Page) {
    this.page = page;

    // Selectores principales
    this.productCardsContainer = 'c-plp-products-container';
    this.productCard = 'c-plp-product-card';
    this.productTitle = '.b2b-product-title';
    this.productEanCode = 'c-plp-ean-code span';
    this.wishlistButton = '.b2b-wishlist-button';
    this.wishlistIcon = 'c-b2b-wish-list';
    this.addToCartButton = '.b2b-add-to-cart-button';
    this.quantityInput = '.b2b-quantity-field';
    this.productTag = '.b2b-flag';
    this.wunschlisteButton = '.slds-button.slds-button_neutral.b2b-buttons';
    this.sortDropdown = 'button.b2b-buttons[aria-haspopup="true"]';
    this.sortDropdownItem = 'li.slds-dropdown__item[data-rule]';
  }

  /**
   * Espera a que los productos se carguen completamente
   * MEJORADO: Con verificación de que no estamos en login
   */
  async waitForProductsToLoad(): Promise<void> {
    // Verificar que no estamos en página de login
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login/')) {
      throw new Error('Session lost - currently on login page. Cannot load products.');
    }

    await this.page.waitForSelector(this.productCard, {
      state: 'visible',
      timeout: 15000
    });
    // Esperar un poco más para asegurar que todos los productos se renderizan
    await this.page.waitForTimeout(1000);
  }

  /**
   * Obtiene el número total de productos visibles
   */
  async getProductCount(): Promise<number> {
    await this.waitForProductsToLoad();
    const products = await this.page.locator(this.productCard).count();
    return products;
  }

  /**
   * Obtiene todos los títulos de productos
   */
  async getAllProductTitles(): Promise<string[]> {
    await this.waitForProductsToLoad();
    const titles = await this.page.locator(this.productTitle).allTextContents();
    return titles;
  }

  /**
   * Obtiene el título de un producto específico por índice (0-based)
   */
  async getProductTitle(index: number): Promise<string> {
    await this.waitForProductsToLoad();
    const title = await this.page.locator(this.productTitle).nth(index).textContent();
    return (title ?? '').trim();
  }

  /**
   * Obtiene el código EAN de un producto específico por índice
   */
  async getProductEAN(index: number): Promise<string> {
    await this.waitForProductsToLoad();
    const ean = await this.page.locator(this.productEanCode).nth(index).textContent();
    return (ean ?? '').trim();
  }

  /**
   * Click en el botón wishlist de un producto específico por índice
   * MEJORADO: Con prevención de navegación y mejor manejo
   */
  async clickWishlistByIndex(index: number): Promise<void> {
    await this.waitForProductsToLoad();
    console.log(`Clicking wishlist button for product at index ${index}`);

    // Obtener el producto específico
    const productCard = this.page.locator(this.productCard).nth(index);

    // Obtener el botón wishlist dentro de ese producto
    const wishlistBtn = productCard.locator(this.wishlistButton);

    // Hacer scroll al elemento para asegurar que es visible
    await wishlistBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);

    // CRÍTICO: Prevenir navegación si el botón es un link
    await wishlistBtn.evaluate((btn: HTMLElement) => {
      // Si tiene href, removerlo temporalmente
      const href = btn.getAttribute('href');
      if (href && href !== '#') {
        console.log('⚠️  Removing href to prevent navigation:', href);
        btn.dataset['originalHref'] = href;
        btn.removeAttribute('href');
      }

      // Agregar preventDefault en el onclick
      const originalOnClick = btn.onclick;
      btn.onclick = function(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (originalOnClick) {
          originalOnClick.call(this, e);
        }
      };
    });

    // Click en el botón (sin navegación)
    await wishlistBtn.click({ force: false });

    console.log('  ✓ Wishlist button clicked');

    // Esperar la animación/actualización
    await this.page.waitForTimeout(1500);

    // Verificar que no hubo navegación
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login/')) {
      throw new Error('Session lost after wishlist click - redirected to login');
    }
  }

  /**
   * Click en el wishlist del primer producto
   */
  async clickFirstProductWishlist(): Promise<void> {
    await this.clickWishlistByIndex(0);
  }

  async clickWunschlistenButton(): Promise<void> {
    await this.page.click(this.wunschlisteButton);
  }

  /**
   * Click en el wishlist de un producto por su nombre
   */
  async clickWishlistByProductName(productName: string): Promise<void> {
    await this.waitForProductsToLoad();

    // Encontrar el índice del producto con ese nombre
    const titles = await this.getAllProductTitles();
    const index = titles.findIndex(title => title.includes(productName));

    if (index === -1) {
      throw new Error(`Product with name "${productName}" not found`);
    }

    console.log(`Found product "${productName}" at index ${index}`);
    await this.clickWishlistByIndex(index);
  }

  /**
   * Verifica si el SVG del wishlist está "lleno" (filled)
   * MEJORADO: Con verificación de sesión
   */
  async isProductInWishlist(index: number): Promise<boolean> {
    // Verificar que no estamos en login
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login/')) {
      throw new Error('Cannot check wishlist status - session lost, on login page');
    }

    await this.waitForProductsToLoad();
    const productCard = this.page.locator(this.productCard).nth(index);
    const wishlistBtn = productCard.locator(this.wishlistButton);

    try {
      // Estrategia 1: Buscar SVG path con fill
      const svgPath = wishlistBtn.locator('svg path').first();

      // Esperar a que el elemento exista
      await svgPath.waitFor({ state: 'attached', timeout: 5000 });

      const fillAttribute = await svgPath.getAttribute('fill');

      // Si tiene un color específico, está en wishlist
      if (fillAttribute && fillAttribute !== '' && fillAttribute !== 'none') {
        console.log(`  Wishlist status: ACTIVE (${fillAttribute})`);
        return true;
      }

      console.log(`  Wishlist status: INACTIVE (${fillAttribute ?? 'no fill'})`);
      return false;

    } catch (error) {
      console.log(`  ⚠️  Could not detect via fill, trying alternatives...`);

      // Estrategia 2: Por clases CSS
      try {
        const hasActiveClass = await wishlistBtn.evaluate((btn: HTMLElement) => {
          return btn.classList.contains('active') ||
                 btn.classList.contains('is-active') ||
                 btn.classList.contains('favorited');
        });

        if (hasActiveClass) {
          console.log(`  Wishlist status: ACTIVE (via class)`);
          return true;
        }
      } catch (e) {
        console.log(`  Could not check classes`);
      }

      // Estrategia 3: Por data attributes
      try {
        const isFavorite = await wishlistBtn.evaluate((btn: HTMLElement) => {
          return btn.dataset['active'] === 'true' ||
                 btn.dataset['favorite'] === 'true' ||
                 btn.getAttribute('aria-pressed') === 'true';
        });

        if (isFavorite) {
          console.log(`  Wishlist status: ACTIVE (via data attr)`);
          return true;
        }
      } catch (e) {
        console.log(`  Could not check data attributes`);
      }

      console.log(`  Wishlist status: INACTIVE (default)`);
      return false;
    }
  }

  /**
   * Click en "Añadir al carrito" de un producto específico
   */
  async clickAddToCartByIndex(index: number): Promise<void> {
    await this.waitForProductsToLoad();
    const productCard = this.page.locator(this.productCard).nth(index);
    const addToCartBtn = productCard.locator(this.addToCartButton);

    await addToCartBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await addToCartBtn.click();
  }

  /**
   * Obtiene información completa de un producto
   */
  async getProductInfo(index: number): Promise<ProductInfo> {
    await this.waitForProductsToLoad();

    const title = await this.getProductTitle(index);
    const ean = await this.getProductEAN(index);
    const inWishlist = await this.isProductInWishlist(index);

    // Obtener tags si existen
    const productCard = this.page.locator(this.productCard).nth(index);
    const tags = await productCard.locator(this.productTag).allTextContents();

    return {
      index,
      title,
      ean,
      inWishlist,
      tags: tags.map(tag => tag.trim())
    };
  }

  /**
   * Obtiene información de todos los productos
   */
  async getAllProductsInfo(): Promise<ProductInfo[]> {
    const count = await this.getProductCount();
    const products: ProductInfo[] = [];

    for (let i = 0; i < count; i++) {
      const info = await this.getProductInfo(i);
      products.push(info);
    }

    return products;
  }

  /**
   * Busca productos que contengan un tag específico
   */
  async getProductsByTag(tagName: string): Promise<ProductInfo[]> {
    const allProducts = await this.getAllProductsInfo();
    return allProducts.filter(product =>
      product.tags.some(tag => tag.includes(tagName))
    );
  }

  /**
   * Click en el wishlist de varios productos aleatoriamente
   */
  async clickRandomWishlists(numberOfProducts: number): Promise<number[]> {
    const totalProducts = await this.getProductCount();
    const randomIndices: number[] = [];

    // Generar índices aleatorios únicos
    while (randomIndices.length < numberOfProducts && randomIndices.length < totalProducts) {
      const randomIndex = Math.floor(Math.random() * totalProducts);
      if (!randomIndices.includes(randomIndex)) {
        randomIndices.push(randomIndex);
      }
    }

    console.log(`Clicking wishlist for products at indices: ${randomIndices.join(', ')}`);

    // Click en cada wishlist
    for (const index of randomIndices) {
      await this.clickWishlistByIndex(index);
      await this.page.waitForTimeout(500);
    }

    return randomIndices;
  }

  /**
   * Verifica que la página de productos está cargada
   */
  async isProductListVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.productCardsContainer, {
        state: 'visible',
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * MÉTODO DE DEBUGGING: Inspecciona el HTML del botón wishlist
   */
  async debugWishlistButton(index: number): Promise<void> {
    const productCard = this.page.locator(this.productCard).nth(index);
    const wishlistBtn = productCard.locator(this.wishlistButton);

    console.log('\n🔍 DEBUG: Wishlist Button Structure');
    console.log('═'.repeat(60));

    try {
      const html = await wishlistBtn.innerHTML();
      console.log('HTML:', html);

      const tagName = await wishlistBtn.evaluate((btn: Element) => btn.tagName);
      console.log('Tag:', tagName);

      const classes = await wishlistBtn.getAttribute('class');
      console.log('Classes:', classes);

      const href = await wishlistBtn.getAttribute('href');
      console.log('Href:', href);

      const type = await wishlistBtn.getAttribute('type');
      console.log('Type:', type);

      const dataAttrs = await wishlistBtn.evaluate((btn: Element) => {
        const attrs: Record<string, string> = {};
        for (const attr of Array.from(btn.attributes)) {
          if (attr.name.startsWith('data-')) {
            attrs[attr.name] = attr.value;
          }
        }
        return attrs;
      });
      console.log('Data attributes:', JSON.stringify(dataAttrs, null, 2));

      const svgExists = await wishlistBtn.locator('svg').count();
      console.log('SVG exists:', svgExists > 0);

      if (svgExists > 0) {
        const svgHTML = await wishlistBtn.locator('svg').innerHTML();
        console.log('SVG content:', svgHTML);
      }

    } catch (error: any) {
      console.log('Error during debug:', error.message);
    }

    console.log('═'.repeat(60));
  }

  /**
   * Abre el dropdown de ordenación
   */
  async openSortDropdown(): Promise<void> {
    const btn = this.page.locator(this.sortDropdown);
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    // LWC dropdown shows/hides via CSS class on the trigger — wait for animation
    await this.page.waitForTimeout(800);
  }

  /**
   * Selecciona una opción de ordenación por dirección (language-agnostic).
   * El span.slds-truncate tiene title="Label (Direction)" — buscamos por el sufijo en inglés.
   * Valores: 'Ascending' | 'Descending' | 'Default'
   */
  async selectSortByDirection(direction: 'Ascending' | 'Descending' | 'Default'): Promise<void> {
    await this.openSortDropdown();
    // The span text content ends with "(Ascending)" / "(Descending)" / "(Default)" — always English
    await this.page.locator('li.slds-dropdown__item a')
      .filter({ hasText: `(${direction})` })
      .click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    await this.waitForProductsToLoad();
  }

  /**
   * Devuelve la dirección de la opción actualmente seleccionada.
   * Abre el dropdown, lee el aria-checked y extrae el sufijo inglés del texto, luego cierra.
   */
  async getCurrentSortDirection(): Promise<string> {
    const btn = this.page.locator(this.sortDropdown);
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click(); // open
    await this.page.waitForTimeout(600);

    let direction = '';
    try {
      // aria-checked="true" marks the active item when the dropdown is open
      const checkedSpan = this.page.locator('li.slds-dropdown__item a[aria-checked="true"] span.slds-truncate').first();
      const text = await checkedSpan.textContent({ timeout: 3000 });
      // text = "Produktname (A–Z) (Ascending)" → extract last parenthetical (always English)
      const match = text?.match(/\(([^)]+)\)\s*$/);
      direction = match?.[1] ?? '';
    } catch { /* ignore — direction stays '' */ }

    // Close dropdown by clicking button again (toggle)
    await btn.click();
    await this.page.waitForTimeout(300);
    return direction;
  }

  /** @deprecated — usar selectSortByDirection */
  async selectSortByRule(rule: 'Produktname (A–Z)' | 'Produktname (Z–A)' | 'Beste Übereinstimmung'): Promise<void> {
    const map: Record<string, 'Ascending' | 'Descending' | 'Default'> = {
      'Produktname (A–Z)': 'Ascending',
      'Produktname (Z–A)': 'Descending',
      'Beste Übereinstimmung': 'Default',
    };
    await this.selectSortByDirection(map[rule] ?? 'Ascending');
  }

  /** @deprecated — usar getCurrentSortDirection */
  async getCurrentSortLabel(): Promise<string> {
    return this.getCurrentSortDirection();
  }

  // ── Category filters ────────────────────────────────────────────────────────

  /**
   * Clica un checkbox de filtro de categoría identificado por su data-facet (Salesforce ID).
   * Usa data-facet en lugar del value textual para ser language-agnostic.
   */
  async clickCategoryFilter(facetId: string): Promise<void> {
    // Navigate to the parent .slds-checkbox and click its label — LWC handles events on the label,
    // not on the hidden input. This also avoids the sticky h3 header intercepting the click.
    const label = this.page.locator(`div.slds-checkbox:has(input[data-facet="${facetId}"]) label.slds-checkbox__label`);
    await label.waitFor({ state: 'visible', timeout: 10000 });
    await label.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    await this.waitForProductsToLoad();
  }

  /**
   * Devuelve true si el checkbox de categoría está marcado.
   */
  async isCategoryFilterChecked(facetId: string): Promise<boolean> {
    return this.page.locator(`input[type="checkbox"][data-facet="${facetId}"]`).isChecked();
  }

  /**
   * Devuelve los índices de los productos que tienen el tag indicado (sin chequear wishlist)
   */
  async getProductsWithTag(tagName: string): Promise<number[]> {
    await this.waitForProductsToLoad();
    const count = await this.page.locator(this.productCard).count();
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const tags = await this.page.locator(this.productCard).nth(i).locator(this.productTag).allTextContents();
      if (tags.some(tag => tag.includes(tagName))) result.push(i);
    }
    return result;
  }

  /**
   * @deprecated Usar selectSortByRule('Produktname (A–Z)') en su lugar
   */
  async sortAlphabetically(): Promise<void> {
    await this.selectSortByRule('Produktname (A–Z)');
  }

  /**
   * @deprecated Usar getCurrentSortLabel() en su lugar
   */
  async getCurrentSortOrder(): Promise<string | null> {
    return this.getCurrentSortLabel();
  }

  private async getWishlistFillColor(index: number): Promise<string> {
    const wishlistBtn = this.page.locator(this.productCard).nth(index).locator(this.wishlistButton);
    try {
      const fill = await wishlistBtn.locator('svg path').first().getAttribute('fill');
      return fill ?? '';
    } catch {
      return '';
    }
  }

  async toggleWishlistAndVerify(index: number): Promise<{
    changed: boolean;
    before: { isActive: boolean; fillColor: string };
    after: { isActive: boolean; fillColor: string };
  }> {
    const beforeIsActive = await this.isProductInWishlist(index);
    const beforeColor = await this.getWishlistFillColor(index);

    await this.clickWishlistByIndex(index);

    const afterIsActive = await this.isProductInWishlist(index);
    const afterColor = await this.getWishlistFillColor(index);

    return {
      changed: beforeIsActive !== afterIsActive,
      before: { isActive: beforeIsActive, fillColor: beforeColor },
      after: { isActive: afterIsActive, fillColor: afterColor },
    };
  }
}
