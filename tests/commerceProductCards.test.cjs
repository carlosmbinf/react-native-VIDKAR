/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Pruebas del contrato JS: no simulan layout, gestos ni animaciones nativas.
const compiled = new Map();
function load(file, dependencies, globals = {}) {
  if (!compiled.has(file)) {
    const output = ts.transpileModule(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      {
        fileName: file,
        reportDiagnostics: true,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.React,
          esModuleInterop: true,
        },
      },
    );
    assert.deepEqual(output.diagnostics, [], file);
    compiled.set(file, output.outputText);
  }
  const exports = {};
  vm.runInNewContext(compiled.get(file), {
    ...globals,
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports.default;
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
const byType = (tree, type) => nodes(tree).filter((node) => node.type === type);
function only(tree, type) {
  const matches = byType(tree, type);
  assert.equal(matches.length, 1, `Se esperaba un único ${type}`);
  return matches[0];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  return text(tree.props.children);
}
const texts = (tree) => byType(tree, "Text").map(text);
const sameDeps = (before, after) => before !== undefined && after !== undefined &&
  before.length === after.length && before.every((value, index) => Object.is(value, after[index]));

function createHarness() {
  const slots = [];
  const hosts = new WeakMap();
  const scrollCalls = [];
  let cursor = 0;
  let pendingEffects = [];
  let committedRefs = new Set();
  let dirty = false;
  let mounted = true;
  let component;
  let props;
  let tree;

  function slot(kind, initialize) {
    const index = cursor++;
    if (!slots[index]) slots[index] = { kind, ...initialize() };
    assert.equal(slots[index].kind, kind, `Orden de hooks en ${index}`);
    return slots[index];
  }
  const React = {
    Fragment: "Fragment",
    createElement: (type, attributes, ...children) => ({ type, props: { ...attributes, children } }),
    useId() {
      return slot("id", () => ({ value: "synthetic-instance" })).value;
    },
    useState(initial) {
      const state = slot("state", () => ({ value: typeof initial === "function" ? initial() : initial }));
      if (!state.set) state.set = (update) => {
        if (!mounted) return;
        const next = typeof update === "function" ? update(state.value) : update;
        if (!Object.is(next, state.value)) {
          state.value = next;
          dirty = true;
        }
      };
      return [state.value, state.set];
    },
    useRef(initial) {
      return slot("ref", () => ({ value: { current: initial } })).value;
    },
    useMemo(factory, deps) {
      const memo = slot("memo", () => ({}));
      if (!sameDeps(memo.deps, deps)) {
        memo.value = factory();
        memo.deps = deps?.slice();
      }
      return memo.value;
    },
    useEffect(effect, deps) {
      const state = slot("effect", () => ({}));
      if (!sameDeps(state.deps, deps)) {
        // Capturar las dependencias del render, no leerlas desde el siguiente.
        pendingEffects.push({ state, effect, deps: deps?.slice() });
      }
    },
  };

  function commitRefs() {
    const nextRefs = new Set();
    for (const node of nodes(tree)) {
      if (node.type !== "ScrollView" || !node.props.ref) continue;
      const ref = node.props.ref;
      if (!hosts.has(ref)) hosts.set(ref, { scrollTo: (options) => scrollCalls.push({ ...options }) });
      nextRefs.add(ref);
      ref.current = hosts.get(ref);
    }
    for (const ref of committedRefs) if (!nextRefs.has(ref)) ref.current = null;
    committedRefs = nextRefs;
  }
  function flush() {
    let renders = 0;
    while (dirty) {
      assert.ok(++renders <= 30, "Los efectos no deben provocar un bucle de render");
      dirty = false;
      cursor = 0;
      pendingEffects = [];
      tree = component(props);
      assert.equal(cursor, slots.length, "Cantidad estable de hooks");
      // React asigna refs durante commit, antes de ejecutar efectos pasivos.
      commitRefs();
      for (const { state, effect, deps } of pendingEffects) {
        state.cleanup?.();
        state.deps = deps;
        state.cleanup = effect();
      }
    }
    return tree;
  }
  return {
    React,
    scrollCalls,
    get tree() { return tree; },
    mount(fn, initialProps) {
      component = fn;
      props = initialProps;
      dirty = true;
      return flush();
    },
    render(nextProps = props) {
      props = nextProps;
      dirty = true;
      return flush();
    },
    act(callback) { callback(); return flush(); },
    unmount() {
      mounted = false;
      for (const state of slots) if (state.kind === "effect") state.cleanup?.();
      for (const ref of committedRefs) ref.current = null;
    },
  };
}

const theme = { colors: {
  surface: "white", surfaceVariant: "gray", onSurfaceVariant: "black",
  outlineVariant: "gray", onSurface: "black", primary: "blue",
  secondaryContainer: "silver", onSecondaryContainer: "black",
} };
const native = {
  Image: "Image", ScrollView: "ScrollView", View: "View", Pressable: "Pressable",
  StyleSheet: { create: (styles) => styles, hairlineWidth: 1, absoluteFill: {} },
  useWindowDimensions: () => ({ width: 390 }),
};
const paper = {
  ActivityIndicator: "ActivityIndicator", IconButton: "IconButton",
  Surface: "Surface", Text: "Text", useTheme: () => theme,
};
const urls = ["https://images.example.test/a.png", "https://images.example.test/b.png", "https://images.example.test/c.png"];
const product = { _id: "synthetic-product", name: "Producto sintético con nombre largo", count: 8, precio: 12 };
const store = { _id: "synthetic-store", title: "Tienda de prueba" };

function carouselFixture(props = { images: urls }) {
  const h = createHarness();
  const requests = [];
  const component = load("components/productos/ProductImageCarousel.native.jsx", {
    react: h.React, "react-native": native, "react-native-paper": paper,
    "@meteorrn/core": { call: (method, id, callback) => requests.push({ method, id, callback }) },
  });
  h.mount(component, props);
  return Object.assign(h, {
    requests,
    layout: (width) => h.act(() => h.tree.props.onLayout({ nativeEvent: { layout: { width } } })),
    scroll: (x, handler = "onScroll") => h.act(() => only(h.tree, "ScrollView").props[handler]({ nativeEvent: { contentOffset: { x } } })),
    reply: (index, error, result) => h.act(() => {
      assert.ok(requests[index], `Solicitud ${index} existente`);
      requests[index].callback(error, result);
    }),
  });
}
function press(h, label) {
  const button = byType(h.tree, "IconButton").find((node) => node.props.accessibilityLabel === label);
  assert.ok(button, label);
  let stopped = false;
  h.act(() => button.props.onPress({ stopPropagation: () => { stopped = true; } }));
  assert.equal(stopped, true, "La flecha no debe abrir la tarjeta");
}
function counter(h, expected) {
  assert.ok(texts(h.tree).includes(expected), `Contador esperado: ${expected}; recibido: ${texts(h.tree)}`);
}
const imageUrls = (h) => byType(h.tree, "Image").map((node) => node.props.source.uri);

test("harness: commit asigna refs antes de efectos y respeta deps, rerender y cleanup", () => {
  const h = createHarness();
  const events = [];
  function Probe({ id }) {
    const ref = h.React.useRef(null);
    const [value, setValue] = h.React.useState(0);
    h.React.useEffect(() => {
      assert.ok(ref.current, "Ref disponible en el primer efecto");
      events.push(`effect:${id}`);
      ref.current.scrollTo({ x: 0, animated: false });
      return () => events.push(`cleanup:${id}`);
    }, [id]);
    return h.React.createElement("ScrollView", { ref, onPress: () => setValue((current) => current + 1), value });
  }
  h.mount(Probe, { id: "a" });
  h.act(() => h.tree.props.onPress());
  assert.equal(h.tree.props.value, 1);
  h.render({ id: "a" });
  assert.deepEqual(events, ["effect:a"]);
  assert.equal(h.scrollCalls.length, 1);
  h.render({ id: "b" });
  assert.deepEqual(events, ["effect:a", "cleanup:a", "effect:b"]);
  h.unmount();
  assert.deepEqual(events, ["effect:a", "cleanup:a", "effect:b", "cleanup:b"]);
});

test("galería: mismo ID admite URLs independientes y excluye URL duplicada", () => {
  const h = carouselFixture({ images: [
    { id: "shared", url: ` ${urls[0]} ` }, { id: "shared", url: urls[1] },
    { id: "other", url: urls[0] }, null, { url: " " }, 42,
  ] });
  assert.deepEqual(imageUrls(h), urls.slice(0, 2));
  counter(h, "1 / 2");
  const slides = only(h.tree, "ScrollView").props.children[0];
  assert.notEqual(slides[0].props.key, slides[1].props.key);
  h.act(() => byType(h.tree, "Image")[0].props.onError());
  assert.deepEqual(imageUrls(h), [urls[1]], "El fallo no afecta otra URL con el mismo ID");
  assert.ok(texts(h.tree).includes("Imagen no disponible"));
  assert.equal(h.requests.length, 0);
});

test("siguiente usa el ancho medido; contador espera onScroll, no la pulsación", () => {
  const h = carouselFixture({ images: urls, size: 104 });
  assert.deepEqual(h.scrollCalls, [{ x: 0, animated: false }], "Ref asignada en el commit inicial");
  h.layout(237);
  const callsAfterLayout = h.scrollCalls.length;
  assert.equal(only(h.tree, "ScrollView").props.style[1].width, 237);
  press(h, "Imagen siguiente");
  assert.deepEqual(h.scrollCalls.at(-1), { x: 237, animated: true });
  counter(h, "1 / 3");
  h.scroll(237);
  counter(h, "2 / 3");
  assert.equal(h.scrollCalls.length, callsAfterLayout + 1, "El efecto de reset no se repite por cambiar índice");
});

test("anterior y pulsaciones rápidas conservan destino pendiente y hacen wrap", () => {
  const h = carouselFixture();
  h.layout(211);
  h.scrollCalls.length = 0;
  press(h, "Imagen anterior");
  press(h, "Imagen anterior");
  press(h, "Imagen siguiente");
  press(h, "Imagen siguiente");
  press(h, "Imagen siguiente");
  press(h, "Imagen siguiente");
  assert.deepEqual(h.scrollCalls, [422, 211, 422, 0, 211, 422].map((x) => ({ x, animated: true })));
  counter(h, "1 / 3");
  h.scroll(422);
  counter(h, "3 / 3");
});

test("swipe actualiza y limita contador; drag y momentum sincronizan la siguiente flecha", () => {
  const h = carouselFixture();
  h.layout(200);
  h.scroll(120);
  counter(h, "2 / 3");
  h.act(() => only(h.tree, "ScrollView").props.onScrollBeginDrag());
  press(h, "Imagen siguiente");
  assert.deepEqual(h.scrollCalls.at(-1), { x: 400, animated: true });
  h.scroll(400, "onMomentumScrollEnd");
  counter(h, "3 / 3");
  press(h, "Imagen siguiente");
  assert.deepEqual(h.scrollCalls.at(-1), { x: 0, animated: true });
  h.scroll(-200);
  counter(h, "1 / 3");
  h.scroll(2000);
  counter(h, "3 / 3");
});

test("un arrastre sin inercia sincroniza el destino de las flechas", () => {
  const h = carouselFixture();
  h.layout(200);
  h.act(() => only(h.tree, "ScrollView").props.onScrollBeginDrag());
  h.scroll(200);
  h.scroll(200, "onScrollEndDrag");
  counter(h, "2 / 3");
  press(h, "Imagen siguiente");
  assert.deepEqual(h.scrollCalls.at(-1), { x: 400, animated: true });
});

test("cambiar URLs con igual longitud reinicia scroll, contador, destino y fallos", () => {
  const original = [{ id: "same", url: urls[0] }, { id: "same", url: urls[1] }];
  const h = carouselFixture({ images: original, productId: product._id });
  h.layout(223);
  h.scroll(223, "onMomentumScrollEnd");
  h.act(() => byType(h.tree, "Image")[0].props.onError());
  counter(h, "2 / 2");
  assert.ok(texts(h.tree).includes("Imagen no disponible"));
  const changed = [{ id: "same", url: urls[0] }, { id: "same", url: urls[2] }];
  const before = h.scrollCalls.length;
  h.render({ images: changed, productId: product._id });
  assert.deepEqual(imageUrls(h), [urls[0], urls[2]], "También se recupera la URL fallida que permanece");
  assert.equal(texts(h.tree).includes("Imagen no disponible"), false);
  counter(h, "1 / 2");
  assert.deepEqual(h.scrollCalls.slice(before), [{ x: 0, animated: false }]);
  press(h, "Imagen siguiente");
  assert.deepEqual(h.scrollCalls.at(-1), { x: 223, animated: true }, "Destino pendiente reiniciado");
  h.render({ images: changed, productId: product._id });
  assert.deepEqual(h.scrollCalls.at(-1), { x: 223, animated: true }, "Deps estables no repiten reset");
});

test("Meteor: loading y éxito normalizado sin consultar legacy", () => {
  const h = carouselFixture({ productId: product._id });
  only(h.tree, "ActivityIndicator");
  assert.equal(byType(h.tree, "ScrollView").length, 0);
  assert.equal(h.requests[0].method, "comercio.getProductImages");
  assert.equal(h.requests[0].id, product._id);
  h.reply(0, null, [urls[0], urls[1], urls[0]]);
  assert.deepEqual(imageUrls(h), urls.slice(0, 2));
  assert.equal(byType(h.tree, "ActivityIndicator").length, 0);
  assert.equal(h.requests.length, 1);
});

test("Meteor: error, vacío o respuesta inválida usan fallback legacy", async (t) => {
  for (const [name, error, result] of [
    ["error", new Error("Fallo sintético"), undefined],
    ["vacío", null, []], ["inválido", null, {}], ["URLs inválidas", null, [{ url: " " }]],
  ]) {
    await t.test(name, () => {
      const h = carouselFixture({ productId: product._id });
      h.reply(0, error, result);
      assert.equal(h.requests[1].method, "findImgbyProduct");
      assert.equal(h.requests[1].id, product._id);
      only(h.tree, "ActivityIndicator");
      h.reply(1, null, urls[2]);
      assert.deepEqual(imageUrls(h), [urls[2]]);
      assert.equal(byType(h.tree, "ActivityIndicator").length, 0);
      assert.equal(byType(h.tree, "IconButton").length, 0);
    });
  }
});

test("Meteor: fallback fallido o sin URL termina en vacío", async (t) => {
  for (const [name, error, result] of [
    ["error", new Error("Fallo legacy sintético"), urls[0]],
    ["vacío", null, ""], ["inválido", null, {}],
  ]) {
    await t.test(name, () => {
      const h = carouselFixture({ productId: product._id });
      h.reply(0, null, []);
      h.reply(1, error, result);
      assert.deepEqual(texts(h.tree), ["Sin imagen"]);
      assert.equal(byType(h.tree, "ActivityIndicator").length, 0);
    });
  }
});

test("Meteor: cambiar producto descarta callback principal tardío y no inicia legacy", () => {
  const h = carouselFixture({ productId: "old-product" });
  h.render({ productId: "new-product" });
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].id, "new-product");
  h.reply(0, null, [urls[0]]);
  only(h.tree, "ActivityIndicator");
  assert.deepEqual(imageUrls(h), []);
  h.reply(0, new Error("Respuesta tardía"));
  assert.equal(h.requests.length, 2, "No lanza fallback del producto anterior");
  h.reply(1, null, [urls[1]]);
  assert.deepEqual(imageUrls(h), [urls[1]]);
  h.reply(0, null, [urls[0]]);
  assert.deepEqual(imageUrls(h), [urls[1]]);
});

