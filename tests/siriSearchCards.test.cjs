/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const compile = (file) => {
  const output = ts.transpileModule(source(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  assert.deepEqual(output.diagnostics, [], file);
  return output.outputText;
};
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useMemo: (fn) => fn(),
};
const native = { View: "View", FlatList: "FlatList", StyleSheet: { create: (styles) => styles }, useWindowDimensions: () => ({ width: 390 }) };
const paper = { ActivityIndicator: "ActivityIndicator", Button: "Button", Card: { Cover: "Cover", Content: "Content" }, Text: "Text" };
function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(compile(file), {
    exports,
    require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; },
  });
  return exports;
}
function sectionFixture() {
  const opened = [];
  const played = [];
  const module = load("components/mcp/SiriSearchResultSection.native.jsx", {
    react: React, "react-native": native, "react-native-paper": paper,
    "../courses/CoursesCatalog.native": "CoursesCatalog",
    "../downloadVideos/DownloadVideosHome.native": "DownloadVideosHome",
    "../series/SeriesCatalog.native": "SeriesCatalog",
    "../users/UsersHome.native": "UsersHome",
    "./SiriSearchResultCard.native": "SiriSearchResultCard",
  });
  return {
    opened, played,
    render: (section) => module.default({ section, onOpen: (item) => opened.push(item), onPlay: (item) => played.push(item) }),
  };
}

test("cada fila delega al catálogo original y nunca sustituye sus acciones por enlaces genéricos", () => {
  const f = sectionFixture();
  for (const [type, component] of [["movie", "DownloadVideosHome"], ["series", "SeriesCatalog"], ["course", "CoursesCatalog"], ["user", "UsersHome"]]) {
    const results = [{ type, id: "second" }, { type, id: "first" }];
    const section = f.render({ type, title: "Resultados", results });
    const content = section.props.children[1];
    assert.equal(content.type, component);
    assert.deepEqual(Array.from(content.props.searchResultIds), ["second", "first"]);
    assert.equal(content.props.onPress, undefined);
    assert.equal(content.props.onOpen, undefined);
    assert.equal(f.opened.length, 0);
    assert.equal(f.played.length, 0);
  }
});

test("los otros tipos mantienen filas horizontales y acciones explícitas", () => {
  const f = sectionFixture();
  const item = { type: "episode", id: "episode-id" };
  const rail = f.render({ type: "episode", title: "Episodios", results: [item] }).props.children[1];
  assert.equal(rail.type, "FlatList");
  assert.equal(rail.props.horizontal, true);
  const card = rail.props.renderItem({ item }).props.children[0];
  assert.equal(card.type, "SiriSearchResultCard");
  card.props.onOpen(item);
  card.props.onPlay(item);
  assert.equal(f.opened[0], item);
  assert.equal(f.played[0], item);
});

test("la agrupación conserva orden, identidad, paginación y todos los tipos de búsqueda", () => {
  const module = load("services/mcp/inAppSearch.js", {});
  const results = [{ type: "movie", id: "m1" }, { type: "user", id: "u1" }, { type: "movie", id: "m2" }, { type: "course", id: "c1" }];
  const sections = module.groupInAppSearchResults(results);
  assert.deepEqual(Array.from(sections, (section) => section.type), ["movie", "user", "course"]);
  assert.deepEqual(Array.from(sections[0].results, ({ id }) => id), ["m1", "m2"]);
  assert.equal(sections[0].results[0], results[0]);
  assert.equal(sections[0].title, "Películas");
  assert.equal(module.groupInAppSearchResults([]).length, 0);
  for (const category of module.IN_APP_SEARCH_CATEGORIES) {
    const args = module.makeInAppSearchArguments({ query: "texto literal", entityType: category.value });
    assert.equal(args.entity, category.value);
  }
});

test("la frase de Siri selecciona el chip de la entidad pedida y limpia el término", () => {
  const { inferInAppSearchIntent } = load("services/mcp/inAppSearch.js", {});
  const plain = (value) => value && { ...value };
  assert.deepEqual(plain(inferInAppSearchIntent("usuario Carlos Medina")), { entityType: "user", query: "Carlos Medina" });
  assert.deepEqual(plain(inferInAppSearchIntent("búscame el usuario Carlos Medina")), { entityType: "user", query: "Carlos Medina" });
  assert.deepEqual(plain(inferInAppSearchIntent("búscame la película Avatar")), { entityType: "movie", query: "Avatar" });
  assert.deepEqual(plain(inferInAppSearchIntent("cursos de fotografía")), { entityType: "course", query: "fotografía" });
  assert.equal(inferInAppSearchIntent("Carlos Medina"), null);
  assert.equal(inferInAppSearchIntent(""), null);
});

