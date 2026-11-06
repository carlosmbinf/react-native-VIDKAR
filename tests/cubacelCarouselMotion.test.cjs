/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const entranceToken = Symbol("ServiceEntrance");
const cardToken = Symbol("CubaCelCard");

function loadComponent(file, dependencies, React) {
  const compiled = ts.transpileModule(
    fs.readFileSync(path.join(root, file), "utf8"),
    {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const exports = {};
  const jsx = (type, props, key) => ({ type, key, props: props || {} });
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "react") return { __esModule: true, default: React, ...React };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}

// Persistencia por instancia y posición de hook, no por ID de producto.
// renderItem se invoca de nuevo para representar una celda remontada por FlatList.
function createHarness() {
  let active;
  let cursor = 0;
  let deferredReady = true;
  let windowWidth = 390;
  const parentViewport = {
    offset: { get: () => 0 },
    layoutVersion: { get: () => 0 },
  };
  const slot = (initialize) => {
    assert.ok(active, "Los hooks necesitan una instancia activa");
    const index = cursor++;
    if (!Object.hasOwn(active, index)) active[index] = initialize();
    return active[index];
  };
  const sameDeps = (first, second) => first && second &&
    first.length === second.length && first.every((value, i) => Object.is(value, second[i]));
  const React = {
    createContext: (initial) => ({ initial, Provider: Symbol("Provider") }),
    useContext: (context) => context.initial === null ? parentViewport : false,
    useRef: (value) => slot(() => ({ current: value })),
    useState: (initial) => {
      const state = slot(() => ({ value: typeof initial === "function" ? initial() : initial }));
      return [state.value, (next) => {
        state.value = typeof next === "function" ? next(state.value) : next;
      }];
    },
    useMemo: (factory, deps) => {
      const memo = slot(() => ({}));
      if (!sameDeps(memo.deps, deps)) {
        memo.value = factory();
        memo.deps = deps;
      }
      return memo.value;
    },
    useCallback: (callback, deps) => {
      const memo = slot(() => ({}));
      if (!sameDeps(memo.deps, deps)) {
        memo.value = callback;
        memo.deps = deps;
      }
      return memo.value;
    },
    useEffect: () => { slot(() => ({})); },
    Children: {
      only: (child) => {
        assert.ok(child && !Array.isArray(child), "El viewport debe recibir una sola lista");
        return child;
      },
    },
    cloneElement: (element, props) => ({ ...element, props: { ...element.props, ...props } }),
  };
  const native = {
    FlatList: "FlatList",
    View: "View",
    Pressable: "Pressable",
    StyleSheet: { create: (styles) => styles },
    useWindowDimensions: () => ({ width: windowWidth }),
  };
  const motion = loadComponent("components/motion/ServiceMotion.native.jsx", {
    "react-native": native,
    "react-native-reanimated": {
      __esModule: true,
      default: { View: "AnimatedView" },
      Easing: { bezier: () => "ease" },
      useAnimatedRef: () => {
        const stored = React.useRef(null);
        if (!stored.current) {
          const ref = (node) => { ref.current = node; };
          stored.current = ref;
        }
        return stored.current;
      },
      useScrollOffset: () => React.useRef({ get: () => 0 }).current,
      useSharedValue: (initial) => React.useRef({
        value: initial,
        get() { return this.value; },
        set(next) { this.value = typeof next === "function" ? next(this.value) : next; },
      }).current,
    },
    "react-native-worklets": { scheduleOnRN: (callback) => callback() },
    "../../hooks/useSystemReducedMotion": { __esModule: true, default: () => false },
  }, React);
  const { default: Productos } = loadComponent("components/cubacel/Productos.native.jsx", {
    "react-native": native,
    "expo-linear-gradient": { LinearGradient: "LinearGradient" },
    "react-native-paper": {
      ActivityIndicator: "ActivityIndicator",
      Text: "Text",
      useTheme: () => ({ dark: false, colors: { onSurfaceVariant: "gray" } }),
    },
    "../../hooks/useDeferredScreenData": { __esModule: true, default: () => deferredReady },
    "../motion/ServiceMotion": { ...motion, ServiceEntrance: entranceToken },
    "./CubaCelCard.native": { __esModule: true, default: cardToken },
  }, React);
  const instances = new Map();
  function render(component, props, instance = "products") {
    if (!instances.has(instance)) instances.set(instance, []);
    const previous = active;
    const previousCursor = cursor;
    active = instances.get(instance);
    cursor = 0;
    try { return component(props); }
    finally { active = previous; cursor = previousCursor; }
  }
  return {
    motion, parentViewport,
    render: (props = {}) => render(Productos, { catalogLoading: false, ...props }),
    wrap: (props) => render(motion.ServiceScrollViewport, props, "viewport"),
    setDeferredReady: (value) => { deferredReady = value; },
    setWindowWidth: (value) => { windowWidth = value; },
  };
}

function nodes(tree, type) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  return [ ...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type) ];
}

