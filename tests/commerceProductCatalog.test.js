import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCommerceProductQuery,
  COMMERCE_CATEGORY_SELECTION_LIMIT,
  COMMERCE_CATALOG_INITIAL_LIMIT,
  COMMERCE_CATALOG_MAX_LIMIT,
  getCommerceCategorySelectionProducts,
  isValidCommercePriceRange,
  resolveCommerceProductSort,
} from "../services/commerceProductCatalog.js";
import {
  getCommerceParentCategories,
  normalizeCommerceHomeCategories,
  UNCATEGORIZED_COMMERCE_CATEGORY_ID,
} from "../services/commerceCategories.js";

test("el catálogo limita los resultados y mantiene orden recomendado por defecto", () => {
  const query = buildCommerceProductQuery({
    limit: COMMERCE_CATALOG_MAX_LIMIT + 20,
    storeIds: ["store-1"],
    visibleCategoryIds: ["category-1"],
  });

  assert.equal(query.enabled, true);
  assert.equal(query.limit, COMMERCE_CATALOG_MAX_LIMIT);
  assert.equal(query.options.limit, COMMERCE_CATALOG_MAX_LIMIT + 1);
  assert.deepEqual(query.options.sort, { createdAt: -1, name: 1 });
  assert.equal(COMMERCE_CATALOG_INITIAL_LIMIT, 8);
});

test("el filtro de categoría consulta sus descendientes visibles y combina moneda, precio y disponibilidad", () => {
  const query = buildCommerceProductQuery({
    availability: "available",
    categoryIds: ["category-1", "category-2"],
    limit: 12,
    maxPrice: "250",
    minPrice: "10",
    selectedCategory: "category-1",
    selectedCurrency: "UYU",
    sort: "price-asc",
    storeIds: ["store-1", "store-2"],
    visibleCategoryIds: ["category-1", "category-2", "category-hidden"],
  });

  assert.equal(query.enabled, true);
  assert.deepEqual(query.selector.idTienda, { $in: ["store-1", "store-2"] });
  assert.deepEqual(query.selector["mercadoLibre.status"], { $ne: "paused" });
  assert.equal(query.selector.monedaPrecio, "UYU");
  assert.deepEqual(query.selector.precio, { $gte: 10, $lte: 250 });
  assert.deepEqual(query.selector.$and[0], {
    idCategoria: { $in: ["category-1", "category-2"] },
  });
  assert.deepEqual(query.selector.$and[1], {
    $or: [{ productoDeElaboracion: true }, { count: { $gt: 0 } }],
  });
  assert.equal(query.options.limit, 13);
  assert.deepEqual(query.options.sort, { precio: 1, name: 1 });
});

test("la búsqueda escapa expresiones y puede incluir tiendas cuyo nombre coincide", () => {
  const query = buildCommerceProductQuery({
    matchingStoreIds: ["store-2", "outside-store"],
    search: "radio (fm)+",
    storeIds: ["store-1", "store-2"],
    visibleCategoryIds: ["category-1"],
  });
  const searchCondition = query.selector.$and.at(-1).$or;

  assert.equal(searchCondition[0].name.$regex, "radio \\(fm\\)\\+");
  assert.equal(searchCondition[1].descripcion.$regex, "radio \\(fm\\)\\+");
  assert.deepEqual(searchCondition[2], { idTienda: { $in: ["store-2"] } });
  assert.equal(searchCondition.some((condition) => condition.idTienda?.$in?.includes("outside-store")), false);
});

test("la categoría sin asignar incluye campos ausentes, vacíos y con espacios", () => {
  const query = buildCommerceProductQuery({
    selectedCategory: UNCATEGORIZED_COMMERCE_CATEGORY_ID,
    storeIds: ["store-1"],
    visibleCategoryIds: ["category-1"],
  });
  const categoryCondition = query.selector.$and[0].$or;

  assert.equal(categoryCondition.some((condition) => condition.idCategoria?.$exists === false), true);
  assert.equal(categoryCondition.some((condition) => condition.idCategoria === null), true);
  assert.equal(categoryCondition.some((condition) => condition.idCategoria === ""), true);
  assert.equal(categoryCondition.some((condition) => condition.idCategoria instanceof RegExp), true);
});

test("no habilita consultas amplias con tiendas, filtros o rangos inválidos", () => {
  assert.equal(buildCommerceProductQuery().enabled, false);
  assert.equal(buildCommerceProductQuery({
    selectedStore: "unknown-store",
    storeIds: ["store-1"],
  }).enabled, false);
  assert.equal(buildCommerceProductQuery({
    minPrice: "30",
    maxPrice: "10",
    storeIds: ["store-1"],
  }).enabled, false);
  assert.equal(buildCommerceProductQuery({
    selectedCurrency: "BTC",
    storeIds: ["store-1"],
  }).enabled, false);
  assert.equal(isValidCommercePriceRange("", ""), true);
  assert.equal(isValidCommercePriceRange("0", "10.5"), true);
  assert.equal(isValidCommercePriceRange("-1", ""), false);
  assert.equal(isValidCommercePriceRange("no es precio", ""), false);
  assert.equal(isValidCommercePriceRange("20", "10"), false);
});

test("cada opción de orden se traduce al selector Mongo esperado", () => {
  assert.deepEqual(resolveCommerceProductSort("name"), { name: 1 });
  assert.deepEqual(resolveCommerceProductSort("price-desc"), { precio: -1, name: 1 });
  assert.deepEqual(resolveCommerceProductSort("unknown"), { createdAt: -1, name: 1 });
});

test("la selección aleatoria conserva el orden del servidor y nunca excede 15 productos", () => {
  const productIds = Array.from({ length: 20 }, (_, index) => `product-${index}`);
  const products = productIds.map((_id) => ({ _id }));
  const selected = getCommerceCategorySelectionProducts(
    products,
    [...productIds, "product-0", "missing-product"],
  );

  assert.equal(COMMERCE_CATEGORY_SELECTION_LIMIT, 15);
  assert.deepEqual(selected.map(({ _id }) => _id), productIds.slice(0, 15));
  assert.equal(getCommerceCategorySelectionProducts(products, []).length, 0);
});

test("la portada conserva solo las categorías raíz que son visibles", () => {
  const categories = [
    { _id: "root", activa: true, creadaPor: "owner", nombre: "Hogar" },
    { _id: "child", activa: true, creadaPor: "owner", idCategoriaHeredada: "root", nombre: "Cocina" },
    { _id: "other-root", activa: true, creadaPor: "other", nombre: "Otro comercio" },
    { _id: "hidden-root", activa: true, creadaPor: "owner", nombre: "Oculta", visibleEnInicio: false },
  ];
  const visible = normalizeCommerceHomeCategories(categories, null).filter((category) => category.visible);

  assert.deepEqual(getCommerceParentCategories(visible, ["owner"]).map(({ id }) => id), ["root"]);
});
