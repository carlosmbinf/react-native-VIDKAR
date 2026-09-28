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
  assert.match(homeSection, /Explorar por categorías/);
  assert.match(homeSection, /categoriesHandle\.ready\(\)/);
  assert.match(catalog, /categoriesHandle\.ready\(\)/);
  assert.match(catalog, /selectedCategory === item\.id/);
  assert.ok(homeSection.lastIndexOf("{categoryRows.length ? (") > homeSection.indexOf("shouldShowLocationEmptyState ? ("));
  assert.match(serviceCard, /Organizar categorías/);
  assert.match(normalLayout, /<Stack\.Screen name="UserCommerceCategories"/);
  assert.match(empresaLayout, /<Stack\.Screen name="UserCommerceCategories"/);
});

test("las tarjetas por categoría tienen la misma separación inicial que las tiendas", () => {
  const homeSection = readFileSync(new URL("../components/productos/ComercioHomeSection.native.jsx", import.meta.url), "utf8");
  assert.match(homeSection, /<View key=\{category\.id\} style=\{styles\.categorySection\}>/);
  assert.doesNotMatch(homeSection, /categorySection: \{[^}]*paddingLeft/);
  assert.match(homeSection, /categoryHeader: \{[^}]*paddingLeft: 16/);
  assert.ok(/<FlatList\s+contentContainerStyle=\{styles\.categoryProductsListContent\}\s+data=\{category\.matches\.slice\(0, 8\)\}/.test(homeSection), "El margen debe estar en el contenido desplazable de categorías");
  assert.match(homeSection, /categoryProductsListContent: \{ paddingHorizontal: 16 \}/);
});