test("Meteor: callback legacy tardío no reemplaza imágenes del nuevo producto", () => {
  const h = carouselFixture({ productId: "old-product" });
  h.reply(0, null, []);
  h.render({ productId: "new-product" });
  assert.equal(h.requests[2].id, "new-product");
  h.reply(1, null, urls[0]);
  only(h.tree, "ActivityIndicator");
  h.reply(2, null, [urls[2]]);
  h.reply(1, null, urls[1]);
  assert.deepEqual(imageUrls(h), [urls[2]]);
});

test("galería vacía, sin producto o imágenes provistas no consulta Meteor", () => {
  for (const props of [{}, { images: [] }, { images: [], productId: product._id }]) {
    const h = carouselFixture(props);
    assert.deepEqual(texts(h.tree), ["Sin imagen"]);
    assert.equal(byType(h.tree, "ActivityIndicator").length, 0);
    assert.equal(byType(h.tree, "ScrollView").length, 0);
    assert.equal(byType(h.tree, "IconButton").length, 0);
    assert.equal(h.requests.length, 0);
  }
});

function cardFixture(extraProps = {}) {
  const h = createHarness();
  const component = load("components/productos/ProductoCard.native.jsx", {
    react: h.React, "react-native": native, "react-native-paper": paper,
    "@expo/vector-icons/MaterialCommunityIcons": "MaterialCommunityIcons",
    "./AddToCartDialog": "AddToCartDialog",
    "./ProductImageCarousel": "ProductImageCarousel",
  });
  h.mount(component, { producto: product, tienda: store, ...extraProps });
  return h;
}