function only(tree, type, message) {
  const found = nodes(tree, type);
  assert.equal(found.length, 1, message);
  return found[0];
}

const product = (id, amount, extra = {}) => ({
  _id: id, prices: { retail: { amount } }, promotions: [], ...extra,
});
const fixtures = () => [product("a", 10), product("b", 20), product("c", 30)];
const identity = (item) => String(item._id || item.id);
const listOf = (tree) => only(tree, "FlatList", "Debe conservar la FlatList del carrusel");

function entries(list) {
  return new Map(list.props.data.map((item, index) => {
    const tree = list.props.renderItem({ item, index });
    const entry = only(tree, entranceToken, `Falta ServiceEntrance para ${identity(item)}`);
    const card = only(entry, cardToken, `Falta CubaCelCard para ${identity(item)}`);
    assert.equal(card.props.product, item, "La entrada debe conservar el producto real");
    return [identity(item), entry];
  }));
}

function reveal(entry, id) {
  assert.equal(typeof entry.props.onReveal, "function", `La tarjeta ${id} no comunica onReveal para recordar su ID`);
  entry.props.onReveal();
}

test("Cubacel envuelve la FlatList real en ServiceScrollViewport horizontal", () => {
  const harness = createHarness();
  const tree = harness.render({ catalogProducts: fixtures() });
  const wrapper = only(tree, harness.motion.ServiceScrollViewport,
    "Falta ServiceScrollViewport alrededor de la FlatList: las cards laterales no tienen viewport horizontal");
  assert.equal(wrapper.props.horizontal, true, "El viewport de Cubacel debe medir el eje horizontal");
  const list = listOf(tree);
  assert.equal(wrapper.props.children, list, "FlatList debe ser el hijo directo del viewport");
  const wrapped = harness.wrap(wrapper.props);
  assert.equal(wrapped.props.value.parent, harness.parentViewport);
  assert.equal(listOf(wrapped).props.horizontal, true);
  assert.equal(listOf(wrapped).props.scrollEventThrottle, 16);
});

test("Cubacel no recorta las celdas pendientes de medición", () => {
  const list = listOf(createHarness().render({ catalogProducts: fixtures() }));
  assert.equal(list.props.removeClippedSubviews, false,
    "removeClippedSubviews debe ser false para mantener medibles las cards laterales");
  assert.equal(list.props.horizontal, true);
  assert.equal(list.props.scrollEnabled, true);
});

test("keyExtractor devuelve String(_id || id), estable tras reordenar", () => {
  const harness = createHarness();
  const items = [product("mongo-a", 10, { id: 99 }), product(42, 20), product(undefined, 30, { id: 7 })];
  const list = listOf(harness.render({ catalogProducts: items }));
  const extracted = items.map((item) => list.props.keyExtractor(item));
  assert.deepEqual(extracted, ["mongo-a", "42", "7"],
    "Las claves deben ser strings, priorizar _id y usar id cuando falte _id");
  const reordered = listOf(harness.render({ catalogProducts: items.slice().reverse() }));
  for (const item of items) assert.equal(reordered.props.keyExtractor(item), identity(item));
});

test("onReveal recuerda solamente el ID revelado al remontar celdas", () => {
  const harness = createHarness();
  const items = fixtures();
  const first = entries(listOf(harness.render({ catalogProducts: items })));
  for (const [id, entry] of first) {
    assert.equal(entry.props.initiallyRevealed, false, `La tarjeta ${id} nueva debe quedar pendiente`);
  }
  reveal(first.get("b"), "b");
  reveal(first.get("b"), "b");
  const remounted = entries(listOf(harness.render({ catalogProducts: items })));
  assert.equal(remounted.get("b").props.initiallyRevealed, true, "b no debe volver a atenuarse al remontarse");
  assert.equal(remounted.get("a").props.initiallyRevealed, false, "Revelar b no revela a");
  assert.equal(remounted.get("c").props.initiallyRevealed, false, "Revelar b no revela c");
});