function productFixture({ ready = true, product = { _id: "product-id", idTienda: "store-id", count: 4, precio: 6 } } = {}) {
  const subscriptions = [];
  const selectors = [];
  const store = { _id: "store-id", title: "Tienda" };
  const module = load("components/mcp/SiriSearchResultCard.native.jsx", {
    react: React, "react-native": native, "react-native-paper": paper,
    "../../services/meteor/client.native": { Meteor: {
      useTracker: (fn) => fn(),
      subscribe: (...args) => { subscriptions.push(args); return { ready: () => ready }; },
    } },
    "../collections/collections": {
      ProductosComercioCollection: { findOne: (selector) => { selectors.push(selector); return product; } },
      TiendasComercioCollection: { findOne: () => store },
    },
    "../productos/ProductoCard.native": "ProductoCard",
  });
  return { module, subscriptions, selectors, product, store };
}

test("Comercio carga datos vigentes autorizados y conserva el drawer y carrito originales", () => {
  const f = productFixture();
  const card = f.module.SearchCommerceProductCard({ productId: "product-id" });
  assert.equal(card.type, "ProductoCard");
  assert.equal(card.props.producto, f.product);
  assert.equal(card.props.tienda, f.store);
  assert.equal(card.props.onPress, undefined, "no intercepta la pulsación que abre AddToCartDialog");
  assert.equal(card.props.images, undefined, "mantiene la galería original");
  assert.equal(f.subscriptions[0][0], "productosComercio");
  assert.equal(f.subscriptions[0][1]._id, "product-id");
  assert.equal(f.selectors[0]._id, "product-id");
  assert.equal(f.subscriptions[1][1]._id, "store-id");
  for (const item of [
    { type: "product", id: "COMERCIO:product-id" },
    { type: "product", id: "COMERCIO:product-id", cardData: { source: "COMERCIO", productId: "product-id", precio: 999 } },
  ]) {
    const result = f.module.default({ item });
    assert.equal(result.type, f.module.SearchCommerceProductCard);
    assert.equal(result.props.productId, "product-id");
    assert.equal(result.props.precio, undefined);
  }
});

test("productos pendientes o retirados no permiten actuar sobre datos del snapshot", () => {
  assert.equal(productFixture({ ready: false }).module.SearchCommerceProductCard({ productId: "id" }).type, "ActivityIndicator");
  const removed = productFixture({ product: null });
  assert.equal(removed.module.SearchCommerceProductCard({ productId: "id" }).type, "Text");
  assert.equal(removed.subscriptions.length, 1);
});

test("las pantallas propietarias compilan y conservan drawers, menú y permisos en modo fila", () => {
  const movie = source("components/downloadVideos/DownloadVideosHome.native.jsx");
  const series = source("components/series/SeriesCatalog.native.jsx");
  const users = source("components/users/UsersHome.native.js");
  const courses = source("components/courses/CoursesCatalog.native.jsx");
  for (const file of ["components/downloadVideos/DownloadVideosHome.native.jsx", "components/series/SeriesCatalog.native.jsx", "components/users/UsersHome.native.js", "components/courses/CoursesCatalog.native.jsx"]) compile(file);
  assert.match(movie, /searchResultIds \? \{ \$and: \[movieSelector, \{ _id: \{ \$in: searchResultIds \}/);
  assert.match(movie, /onPress=\{openMovieDetail\}/);
  assert.match(movie, /<MovieDetailBottomDrawer/);
  assert.match(movie, /onPlay=\{openStream\}/);
  assert.match(movie, /searchResultIds \|\| !completeCatalogReady/);
  assert.match(series, /_id: \{ \$in: searchResultIds \}/);
  assert.match(series, /onPress=\{openDetails\}/);
  assert.match(series, /<ModernBottomDrawer/);
  assert.match(series, /onPress=\{\(\) => goToDetail\(/);
  assert.match(users, /\$and: \[userFilter, \{ _id: \{ \$in: searchResultIds \}/);
  assert.match(users, /onLongPeek=\{openPeek\}/);
  assert.match(users, /<PeekOverlayHost/);
  assert.match(users, /showPushState=\{canViewPushTokens\}/);
  assert.match(courses, /locked=\{locked\}/);
  assert.match(courses, /bloqueadoPorNivel/);
  assert.match(courses, /onEvaluate=.*EvaluacionesIA/);
});