test("tarjeta respeta onPress custom sin montar drawer/carrito", () => {
  let calls = 0;
  const onPress = () => { calls += 1; };
  const h = cardFixture({ onPress });
  const button = only(h.tree, "Pressable");
  assert.equal(button.props.onPress, onPress);
  assert.equal(button.props.accessibilityRole, "button");
  h.act(() => button.props.onPress());
  assert.equal(calls, 1);
  assert.equal(byType(h.tree, "AddToCartDialog").length, 0);
});

test("tarjeta abre carrito por defecto y onDismiss vuelve a ocultarlo", () => {
  const h = cardFixture();
  assert.equal(only(h.tree, "AddToCartDialog").props.visible, false);
  h.act(() => only(h.tree, "Pressable").props.onPress());
  const dialog = only(h.tree, "AddToCartDialog");
  assert.equal(dialog.props.visible, true);
  assert.equal(dialog.props.producto, product);
  assert.equal(dialog.props.tienda, store);
  h.act(() => dialog.props.onDismiss());
  assert.equal(only(h.tree, "AddToCartDialog").props.visible, false);
});

test("tarjeta mantiene nombre de dos líneas y galería cover con producto e imágenes originales", () => {
  const h = cardFixture({ images: urls });
  const name = byType(h.tree, "Text").find((node) => text(node) === product.name);
  assert.ok(name);
  assert.equal(name.props.numberOfLines, 2);
  const gallery = only(h.tree, "ProductImageCarousel");
  assert.equal(gallery.props.resizeMode, "cover");
  assert.equal(gallery.props.productId, product._id);
  assert.equal(gallery.props.images, urls);
  const carousel = carouselFixture(gallery.props);
  for (const image of byType(carousel.tree, "Image")) assert.equal(image.props.resizeMode, "cover");
});

