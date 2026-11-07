/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Ejecuta los componentes y el almacén reales; no simula UIKit, Expo Router ni DDP.
const compiled = new Map();
function load(file, dependencies = {}, globals = {}, captureSubmit = false) {
  const key = `${file}:${captureSubmit}`;
  if (!compiled.has(key)) {
    // El handler no se renderiza antes de ready. Capturarlo sin cambiar su cuerpo
    // permite comprobar directamente su guardia además de la ausencia del botón.
    const capture = (context) => {
      const visit = (node) => {
        if (ts.isBlock(node)) {
          const statements = [];
          for (const statement of node.statements) {
            statements.push(ts.visitNode(statement, visit));
            if (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(
              (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "handleSubmit",
            )) {
              statements.push(ts.factory.createExpressionStatement(ts.factory.createCallExpression(
                ts.factory.createIdentifier("__captureSubmit"), undefined, [ts.factory.createIdentifier("handleSubmit")],
              )));
            }
          }
          return ts.factory.updateBlock(node, statements);
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (source) => ts.visitNode(source, visit);
    };
    const result = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
      transformers: captureSubmit ? { before: [capture] } : undefined,
    });
    assert.deepEqual(result.diagnostics, [], file);
    compiled.set(key, result.outputText);
  }
  const exports = {};
  vm.runInNewContext(compiled.get(key), {
    exports,
    ...globals,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}

function snapshotFixture() {
  let now = 10000;
  let nextId = 0;
  const timers = new Map();
  const allTimers = new Map();
  const store = load("components/cubacel/cubacelZoomSnapshot.js", {}, {
    Date: class extends Date { static now() { return now; } },
    setTimeout(callback, delay) {
      const id = ++nextId;
      const timer = { callback, due: now + delay };
      timers.set(id, timer);
      allTimers.set(id, timer);
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
  });
  return {
    store, timers, allTimers,
    setNow(value) { now = value; },
    advance(ms) {
      const end = now + ms;
      for (const [id, timer] of [...timers]) {
        if (timer.due <= end) {
          now = timer.due;
          timers.delete(id);
          timer.callback();
        }
      }
      now = end;
    },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
const byType = (tree, type) => nodes(tree).filter((node) => node.type === type);
function only(tree, type) {
  const found = byType(tree, type);
  assert.equal(found.length, 1, `Se esperaba un único ${type}`);
  return found[0];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree == null || typeof tree === "boolean") return "";
  return typeof tree === "object" ? text(tree.props?.children) : String(tree);
}
const button = (tree, label) => byType(tree, "Button").find((node) => text(node) === label);
const sameDeps = (a, b) => a !== undefined && b !== undefined &&
  a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

function hooksHarness() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let dirty = false;
  let renderComponent;
  let tree;
  function slot(kind, initialize) {
    const index = cursor++;
    if (!slots[index]) slots[index] = { kind, ...initialize() };
    assert.equal(slots[index].kind, kind, `Orden de hooks: ${index}`);
    return slots[index];
  }
  const React = {
    Fragment: "Fragment",
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const state = slot("state", () => ({ value: typeof initial === "function" ? initial() : initial }));
      if (!state.set) state.set = (value) => {
        const next = typeof value === "function" ? value(state.value) : value;
        if (!Object.is(next, state.value)) { state.value = next; dirty = true; }
      };
      return [state.value, state.set];
    },
    useRef(initial) { return slot("ref", () => ({ value: { current: initial } })).value; },
    useMemo(fn, deps) {
      const state = slot("memo", () => ({}));
      if (!sameDeps(state.deps, deps)) { state.value = fn(); state.deps = deps?.slice(); }
      return state.value;
    },
    useEffect(fn, deps) {
      const state = slot("effect", () => ({}));
      if (!sameDeps(state.deps, deps)) effects.push({ state, fn, deps: deps?.slice() });
    },
  };
  React.useLayoutEffect = React.useEffect;
  function renderOnce() {
    cursor = 0;
    effects = [];
    tree = renderComponent();
    assert.equal(cursor, slots.length, "Número estable de hooks");
    return tree;
  }
  function commit() {
    for (const node of nodes(tree)) {
      if (node.type === "View" && node.props.ref) {
        node.props.ref.current = { measureInWindow: (callback) => callback(10, 20, 280, 150) };
      }
    }
    for (const effect of effects) {
      effect.state.cleanup?.();
      effect.state.deps = effect.deps;
      effect.state.cleanup = effect.fn();
    }
  }
  function flush() {
    let count = 0;
    while (dirty) {
      assert.ok(++count < 20, "Los efectos deben estabilizarse");
      dirty = false;
      renderOnce();
      commit();
    }
    return tree;
  }
  return {
    React,
    get tree() { return tree; },
    mount(fn) { renderComponent = fn; dirty = true; return flush(); },
    discardedRender(fn) { renderComponent = fn; return renderOnce(); },
    commitPending() { commit(); return flush(); },
    rerender() { dirty = true; return flush(); },
    act(fn) { fn(); return flush(); },
    unmount() { for (const state of slots) state.cleanup?.(); },
  };
}

const visual = { name: "Oferta visual", priceLabel: "10 USD", blur: true, imageSource: { uri: "https://example.invalid/oferta.png" } };
const product = {
  _id: "oferta-a", name: "Oferta real", ocultarFondo: true,
  imageUrl: "https://example.invalid/oferta.png", prices: { retail: { amount: 10 } },
  requiredBeneficiaryFields: ["MOBILE_NUMBER"],
};
const Link = Object.assign(function Link() {}, { Trigger: "Link.Trigger", AppleZoom: "Link.AppleZoom", AppleZoomTarget: "Link.AppleZoomTarget" });
const Card = Object.assign(function Card() {}, { Content: "Card.Content" });
const TextInput = Object.assign(function TextInput() {}, { Affix: "TextInput.Affix" });
class AnimatedValue {
  constructor(value) { this.value = value; }
  setValue(value) { this.value = value; }
  interpolate() { return 0; }
}

function fixture(options = {}) {
  const clock = options.clock || snapshotFixture();
  const h = hooksHarness();
  const state = {
    os: options.os || "ios", version: options.version ?? 18, reduced: options.reduced || false,
    params: { productId: "oferta-a" }, dataReady: false, ready: false, product: null,
    subscriptions: [], lookups: [], calls: [], alerts: [], navigations: [], userId: "usuario-prueba",
  };
  const router = {
    push: (target) => state.navigations.push({ method: "push", target }),
    replace: (target) => state.navigations.push({ method: "replace", target }),
    back: () => state.navigations.push({ method: "back" }),
  };
  const meteor = {
    useTracker: (callback) => callback(),
    subscribe(name) { state.subscriptions.push(name); return { ready: () => state.ready }; },
    user: () => null,
    userId: () => state.userId,
    call(...args) { state.calls.push(args); },
  };
  const animation = { start: (callback) => callback?.({ finished: true }) };
  const native = {
    Platform: { OS: state.os, Version: state.version },
    StyleSheet: { create: (styles) => styles, absoluteFill: {} },
    Animated: { Value: AnimatedValue, View: "Animated.View", timing: () => animation, parallel: () => animation },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    Easing: { bezier: () => () => 0 },
    InteractionManager: { runAfterInteractions: () => ({ cancel() {} }) },
    Alert: { alert: (...args) => state.alerts.push(args) },
    UIManager: {}, LayoutAnimation: { Presets: {}, configureNext() {} },
    View: "View", Image: "Image", ImageBackground: "ImageBackground", Pressable: "Pressable",
    KeyboardAvoidingView: "KeyboardAvoidingView", ScrollView: "ScrollView",
  };
  const dependencies = {
    react: h.React, "react-native": native, "@meteorrn/core": meteor,
    "react-native-paper": { Button: "Button", Card, TextInput, ActivityIndicator: "ActivityIndicator", Text: "Text", Surface: "Surface", IconButton: "IconButton", Portal: "Portal" },
    "expo-router": { Link, router, useRouter: () => router, useLocalSearchParams: () => state.params },
    "expo-linear-gradient": { LinearGradient: "LinearGradient" },
    "expo-blur": { BlurView: "BlurView" },
    "@expo/vector-icons/MaterialCommunityIcons": "MaterialCommunityIcons",
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    "../../hooks/useDeferredScreenData": { __esModule: true, default: () => state.dataReady },
    "../../hooks/useSystemReducedMotion": { __esModule: true, default: () => state.reduced },
    "../collections/collections": { DTShopProductosCollection: { findOne: (selector) => { state.lookups.push(selector._id); return state.product; } } },
    "../Header/AppHeader": { __esModule: true, default: "AppHeader", APP_HEADER_HEIGHT: 60 },
    "../motion/ServiceMotion": { ServiceEntrance: "ServiceEntrance", ServiceMotionProvider: "ServiceMotionProvider", ServicePressable: "ServicePressable", ServiceScrollViewport: "ServiceScrollViewport" },
    "./cubacelZoomSnapshot": clock.store,
    "./Gemini_Generated_Image_rtg44brtg44brtg4.png": "fallback-image",
  };
  let submit;
  const globals = {
    React: h.React,
    __captureSubmit: (handler) => { submit = handler; },
    requestIdleCallback: () => 1,
    cancelIdleCallback() {},
    console,
  };
  const card = load("components/cubacel/CubaCelCard.native.jsx", dependencies, globals).default;
  const screen = load("components/cubacel/CubacelOfertaScreen.native.jsx", dependencies, globals, true).default;
  // El export real monta el provider y entrega la función de la pantalla como hijo.
  const renderScreen = () => {
    const wrapper = screen();
    const child = nodes(wrapper).find((node) => typeof node.type === "function");
    assert.ok(child, "Pantalla real dentro del provider");
    return child.type(child.props);
  };
  return {
    ...h, state, clock, renderScreen,
    mountCard: (props = {}) => h.mount(() => card({ product, ...props })),
    mountScreen: () => h.mount(renderScreen),
    submit: () => submit(),
    get tree() { return h.tree; },
  };
}

test("snapshot real: lectura no consumidora, id exacta, reemplazo y cleanup por identidad", () => {
  const { store, timers, allTimers } = snapshotFixture();
  store.saveCubacelZoomSnapshot("a", visual);
  const first = store.getCubacelZoomSnapshot("a");
  assert.equal(first.name, visual.name);
  assert.equal(first.priceLabel, visual.priceLabel);
  assert.equal(first.blur, true);
  assert.equal(first.imageSource, visual.imageSource);
  assert.equal(store.getCubacelZoomSnapshot("otro"), null);
  assert.equal(store.getCubacelZoomSnapshot("a"), first);
  const oldTimer = [...allTimers.values()][0];
  store.saveCubacelZoomSnapshot("a", { ...visual, name: "Reemplazo" });
  const second = store.getCubacelZoomSnapshot("a");
  assert.notEqual(first, second);
  store.clearCubacelZoomSnapshot(first);
  oldTimer.callback(); // Una tarea anterior ya encolada tampoco borra la nueva.
  assert.equal(store.getCubacelZoomSnapshot("a"), second);
  assert.equal(timers.size, 1);
  store.clearCubacelZoomSnapshot(second);
  assert.equal(store.getCubacelZoomSnapshot("a"), null);
  assert.equal(timers.size, 0);
  store.saveCubacelZoomSnapshot("a", visual);
  store.saveCubacelZoomSnapshot("", visual);
  assert.equal(store.getCubacelZoomSnapshot("a"), null);
  assert.equal(timers.size, 0);
});

test("snapshot: límites de edad, reloj atrasado y expiración por temporizador", () => {
  const f = snapshotFixture();
  f.store.saveCubacelZoomSnapshot("a", visual);
  f.setNow(9999);
  assert.equal(f.store.getCubacelZoomSnapshot("a"), null);
  f.setNow(15000);
  assert.ok(f.store.getCubacelZoomSnapshot("a"), "5000 ms aún es válido si el timer no ejecutó");
  f.setNow(15001);
  assert.equal(f.store.getCubacelZoomSnapshot("a"), null);
  f.store.saveCubacelZoomSnapshot("b", visual);
  f.advance(5000);
  assert.equal(f.store.getCubacelZoomSnapshot("b"), null);
  assert.equal(f.timers.size, 0);
});

test("iOS 18: Link push guarda snapshot antes de navegar y solo la imagen es source", () => {
  const f = fixture();
  f.mountCard();
  const link = only(f.tree, Link);
  assert.equal(link.props.push, true);
  assert.equal(link.props.asChild, true);
  assert.equal(link.props.href.pathname, "/(normal)/CubacelOferta");
  assert.equal(link.props.href.params.productId, product._id);
  assert.equal(only(link, "Link.Trigger").props.children[0].type, "Pressable");
  const zoom = only(link, "Link.AppleZoom");
  assert.equal(zoom.props.children.length, 1);
  assert.equal(zoom.props.children[0].type, "View");
  assert.equal(zoom.props.children[0].props.collapsable, false);
  assert.equal(only(zoom, "ImageBackground").props.source.uri, product.imageUrl);
  assert.equal(byType(zoom, "Text").length, 0);
  assert.equal(f.clock.store.getCubacelZoomSnapshot(product._id), null);
  let prevented = false;
  link.props.onPress({ preventDefault: () => { prevented = true; } });
  const saved = f.clock.store.getCubacelZoomSnapshot(product._id);
  assert.equal(prevented, false);
  assert.equal(saved.name, product.name);
  assert.equal(saved.priceLabel, "10 USD");
  assert.equal(saved.blur, true);
  assert.equal(saved.imageSource.uri, product.imageUrl);
  assert.equal(saved.imageUrl, product.imageUrl);
  assert.equal(f.state.navigations.length, 0, "La navegación la realiza Link, no router.push");
  const animatedCard = only(f.tree, "Animated.View");
  const animatedTransform = animatedCard.props.style.find((style) => style?.transform)?.transform;
  assert.equal(animatedTransform.length, 4, "el card conserva su efecto de presión al iniciar el zoom");
  only(f.tree, "Pressable").props.onPressIn();
  only(f.tree, "Pressable").props.onPressOut();
});

test("carrusel y catálogo usan un único marco nativo con las mismas dimensiones de imagen", () => {
  for (const fullWidth of [false, true]) {
    const f = fixture();
    f.mountCard({ fullWidth });
    const link = only(f.tree, Link);
    const zoom = only(link, "Link.AppleZoom");
    const frame = zoom.props.children[0];
    assert.equal(frame.type, "View");
    assert.equal(frame.props.collapsable, false, "Fabric no debe sustituir el marco por sus capas");
    assert.equal(frame.props.style.width, "100%");
    assert.equal(frame.props.style.height, 200, "No depende de porcentajes en una lista horizontal");
    assert.equal(frame.props.style.borderRadius, 20);
    assert.equal(frame.props.style.overflow, "hidden");
    assert.equal(frame.props.children.length, 1);
    const image = only(frame, "ImageBackground");
    assert.equal(image.props.source.uri, product.imageUrl);
    assert.equal(image.props.blurRadius, 35);
    assert.equal(byType(frame, "Text").length, 0);
    link.props.onPress({ preventDefault: () => assert.fail("Un toque normal debe iniciar el zoom") });
    const saved = f.clock.store.getCubacelZoomSnapshot(product._id);
    assert.equal(saved.imageSource.uri, image.props.source.uri);
    assert.equal(link.props.href.pathname, "/(normal)/CubacelOferta");
    assert.equal(link.props.href.params.productId, product._id);
    assert.equal(f.state.navigations.length, 0);
  }
});

test("el detalle conserva el fondo alternativo cuando la imagen de origen falló", () => {
  const f = fixture();
  f.clock.store.saveCubacelZoomSnapshot(product._id, {
    ...visual, imageSource: "fallback-image", imageUrl: product.imageUrl,
  });
  f.state.product = product;
  f.state.dataReady = true;
  f.state.ready = true;
  f.mountScreen();
  assert.equal(only(only(f.tree, "Link.AppleZoomTarget"), "ImageBackground").props.source, "fallback-image");
  f.state.product = { ...product, imageUrl: "https://example.invalid/nueva.png" };
  f.rerender();
  assert.equal(only(only(f.tree, "Link.AppleZoomTarget"), "ImageBackground").props.source.uri, f.state.product.imageUrl);
  f.state.product = product;
  f.rerender();
  assert.equal(only(only(f.tree, "Link.AppleZoomTarget"), "ImageBackground").props.source.uri, product.imageUrl);
});

test("pulsación larga bloquea Link y no guarda snapshot; el overlay no es source", () => {
  const f = fixture();
  f.mountCard();
  f.act(() => only(f.tree, "Pressable").props.onPressIn());
  only(f.tree, "Pressable").props.onLongPress();
  let prevented = false;
  only(f.tree, Link).props.onPress({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true, "Bloquea inmediatamente, antes del rerender del overlay");
  f.rerender();
  assert.equal(byType(f.tree, "Link.AppleZoom").length, 1);
  prevented = false;
  only(f.tree, Link).props.onPress({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.clock.store.getCubacelZoomSnapshot(product._id), null);
  assert.equal(f.state.navigations.length, 0);
});

test("Android, iOS anterior y movimiento reducido mantienen router.push sin zoom", () => {
  for (const config of [{ os: "android", version: 35 }, { os: "ios", version: 17 }, { os: "ios", version: 18, reduced: true }]) {
    const f = fixture(config);
    f.mountCard();
    assert.equal(byType(f.tree, Link).length, 0);
    assert.equal(byType(f.tree, "Link.AppleZoom").length, 0);
    f.act(() => only(f.tree, "Pressable").props.onPress());
    assert.equal(f.state.navigations.length, 1);
    assert.equal(f.state.navigations[0].method, "push");
    assert.equal(f.state.navigations[0].target.pathname, "/(normal)/CubacelOferta");
    assert.equal(f.state.navigations[0].target.params.productId, product._id);
    assert.equal(f.clock.store.getCubacelZoomSnapshot(product._id), null);
  }
});

test("render descartado no consume snapshot; commit muestra target y carga sin formulario", () => {
  const clock = snapshotFixture();
  clock.store.saveCubacelZoomSnapshot(product._id, visual);
  const original = clock.store.getCubacelZoomSnapshot(product._id);
  const discarded = fixture({ clock });
  const abandonedTree = discarded.discardedRender(discarded.renderScreen);
  assert.equal(byType(abandonedTree, "Link.AppleZoomTarget").length, 1);
  assert.equal(clock.store.getCubacelZoomSnapshot(product._id), original);
  const f = fixture({ clock });
  f.mountScreen();
  const target = only(f.tree, "Link.AppleZoomTarget");
  const hero = only(target, "ImageBackground");
  assert.equal(hero.props.source.uri, visual.imageSource.uri);
  assert.equal(hero.props.blurRadius, 35);
  assert.equal(text(target), "", "solo la imagen del hero es el destino de zoom");
  assert.ok(text(f.tree).includes(visual.name));
  assert.ok(text(f.tree).includes(visual.priceLabel));
  assert.ok(text(f.tree).includes("Cargando oferta Cubacel..."));
  assert.equal(byType(f.tree, "ActivityIndicator").length, 1);
  assert.equal(byType(f.tree, TextInput).length, 0);
  assert.equal(button(f.tree, "Confirmar compra"), undefined);
  assert.equal(f.state.subscriptions.length, 0);
  assert.equal(clock.store.getCubacelZoomSnapshot(product._id), null, "El efecto consume solo después del commit");
  f.submit();
  assert.equal(f.state.calls.length, 0);
  assert.equal(f.state.alerts.length, 0);
});

test("commit tardío de un detalle no elimina un snapshot nuevo", () => {
  const f = fixture();
  f.clock.store.saveCubacelZoomSnapshot(product._id, visual);
  f.discardedRender(f.renderScreen);
  f.clock.store.saveCubacelZoomSnapshot(product._id, { ...visual, name: "Nueva transición" });
  const latest = f.clock.store.getCubacelZoomSnapshot(product._id);
  f.commitPending();
  assert.equal(f.clock.store.getCubacelZoomSnapshot(product._id), latest);
  assert.equal(latest.name, "Nueva transición");
});

test("detalle sin zoom ignora snapshot y muestra el producto solo tras la carga", () => {
  for (const config of [{ os: "android", version: 35 }, { os: "ios", version: 17 }, { os: "ios", version: 18, reduced: true }]) {
    const f = fixture(config);
    f.clock.store.saveCubacelZoomSnapshot(product._id, visual);
    f.mountScreen();
    assert.ok(text(f.tree).includes("Cargando oferta Cubacel..."));
    assert.equal(byType(f.tree, "Link.AppleZoomTarget").length, 0);
    assert.equal(byType(f.tree, TextInput).length, 0);
    f.state.dataReady = true;
    f.state.ready = true;
    f.state.product = product;
    f.rerender();
    assert.equal(byType(f.tree, "Link.AppleZoomTarget").length, 0);
    assert.ok(text(f.tree).includes(product.name));
    assert.ok(button(f.tree, "Confirmar compra"));
  }
});

test("producto disponible antes de ready mantiene guardia; al estar listo habilita formulario y compra", () => {
  const f = fixture();
  f.clock.store.saveCubacelZoomSnapshot(product._id, visual);
  f.mountScreen();
  f.state.product = product;
  f.state.dataReady = true;
  f.rerender();
  assert.ok(f.state.subscriptions.includes("productosDtShop"));
  assert.ok(f.state.lookups.includes(product._id));
  assert.ok(text(f.tree).includes(product.name));
  assert.ok(text(f.tree).includes("Cargando oferta Cubacel..."));
  assert.equal(byType(f.tree, TextInput).length, 0);
  assert.equal(button(f.tree, "Confirmar compra"), undefined);
  f.submit();
  assert.equal(f.state.calls.length, 0);
  assert.equal(f.state.alerts.length, 0);
  f.state.ready = true;
  f.rerender();
  assert.equal(byType(f.tree, TextInput).length, 2);
  assert.ok(button(f.tree, "Confirmar compra"));
  assert.equal(byType(f.tree, "ActivityIndicator").length, 0);
  const fields = byType(f.tree, TextInput);
  f.act(() => fields.find((node) => node.props.label === "Nombre de la persona").props.onChangeText("Persona"));
  f.act(() => byType(f.tree, TextInput).find((node) => node.props.label === "MOBILE NUMBER").props.onChangeText("12345678"));
  f.act(() => button(f.tree, "Confirmar compra").props.onPress());
  assert.equal(f.state.calls.length, 1);
  assert.equal(f.state.calls[0][0], "insertarCarrito");
  assert.equal(f.state.calls[0][1].producto, product);
  assert.equal(f.state.calls[0][1].movilARecargar, "+5312345678");
});

test("el resumen permanece delante de la imagen y el desplazamiento no rebota", () => {
  for (const config of [{ os: "ios", version: 18 }, { os: "android", version: 35 }, { os: "ios", version: 18, reduced: true }]) {
    const f = fixture(config);
    f.state.product = { ...product, description: "Condiciones de la oferta" };
    f.state.dataReady = true;
    f.state.ready = true;
    f.mountScreen();
    const scroll = only(f.tree, "ScrollView");
    assert.equal(scroll.props.bounces, false);
    assert.equal(scroll.props.alwaysBounceVertical, false);
    assert.equal(scroll.props.overScrollMode, "never");
    assert.notEqual(scroll.props.scrollEnabled, false);
    const summary = byType(scroll, "View").find((node) => text(node).includes("Resumen de la oferta") && node.props.style?.backgroundColor === "#0f172a");
    assert.ok(summary, "el fondo del resumen no depende de la animación de entrada");
    assert.equal(summary.props.style.zIndex, 1);
    assert.ok(summary.props.style.marginTop < 0);
    assert.equal(only(summary, "ServiceEntrance").props.delay, 60);
    const expand = only(summary, "ServicePressable");
    assert.equal(expand.props.accessibilityState.expanded, false);
    f.act(() => expand.props.onPress());
    assert.equal(only(byType(f.tree, "View").find((node) => node.props.style?.backgroundColor === "#0f172a"), "ServicePressable").props.accessibilityState.expanded, true);
    assert.ok(button(f.tree, "Confirmar compra"));
  }
});

test("deep link inválido, carga sin snapshot y producto inexistente", () => {
  for (const id of [undefined, "", ["oferta-a"]]) {
    const f = fixture();
    f.state.params = { productId: id };
    f.mountScreen();
    assert.ok(text(f.tree).includes("No se recibió una oferta válida"));
    assert.equal(byType(f.tree, TextInput).length, 0);
    assert.equal(f.state.lookups.length, 0);
    f.submit();
    assert.equal(f.state.calls.length, 0);
  }
  const f = fixture();
  f.clock.store.saveCubacelZoomSnapshot("otra-oferta", visual);
  f.mountScreen();
  assert.ok(text(f.tree).includes("Cargando oferta Cubacel..."));
  assert.equal(byType(f.tree, "Link.AppleZoomTarget").length, 0);
  assert.equal(button(f.tree, "Confirmar compra"), undefined);
  f.state.dataReady = true;
  f.state.ready = true;
  f.rerender();
  assert.ok(text(f.tree).includes("La oferta ya no está disponible"));
  assert.equal(byType(f.tree, TextInput).length, 0);
  f.act(() => button(f.tree, "Volver a Cubacel").props.onPress());
  assert.equal(f.state.navigations[0].method, "replace");
  assert.equal(f.state.navigations[0].target, "/(normal)/ProductosCubacelCards");
  f.submit();
  assert.equal(f.state.calls.length, 0);
});

test("snapshot provisional desaparece si la suscripción confirma que no existe el producto", () => {
  const f = fixture();
  f.clock.store.saveCubacelZoomSnapshot(product._id, visual);
  f.mountScreen();
  assert.equal(byType(f.tree, "Link.AppleZoomTarget").length, 1);
  f.state.dataReady = true;
  f.state.ready = true;
  f.rerender();
  assert.ok(text(f.tree).includes("La oferta ya no está disponible"));
  assert.equal(byType(f.tree, "Link.AppleZoomTarget").length, 0);
  assert.equal(byType(f.tree, TextInput).length, 0);
  assert.equal(button(f.tree, "Confirmar compra"), undefined);
  f.submit();
  assert.equal(f.state.calls.length, 0);
});