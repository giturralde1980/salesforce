import { test, expect } from '@playwright/test';
import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/LoginPage';
import ProductListPage from '../../pages/ProductListPage';
import MyListsPage from '../../pages/MyListsPage';
import 'dotenv/config';

test.describe('Product List and Wishlist Tests', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let productListPage: ProductListPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    productListPage = new ProductListPage(page);
    await homePage.navigate();
    await homePage.clickEinloggen();
    await loginPage.login(
      process.env.TEST_EMAIL_OWNER!,
      process.env.TEST_PASSWORD_OWNER!
    );
    await expect(homePage.page.locator(homePage.meinCockpitLink)).toBeVisible({ timeout: 20000 });
    await homePage.clickMeinBestellungs();
    await homePage.page.waitForTimeout(1000);
    await homePage.clickAlleProducts();
    await homePage.page.waitForTimeout(2000);
    const isProductListVisible = await productListPage.isProductListVisible();
    expect(isProductListVisible).toBeTruthy();
  });

  test('favoriteproduct visibility', async ({ page }) => {
    // PASO 1: Verificar que el botón Wunschlisten está visible tras login (solo owner)
    const isWunschlistenVisible = await homePage.isWunschlistenVisible();
    expect(isWunschlistenVisible).toBe(true);
    console.log('✓ Botón Wunschlisten visible para usuario owner');

    // PASO 2: Ya estamos en la lista de productos (beforeEach navega a "Alle")
    // Obtener info del primer producto antes de añadirlo a favoritos
    const firstProduct = await productListPage.getProductInfo(0);
    console.log(`Producto seleccionado: ${firstProduct.title}`);

    // PASO 3: Click en el corazón para añadir a favoritos
    await productListPage.clickWishlistByIndex(0);
    await page.waitForTimeout(2000);

    // Verificar que el producto está marcado como favorito
    const isInWishlist = await productListPage.isProductInWishlist(0);
    expect(isInWishlist).toBe(true);
    console.log('✓ Producto añadido a favoritos (corazón activo)');

    // PASO 4: Click en Wunschlisten para ir a la página de favoritos
    await productListPage.clickWunschlistenButton();
    await expect(page).toHaveURL(/.*mylists.*/);
    console.log('✓ Navegación a página de favoritos correcta');

    // PASO 5: Verificar que el producto favorito aparece en la lista
    const myListsPage = new MyListsPage(page);
    await page.waitForTimeout(2000); // Esperar carga de la página
    const isPresent = await myListsPage.isProductInFavorites(firstProduct.title);
    expect(isPresent).toBeTruthy();
    console.log(`✓ Producto "${firstProduct.title}" visible en página de favoritos`);
  });

  /**
   * TEST: Ordenar productos alfabéticamente
   *
   * ESTADO: BORRADOR - Necesita HTML del dropdown para ajustar selectores
   *
   * SELECTORES QUE PUEDEN NECESITAR AJUSTE:
   * - sortDropdown: actualmente usa 'select' genérico
   * - Opción de ordenamiento: asume 'Alphabetisch' como label
   *
   * HTML NECESARIO PARA COMPLETAR:
   * Por favor proporcionar el HTML del elemento dropdown de ordenamiento:
   * - ¿Es un <select> nativo o un componente custom (ej: lightning-combobox)?
   * - ¿Cuáles son las opciones disponibles? (Alphabetisch, Preis, etc.)
   * - ¿Tiene atributos data-* o clases específicas?
   *
   * Ejemplo de HTML esperado:
   * <select class="sort-dropdown" data-name="sort">
   *   <option value="alpha">Alphabetisch</option>
   *   <option value="price">Preis</option>
   * </select>
   *
   * O si es un componente Salesforce Lightning:
   * <lightning-combobox label="Sortieren" value="alpha">...</lightning-combobox>
   */
  test('should sort products alphabetically', async ({ page }) => {
    // PASO 1: Obtener títulos de productos antes de ordenar
    const initialTitles = await productListPage.getAllProductTitles();
    console.log(`Productos iniciales (${initialTitles.length}):`, initialTitles.slice(0, 5));

    // PASO 2: Aplicar ordenamiento alfabético via dropdown
    // TODO: Ajustar selector según HTML real del dropdown
    await productListPage.sortAlphabetically();
    await page.waitForTimeout(2000); // Esperar recarga/reordenamiento

    // PASO 3: Obtener títulos después del ordenamiento
    const sortedTitles = await productListPage.getAllProductTitles();
    console.log(`Productos ordenados (${sortedTitles.length}):`, sortedTitles.slice(0, 5));

    // PASO 4: Verificar que están ordenados alfabéticamente (A-Z)
    const expectedSorted = [...initialTitles].sort((a, b) =>
      a.localeCompare(b, 'de-DE', { sensitivity: 'base' })
    );

    // Comparar los primeros N productos para validar el orden
    const compareCount = Math.min(10, sortedTitles.length);
    for (let i = 0; i < compareCount; i++) {
      expect(sortedTitles[i]).toBe(expectedSorted[i]);
    }
    console.log('✓ Productos ordenados alfabéticamente correctamente');
  });

  test.afterEach(async ({ page }) => {
    try {
      await homePage.logout();
      await expect(homePage.page.locator(homePage.einloggenButton2)).toBeVisible({ timeout: 10000 });
    } catch (error) {
    }
  });

  test('should navigate to favourite products page', async ({ page }) => {
    await productListPage.clickWunschlistenButton();
    await expect(page).toHaveURL('https://sanofi-chcrm-eu--sit1.sandbox.my.site.com/DE/s/mylists');
  });

  test('should add a product to wishlist and see it on the favourites page', async ({ page }) => {
    const myListsPage = new MyListsPage(page);
    const productIndex = 1;
    const productInfo = await productListPage.getProductInfo(productIndex);
    if (productInfo.inWishlist) {
      await productListPage.clickWishlistByIndex(productIndex);
      await page.waitForTimeout(2000);
    }
    await productListPage.clickWishlistByIndex(productIndex);
    await page.waitForTimeout(2000);
    const finalStatus = await productListPage.isProductInWishlist(productIndex);
    expect(finalStatus).toBe(true);
    await productListPage.clickWunschlistenButton();
    await expect(page).toHaveURL('https://sanofi-chcrm-eu--sit1.sandbox.my.site.com/DE/s/mylists');
    const isPresent = await myListsPage.isProductInFavorites(productInfo.title);
    expect(isPresent).toBeTruthy();
  });

  test('should display all products with their details', async ({ page }) => {
    const productCount = await productListPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);
    const titles = await productListPage.getAllProductTitles();
    expect(titles.length).toBe(productCount);
    expect(titles.every(title => title.length > 0)).toBeTruthy();
  });

  test('should click wishlist on the first product', async ({ page }) => {
    const firstProduct = await productListPage.getProductInfo(0);
    await productListPage.clickFirstProductWishlist();
    await page.waitForTimeout(3500);
    const updatedStatus = await productListPage.isProductInWishlist(0);
    expect(updatedStatus).not.toBe(firstProduct.inWishlist);
  });

  test('should click wishlist on a specific product by name', async ({ page }) => {

    // Obtener todos los productos
    const allProducts = await productListPage.getAllProductsInfo();

    // Seleccionar el segundo producto (si existe)
    if (allProducts.length > 1) {
      const targetProduct = allProducts[1];

      // Click en wishlist por nombre
      await productListPage.clickWishlistByProductName(targetProduct.title);

      // Verificar cambio
      await page.waitForTimeout(1500);
      const updatedStatus = await productListPage.isProductInWishlist(1);

      expect(updatedStatus).not.toBe(targetProduct.inWishlist);
    } else {
    }
  });

  test('should click wishlist on multiple random products', async ({ page }) => {

    const productCount = await productListPage.getProductCount();

    // Seleccionar 3 productos aleatorios (o menos si no hay suficientes)
    const numberOfProductsToSelect = Math.min(3, productCount);

    const selectedIndices = await productListPage.clickRandomWishlists(numberOfProductsToSelect);


    // Verificar que se clickeó en el número correcto de productos
    expect(selectedIndices.length).toBe(numberOfProductsToSelect);

    // Mostrar información de los productos seleccionados
    for (const index of selectedIndices) {
      const productInfo = await productListPage.getProductInfo(index);
    }

  });

  test('should get all products with "Fokusprodukt" tag', async ({ page }) => {

    // Buscar productos con tag "Fokusprodukt"
    const fokusProducts = await productListPage.getProductsByTag('Fokusprodukt');

    fokusProducts.forEach((product, index) => {
    });

    // Verificar que encontramos productos
    // (puede ser 0 si no hay productos con ese tag)
    expect(Array.isArray(fokusProducts)).toBeTruthy();

    // Si hay productos fokus, click en el wishlist del primero
    if (fokusProducts.length > 0) {
      await productListPage.clickWishlistByIndex(fokusProducts[0].index);
    }
  });

  test('should toggle wishlist on first 3 products sequentially', async ({ page }) => {

    const productCount = await productListPage.getProductCount();
    const numberOfProducts = Math.min(3, productCount);


    for (let i = 0; i < numberOfProducts; i++) {
      const product = await productListPage.getProductInfo(i);
      const initialStatus = product.inWishlist;


      // Click wishlist
      await productListPage.clickWishlistByIndex(i);
      await page.waitForTimeout(1000);

      // Verificar cambio
      const newStatus = await productListPage.isProductInWishlist(i);

      expect(newStatus).not.toBe(initialStatus);
    }

  });

  test('should display complete information for all products', async ({ page }) => {

    const allProducts = await productListPage.getAllProductsInfo();


    allProducts.forEach((product, index) => {
    });


    // Verificaciones
    expect(allProducts.length).toBeGreaterThan(0);
    expect(allProducts.every(p => p.title.length > 0)).toBeTruthy();
    expect(allProducts.every(p => p.ean.length > 0)).toBeTruthy();

  });

  test('should toggle wishlist color and verify visual change', async ({ page }) => {

    // Seleccionar el primer producto
    const productIndex = 0;
    const productInfo = await productListPage.getProductInfo(productIndex);


    // STEP 1: Primer toggle (activar wishlist)
    const firstToggle = await productListPage.toggleWishlistAndVerify(productIndex);

    // Verificar que cambió
    expect(firstToggle.changed).toBeTruthy();
    expect(firstToggle.before.isActive).not.toBe(firstToggle.after.isActive);

    // Verificar el color después del primer toggle
    const colorAfterFirstToggle = firstToggle.after.fillColor;

    // STEP 2: Segundo toggle (regresar al estado original)
    const secondToggle = await productListPage.toggleWishlistAndVerify(productIndex);

    // Verificar que cambió de nuevo
    expect(secondToggle.changed).toBeTruthy();
    expect(secondToggle.after.isActive).toBe(firstToggle.before.isActive);

    // Verificar que el color volvió al original
    expect(secondToggle.after.fillColor).toBe(firstToggle.before.fillColor);

    // RESUMEN
  });

  test('should toggle wishlist on multiple products and verify each', async ({ page }) => {

    const numberOfProducts = 3;
    const productCount = await productListPage.getProductCount();
    const productsToTest = Math.min(numberOfProducts, productCount);


    for (let i = 0; i < productsToTest; i++) {
      const product = await productListPage.getProductInfo(i);


      // Toggle 1: Activar
      const toggle1 = await productListPage.toggleWishlistAndVerify(i);
      expect(toggle1.changed).toBeTruthy();

      // Toggle 2: Desactivar (volver al estado original)
      const toggle2 = await productListPage.toggleWishlistAndVerify(i);
      expect(toggle2.changed).toBeTruthy();

      // Verificar que volvió al estado original
      expect(toggle2.after.isActive).toBe(toggle1.before.isActive);
    }

  });

  // TEST PREPARATORIO PARA PÁGINA DE FAVORITOS
  test('FUTURE: should add to wishlist and verify in favourites page', async ({ page }) => {

    // STEP 1: Añadir producto a wishlist
    const productIndex = 0;
    const product = await productListPage.getProductInfo(productIndex);

    const toggle = await productListPage.toggleWishlistAndVerify(productIndex);
    expect(toggle.after.isActive).toBeTruthy();

    // STEP 2: Navegar a página de favoritos
    // TODO: Implementar navegación
    // await productListPage.navigateToFavouritesPage();

    // STEP 3: Verificar que el producto está en favoritos
    // TODO: Implementar verificación

  });
});
