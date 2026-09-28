import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCategoryTree,
  filterActiveCategoryTree,
  filterCategoryTree,
  filterVisibleCommerceStores,
  getCategoryPath,
  getCategoryDescendantIds,
  getPopulatedCommerceCategoryRows,
  getSelectableCategoryIds,
  isProductCategorySaveConfirmed,
  matchesCommerceProductCategory,
  normalizeCommerceHomeCategories,
  UNCATEGORIZED_COMMERCE_CATEGORY_ID,
} from "../services/commerceCategories.js";

const categories = [
  { _id: "costillas", activa: true, idCategoriaHeredada: "puerco", nombre: "Costillas" },
  { _id: "puerco", activa: true, idCategoriaHeredada: "carnes", nombre: "Puerco" },
  { _id: "pollo", activa: true, idCategoriaHeredada: "carnes", nombre: "Pollo" },
  { _id: "carnes", activa: true, nombre: "Carnes" },
];

test("forma el árbol y resuelve la ruta completa de una categoría", () => {
  const tree = buildCategoryTree(categories);

  assert.deepEqual(tree.roots.map((category) => category._id), ["carnes"]);
  assert.deepEqual(
    getCategoryPath(tree, "costillas").map((category) => category.nombre),
    ["Carnes", "Puerco", "Costillas"],
  );
});

test("oculta toda la rama cuando un ancestro está inactivo", () => {
  const tree = buildCategoryTree(
    categories.map((category) =>
      category._id === "puerco" ? { ...category, activa: false } : category,
    ),
  );
  const visibleTree = filterActiveCategoryTree(tree.roots);

  assert.deepEqual(
    [...getSelectableCategoryIds(visibleTree)].sort(),
    ["carnes", "pollo"],
  );
});

test("al reactivar el ancestro, vuelve a estar disponible la rama activa", () => {
  const tree = buildCategoryTree(categories);
  const visibleTree = filterActiveCategoryTree(tree.roots);

  assert.deepEqual(
    [...getSelectableCategoryIds(visibleTree)].sort(),
    ["carnes", "costillas", "pollo", "puerco"],
  );
});

test("la búsqueda conserva los ancestros necesarios para representar el árbol", () => {
  const tree = buildCategoryTree(categories);
  const matches = filterCategoryTree(tree.roots, "costilla");

  assert.deepEqual(matches.map((category) => category.nombre), ["Carnes"]);
  assert.deepEqual(matches[0].children.map((category) => category.nombre), ["Puerco"]);
  assert.deepEqual(matches[0].children[0].children.map((category) => category.nombre), ["Costillas"]);
});

test("no convierte categorías huérfanas en raíces seleccionables", () => {
  const tree = buildCategoryTree([
    { _id: "huérfana", activa: true, idCategoriaHeredada: "no-existe", nombre: "Huérfana" },
  ]);

  assert.deepEqual(tree.roots, []);
});

test("respeta orden personal sin permitir ocultar categorías y hereda la visibilidad global", () => {
  const initial = normalizeCommerceHomeCategories(categories, null);
  assert.equal(initial.length, 4);
  assert.ok(initial.every((category) => category.visible));
  const globallyHidden = categories.map((category) => category._id === "puerco"
    ? { ...category, visibleEnInicio: false } : category);
  const ordered = normalizeCommerceHomeCategories(globallyHidden, [
    { id: "puerco", visible: false }, { id: "carnes", visible: true },
  ]);
  assert.deepEqual(ordered.map(({ id }) => id), ["puerco", "carnes", "pollo", "costillas"]);
  assert.deepEqual(ordered.map(({ visible }) => visible), [false, true, true, false]);
  assert.ok(normalizeCommerceHomeCategories(categories, [{ id: "puerco", visible: false }]).every((category) => category.visible));
  assert.deepEqual([...getCategoryDescendantIds(categories, "puerco")].sort(), ["costillas", "puerco"]);
  assert.deepEqual([...getCategoryDescendantIds(categories, "desconocida")], []);
});

test("el ocultamiento global excluye productos y tiendas vacías, pero conserva los sin categoría", () => {
  const hidden = categories.map((category) => category._id === "puerco"
    ? { ...category, visibleEnInicio: false } : category);
  const stores = [{ _id: "t1", productos: [
    { _id: "p1", idCategoria: "costillas", count: 5 },
    { _id: "p2", idCategoria: "pollo", count: 2 },
    { _id: "p3", count: 4 },
    { _id: "p4", idCategoria: "inexistente" },
  ] }, { _id: "t2", productos: [{ _id: "p5", idCategoria: "puerco" }] }];
  const visible = filterVisibleCommerceStores(stores, hidden);
  assert.deepEqual(visible.map((store) => store._id), ["t1"]);
  assert.deepEqual(visible[0].productos.map((product) => product._id), ["p2", "p3"]);
  assert.equal(visible[0].totalProductos, 2);
  assert.equal(visible[0].productosDisponibles, 2);
  assert.deepEqual(filterVisibleCommerceStores([{ _id: "empty", productos: [] }], categories), []);
});

