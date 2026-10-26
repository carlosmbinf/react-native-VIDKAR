import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getPopulatedCommerceCategoryRows,
  normalizeCommerceHomeCategories,
  UNCATEGORIZED_COMMERCE_CATEGORY_ID,
} from "../services/commerceCategories.js";

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

test("Comercios reutiliza las selecciones de Inicio y muestra carruseles completos por tienda", () => {
  const catalog = readFileSync(new URL("../components/productos/ProductosScreen.native.jsx", import.meta.url), "utf8");
  const storeCard = readFileSync(new URL("../components/productos/TiendaCard.native.jsx", import.meta.url), "utf8");

  assert.match(catalog, /<ComercioCategorySelection/);
  assert.match(catalog, /creadaPor: 1/);
  assert.match(catalog, /idUser: 1/);
  assert.match(catalog, /getCommerceParentCategories\(parentCategoryCandidates, nearbyOwnerIds\)/);
  assert.match(catalog, /storeIds=\{nearbyStoreIds\}/);
  assert.match(catalog, /storesById=\{storesById\}/);
  assert.match(catalog, /onSeeAll=\{\(\) => setSelectedCategory\(item.category.id\)\}/);
  assert.match(catalog, /layoutMode="carousel"\s+showLoadedProducts/);
  assert.doesNotMatch(catalog, /layoutMode="grid"/);
  assert.match(storeCard, /isGridMode \|\| showLoadedProducts \|\| showAll/);
  assert.match(storeCard, /data=\{visibleProductos\}[\s\S]*?horizontal/);
});

test("las filas filtradas conservan todos los productos cargados y la tienda de cada tarjeta", () => {
  const categories = [
    { _id: "root", nombre: "Alimentos" },
    { _id: "child", nombre: "Pan", idCategoriaHeredada: "root" },
    { _id: "empty", nombre: "Sin resultados" },
  ];
  const products = Array.from({ length: 24 }, (_, index) => ({
    _id: `p${index}`, idCategoria: index % 2 ? "child" : "root",
  }));
  const stores = [
    { _id: "store-a", productos: products.slice(0, 16) },
    { _id: "store-b", productos: [...products.slice(16), { _id: "uncategorized" }] },
  ];
  const visible = normalizeCommerceHomeCategories(categories, [{ id: "child" }]);
  const rows = getPopulatedCommerceCategoryRows(categories, visible, stores);
  assert.deepEqual(rows.map(({ id }) => id), ["child", "root", UNCATEGORIZED_COMMERCE_CATEGORY_ID]);
  assert.equal(rows[0].label, "Alimentos › Pan");
  assert.equal(rows[0].matches.length, 12);
  assert.equal(rows[1].matches.length, 12);
  assert.equal(new Set(rows.flatMap(({ matches }) => matches.map(({ producto }) => producto._id))).size, 25);
  assert.equal(rows[0].matches[0].tienda._id, "store-a");
  assert.equal(rows[0].matches.at(-1).tienda._id, "store-b");
  assert.deepEqual(getPopulatedCommerceCategoryRows(categories, visible, []), []);

  const catalog = readFileSync(new URL("../components/productos/ProductosScreen.native.jsx", import.meta.url), "utf8");
  assert.match(catalog, /showCategorySelections = activeFiltersCount === 0 && !debouncedSearch/);
  assert.match(catalog, /getPopulatedCommerceCategoryRows\(categories, visibleCategories, tiendasFiltradas, productOrderIds\)/);
  assert.match(catalog, /data=\{category.matches\}\s+horizontal/);
  assert.match(catalog, /producto=\{match.producto\} searchQuery=\{searchQuery\} tienda=\{match.tienda\}/);
});

test("los carruseles por categoría conservan el orden del catálogo entre varias tiendas", () => {
  const visible = [{ id: "food", label: "Alimentos" }];
  const stores = [
    { _id: "a", productos: [
      { _id: "p1", idCategoria: "food", precio: 1, name: "A" },
      { _id: "p3", idCategoria: "food", precio: 3, name: "C" },
    ] },
    { _id: "b", productos: [{ _id: "p2", idCategoria: "food", precio: 2, name: "B" }] },
  ];
  for (const ids of [["p1", "p2", "p3"], ["p3", "p2", "p1"], ["p2", "p1", "p3"]]) {
    const rows = getPopulatedCommerceCategoryRows([], visible, stores, ids);
    assert.deepEqual(rows[0].matches.map(({ producto }) => producto._id), ids);
    assert.equal(rows[0].matches.find(({ producto }) => producto._id === "p2").tienda._id, "b");
  }
});
