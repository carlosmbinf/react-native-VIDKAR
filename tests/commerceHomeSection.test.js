import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("el carrito usa el drawer compartido y coordina su gesto con el scroll interno", () => {
  const cartDialog = readFileSync(new URL("../components/productos/AddToCartDialog.native.jsx", import.meta.url), "utf8");
  const homeSection = readFileSync(new URL("../components/productos/ComercioHomeSection.native.jsx", import.meta.url), "utf8");

  assert.match(cartDialog, /<DrawerBottom/);
  assert.match(cartDialog, /contentAtTopRef=\{contentAtTopRef\}/);
  assert.match(cartDialog, /scrollable/);
  assert.match(cartDialog, /reducedMotion=\{reducedMotion\}/);
  assert.doesNotMatch(cartDialog, /<Dialog(?:\s|\.)/);
  assert.match(homeSection, /<Surface elevation=\{0\} style=\{styles\.section\}/);
});

test("las categorías se muestran independientemente de las tiendas y su editor tiene ruta en ambos shells", () => {
  const homeSection = readFileSync(new URL("../components/productos/ComercioHomeSection.native.jsx", import.meta.url), "utf8");
  const catalog = readFileSync(new URL("../components/productos/ProductosScreen.native.jsx", import.meta.url), "utf8");
  const serviceCard = readFileSync(new URL("../components/users/componentsUserDetails/WelcomeServicesCard.native.jsx", import.meta.url), "utf8");
  const normalLayout = readFileSync(new URL("../app/(normal)/_layout.tsx", import.meta.url), "utf8");
  const empresaLayout = readFileSync(new URL("../app/(empresa)/_layout.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(homeSection, /shouldHideCommerceHomeSection|shouldHideEmptyStoreSection/);
  assert.match(homeSection, /Explorar categorías principales/);
  assert.match(homeSection, /getCommerceParentCategories\(visibleCategories\)/);
  assert.match(homeSection, /getCommerceParentCategories\(parentCategoryCandidates, nearbyOwnerIds\)/);
  assert.match(homeSection, /ComercioCategorySelection/);
  assert.match(homeSection, /idUser: 1/);
  assert.match(homeSection, /categoriesHandle\.ready\(\)/);
  assert.match(catalog, /categoriesHandle\.ready\(\)/);
  assert.match(catalog, /selectedCategory === item\.id/);
  assert.ok(homeSection.lastIndexOf("{!debouncedSearch && parentCategories.length ? (") > homeSection.indexOf("shouldShowLocationEmptyState ? ("));
  assert.match(serviceCard, /Organizar categorías/);
  assert.match(normalLayout, /<Stack\.Screen name="UserCommerceCategories"/);
  assert.match(empresaLayout, /<Stack\.Screen name="UserCommerceCategories"/);
});

test("las selecciones móviles usan categorías padre y limitan cada muestra a 15", () => {
  const homeSection = readFileSync(new URL("../components/productos/ComercioHomeSection.native.jsx", import.meta.url), "utf8");
  const selection = readFileSync(new URL("../components/productos/ComercioCategorySelection.native.jsx", import.meta.url), "utf8");
  const catalogService = readFileSync(new URL("../services/commerceProductCatalog.js", import.meta.url), "utf8");
  assert.match(homeSection, /data=\{parentCategories\}/);
  assert.match(homeSection, /storeIds=\{nearbyStoreIds\}/);
  assert.match(catalogService, /COMMERCE_CATEGORY_SELECTION_LIMIT = 15/);
  assert.match(selection, /COMMERCE_CATEGORY_SELECTION_LIMIT/);
  assert.match(selection, /comercio\.productosSeleccionCategoria/);
  assert.match(selection, /data=\{state\.products\}/);
  assert.match(selection, /Otra selección/);
  assert.match(selection, /Ver categoría/);
});

test("el inicio limita productos por tienda y el catálogo pagina las suscripciones", () => {
  const homeSection = readFileSync(new URL("../components/productos/ComercioHomeSection.native.jsx", import.meta.url), "utf8");
  const catalog = readFileSync(new URL("../components/productos/ProductosScreen.native.jsx", import.meta.url), "utf8");

  assert.match(homeSection, /HOME_STORE_PREVIEW_COUNT = 4/);
  assert.match(homeSection, /buildCommerceProductQuery/);
  assert.match(homeSection, /limit: COMMERCE_CATALOG_INITIAL_LIMIT/);
  assert.doesNotMatch(homeSection, /HOME_CATEGORY_PREVIEW_COUNT/);
  assert.match(catalog, /COMMERCE_CATALOG_INITIAL_LIMIT/);
  assert.match(catalog, /COMMERCE_CATALOG_MAX_LIMIT/);
  assert.match(catalog, /Cargar más productos/);
  assert.match(catalog, /limit: catalogQuery\.options\.limit/);
});