test("muestra cada producto solo en su categoría exacta y conserva sin categoría", () => {
  const categorized = { _id: "p1", idCategoria: "costillas" };
  const uncategorized = { _id: "p2" };
  const tiendas = [{ _id: "t1", productos: [categorized, uncategorized] }];
  const visible = normalizeCommerceHomeCategories(categories, null);
  const rows = getPopulatedCommerceCategoryRows(categories, visible, tiendas);

  assert.deepEqual(rows.map((row) => row.id), ["costillas", UNCATEGORIZED_COMMERCE_CATEGORY_ID]);
  assert.equal(rows[0].label, "Carnes › Puerco › Costillas");
  assert.deepEqual(rows[0].matches.map(({ producto }) => producto._id), ["p1"]);
  assert.deepEqual(rows[1].matches.map(({ producto }) => producto._id), ["p2"]);
  assert.deepEqual(getPopulatedCommerceCategoryRows(categories, visible, []).map((row) => row.id), []);
  assert.deepEqual(getPopulatedCommerceCategoryRows(categories, [], tiendas).map((row) => row.id), [UNCATEGORIZED_COMMERCE_CATEGORY_ID]);

  const parentProduct = { _id: "p3", idCategoria: "puerco" };
  assert.deepEqual(
    getPopulatedCommerceCategoryRows(categories, visible, [{ _id: "t1", productos: [categorized, parentProduct] }]).map((row) => row.id),
    ["puerco", "costillas"],
  );
});

test("el filtro del listado no incluye descendientes y reconoce productos sin categoría", () => {
  const categorized = { idCategoria: " costillas " };
  assert.equal(matchesCommerceProductCategory(categorized, "carnes"), false);
  assert.equal(matchesCommerceProductCategory(categorized, "puerco"), false);
  assert.equal(matchesCommerceProductCategory(categorized, "costillas"), true);
  assert.equal(matchesCommerceProductCategory(categorized, UNCATEGORIZED_COMMERCE_CATEGORY_ID), false);
  assert.equal(matchesCommerceProductCategory({}, UNCATEGORIZED_COMMERCE_CATEGORY_ID), true);
  assert.equal(matchesCommerceProductCategory({}, "costillas"), false);
  assert.equal(matchesCommerceProductCategory({}, ""), false);
});

test("solo confirma el guardado si el servidor devuelve la categoría realmente persistida", () => {
  assert.equal(isProductCategorySaveConfirmed({ success: true, idCategoria: "costillas" }, "costillas"), true);
  assert.equal(isProductCategorySaveConfirmed({ success: true, idCategoria: "" }, ""), true);
  assert.equal(isProductCategorySaveConfirmed({ success: true, idCategoria: "pollo" }, "costillas"), false);
  assert.equal(isProductCategorySaveConfirmed({ success: true }, "costillas"), false);
  assert.equal(isProductCategorySaveConfirmed({ success: true }, ""), false);
});

test("el selector usa un único árbol React Native y aplica la selección de forma explícita", () => {
  const selectorSource = readFileSync(
    new URL("../components/empresa/components/CategoryTreeSelect.native.jsx", import.meta.url),
    "utf8",
  );
  const drawerSource = readFileSync(
    new URL("../components/drawer/DrawerBottom.native.jsx", import.meta.url),
    "utf8",
  );

  assert.match(selectorSource, /allowContentSwipeToClose=\{false\}/);
  assert.match(selectorSource, /closeOnBackdropPress=\{false\}/);
  assert.doesNotMatch(selectorSource, /from "@expo\/ui"/);
  assert.match(selectorSource, /accessibilityState=\{\{ expanded: isExpanded \}\}/);
  assert.match(selectorSource, /\{isExpanded \? \(\s*<View style=\{styles.children\}>/);
  assert.match(selectorSource, /stageCategorySelection\(""\)/);
  assert.match(selectorSource, /const stageCategorySelection = \(categoryId\) => \{[^}]*setDraftCategoryId\(categoryId\);/);
  assert.match(selectorSource, /onPress=\{handleApplySelection\}/);
  assert.match(drawerSource, /allowContentSwipeToClose\s*\?/);
});

test("el editor individual conserva filas legibles y reserva interruptores para el modo global", () => {
  const screenSource = readFileSync(
    new URL("../components/users/commerce-categories-management-screen.native.jsx", import.meta.url),
    "utf8",
  );

  assert.match(screenSource, /<Text numberOfLines=\{2\} style=\{styles\.label\}/);
  assert.match(screenSource, /label: \{ flex: 1, minWidth: 0 \}/);
  assert.match(screenSource, /\{global \? \(\s*<Host accessibilityLabel=\{`Mostrar \$\{entry\.label\}`\} matchContents/);
  assert.doesNotMatch(screenSource, /label=\{`Mostrar \$\{entry\.label\}`\}/);
});