test("actualizar y reordenar catálogo conserva revelados por ID, no por índice u objeto", () => {
  const harness = createHarness();
  const initial = entries(listOf(harness.render({ catalogProducts: fixtures() })));
  reveal(initial.get("b"), "b");
  const updated = [product("b", 90), product("c", 30), product("a", 10), product("new", 1)];
  const list = listOf(harness.render({ catalogProducts: updated }));
  assert.deepEqual(Array.from(list.props.data, identity), ["new", "a", "c", "b"]);
  const next = entries(list);
  assert.equal(next.get("b").props.initiallyRevealed, true, "b cambió de objeto/posición pero sigue revelada");
  for (const id of ["new", "a", "c"]) {
    assert.equal(next.get(id).props.initiallyRevealed, false, `${id} no debe heredar el revelado de otra posición`);
  }
  reveal(next.get("new"), "new");
  harness.render({ catalogLoading: true, catalogProducts: [] });
  harness.render({ catalogProducts: [] });
  const restored = entries(listOf(harness.render({ catalogProducts: updated.slice().reverse() })));
  assert.equal(restored.get("b").props.initiallyRevealed, true, "Carga/vacío no deben borrar la memoria de b");
  assert.equal(restored.get("new").props.initiallyRevealed, true);
  assert.equal(restored.get("c").props.initiallyRevealed, false);
});

test("el wrapper real conserva refs, callbacks y contexto vertical sin reemplazar FlatList", () => {
  const harness = createHarness();
  const list = listOf(harness.render({ catalogProducts: fixtures() }));
  const calls = [];
  const ref = { current: null };
  const original = { ...list, props: {
    ...list.props, ref,
    onScroll: (event) => calls.push(event),
    onLayout: (event) => calls.push(event),
    onContentSizeChange: (width, height) => calls.push([width, height]),
  } };
  const tree = harness.wrap({ horizontal: true, children: original });
  assert.equal(tree.props.value.parent, harness.parentViewport);
  const view = only(tree, "View", "El viewport real necesita un View medible");
  assert.equal(view.props.collapsable, false);
  assert.equal(view.props.style.width, "100%");
  const clone = listOf(tree);
  assert.equal(clone.props.data, original.props.data);
  assert.equal(clone.props.renderItem, original.props.renderItem);
  const host = {};
  const node = { getNativeScrollRef: () => host };
  clone.props.ref(node);
  assert.equal(ref.current, node);
  const layout = { nativeEvent: { layout: { width: 390 } } };
  clone.props.onScroll("scroll");
  clone.props.onLayout(layout);
  clone.props.onContentSizeChange(900, 220);
  assert.deepEqual(calls, ["scroll", layout, [900, 220]]);
  assert.equal(tree.props.value.layoutVersion.get(), 2);
});

for (const variant of ["carousel", "grid"]) {
  test(`${variant}: carga, carga diferida y vacío mantienen sus estados sin lista`, () => {
    const harness = createHarness();
    const check = (tree, loading) => {
      assert.equal(nodes(tree, "FlatList").length, 0);
      assert.equal(nodes(tree, harness.motion.ServiceScrollViewport).length, 0);
      assert.equal(nodes(tree, cardToken).length, 0);
      assert.equal(nodes(tree, "ActivityIndicator").length, loading ? 1 : 0);
      const text = only(tree, "Text", "Debe conservar el mensaje del estado");
      assert.equal(text.props.children, loading
        ? "Cargando Productos de Cubacel..."
        : "No hay productos de Cubacel disponibles ahora mismo.");
      if (variant === "carousel") {
        assert.equal(only(tree, entranceToken, "El estado conserva ServiceEntrance").props.conversionKey,
          loading ? "cubacel-loading" : "cubacel-empty");
      }
    };
    check(harness.render({ variant, catalogLoading: true, catalogProducts: fixtures() }), true);
    harness.setDeferredReady(false);
    check(harness.render({ variant, catalogProducts: fixtures() }), true);
    harness.setDeferredReady(true);
    check(harness.render({ variant, catalogProducts: [] }), false);
  });
}

test("grid conserva cards fullWidth, orden, catálogo sin mutar y layout responsive", () => {
  const harness = createHarness();
  harness.setWindowWidth(390);
  const items = [product("expensive", 50), product("cheap", 1), product("promo", 90, { promotions: [{}] })];
  const before = items.map(identity);
  const props = { variant: "grid", catalogProducts: items };
  const first = harness.render(props);
  assert.equal(nodes(first, "FlatList").length, 0);
  assert.equal(nodes(first, harness.motion.ServiceScrollViewport).length, 0);
  const cards = nodes(first, cardToken);
  assert.deepEqual(cards.map((card) => identity(card.props.product)), ["promo", "cheap", "expensive"]);
  assert.ok(cards.every((card) => card.props.fullWidth === true));
  assert.deepEqual(items.map(identity), before, "Ordenar no debe mutar el catálogo recibido");
  const columns = (tree) => nodes(tree, "View").filter((view) => nodes(view, cardToken).length === 1);
  assert.ok(columns(first).every((view) => view.props.style[1].width === "100%"));
  first.props.onLayout({ nativeEvent: { layout: { width: 900 } } });
  const resized = harness.render(props);
  assert.ok(columns(resized).every((view) => view.props.style[1].width === 284));
  assert.equal(nodes(resized, cardToken).length, 3);
});