function categoryFixture({ ready = true, products = [], extraProps = {} } = {}) {
  const h = createHarness();
  const state = { ready, products };
  const subscriptions = [];
  const timers = new Map();
  let timerId = 0;
  const categoryStore = { ...store, idUser: "synthetic-owner" };
  const props = {
    category: { id: "synthetic-category", nombre: "Categoría de prueba", creadaPor: categoryStore.idUser },
    storeIds: [store._id],
    storesById: new Map([[store._id, categoryStore]]),
    ...extraProps,
  };
  const component = load("components/productos/ComercioCategorySelection.native.jsx", {
    react: h.React,
    "react-native": { ...native, FlatList: "FlatList" },
    "react-native-paper": { ...paper, Button: "Button", Chip: "Chip" },
    "@meteorrn/core": {
      useTracker: (fn) => fn(),
      subscribe: (...args) => { subscriptions.push(args); return { ready: () => state.ready }; },
    },
    "../collections/collections": {
      SeleccionesCatalogoCollection: { findOne: () => ({ productIds: state.products.map(({ _id }) => _id) }) },
      ProductosComercioCollection: { find: (query) => ({ fetch: () => state.products.filter((item) =>
        query._id.$in.includes(item._id) && query.idTienda.$in.includes(item.idTienda)) }) },
    },
    "../../services/commerceProductCatalog": {
      COMMERCE_CATEGORY_SELECTION_LIMIT: 15,
      getCommerceCategorySelectionProducts: (items) => items,
    },
    "./ProductoCard": "ProductoCard",
  }, {
    setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  h.mount(component, props);
  return Object.assign(h, { state, subscriptions, timers });
}

test("la categoría sin productos oculta también encabezado, contador y acciones", () => {
  const h = categoryFixture();
  assert.equal(h.tree, null);
  assert.equal(h.subscriptions[0][0], "comercio.productosSeleccionCategoria");
  assert.equal(h.timers.size, 0);
});

test("categorías sin propietario o tiendas cercanas no muestran bloques vacíos", () => {
  for (const extraProps of [
    { category: { id: "category-without-owner" } },
    { storeIds: [] },
    { storesById: new Map() },
  ]) {
    const h = categoryFixture({ extraProps });
    assert.equal(h.tree, null);
    assert.equal(h.subscriptions.length, 0);
  }
});

test("carga pendiente no se interpreta como categoría vacía", () => {
  const h = categoryFixture({ ready: false });
  only(h.tree, "ActivityIndicator");
  assert.ok(texts(h.tree).includes("Categoría de prueba"));
  h.state.ready = true;
  h.render();
  assert.equal(h.tree, null);
  assert.equal(h.timers.size, 0);
});

test("una categoría vacía reaparece con productos y se oculta si se retiran", () => {
  const h = categoryFixture();
  const selectionProduct = { ...product, idTienda: store._id };
  assert.equal(h.tree, null);
  h.state.products = [selectionProduct];
  h.render();
  const list = only(h.tree, "FlatList");
  assert.equal(list.props.data[0].producto, selectionProduct);
  assert.equal(list.props.data[0].tienda._id, store._id);
  assert.equal(list.props.horizontal, true);
  assert.equal(text(only(h.tree, "Chip")), "1 productos");
  h.state.products = [];
  h.render();
  assert.equal(h.tree, null);
});

test("productos fuera del alcance de tiendas no mantienen una categoría vacía visible", () => {
  const h = categoryFixture({ products: [{ ...product, idTienda: "another-store" }] });
  assert.equal(h.tree, null);
});

test("un timeout conserva el error y reintento, no se oculta como selección vacía", () => {
  const h = categoryFixture({ ready: false });
  h.act(() => h.timers.values().next().value());
  assert.ok(texts(h.tree).some((value) => value.includes("No se pudo cargar esta selección")));
  const retry = byType(h.tree, "Button").find((node) => text(node) === "Reintentar");
  assert.ok(retry);
  const previousSelection = h.subscriptions.at(-1)[3];
  h.act(() => retry.props.onPress());
  assert.notEqual(h.subscriptions.at(-1)[3], previousSelection);
  only(h.tree, "ActivityIndicator");
});