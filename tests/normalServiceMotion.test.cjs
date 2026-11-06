/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");

// Comprueba la política JS; no sustituye una prueba visual nativa.
function motionHarness(reducedMotion, actualReducedMotion = reducedMotion, viewport = null) {
  const effects = [];
  const delays = [];
  const timings = [];
  const values = [];
  const cancelled = [];
  const reactions = [];
  const stateChanges = [];
  const refs = [];
  let preferenceListener;
  const React = {
    createContext: (initial) => ({ Provider: "Provider", initial }),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    cloneElement: (element, props) => ({ ...element, props: { ...element.props, ...props } }),
    Children: { only: (element) => element },
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
    useContext: (context) => context.initial === null ? viewport : reducedMotion,
    useEffect: (effect) => effects.push(effect),
    useRef: (value) => ({ current: value }),
    useState: (value) => [value, (next) => stateChanges.push(next)],
  };
  const animation = {
    __esModule: true,
    default: { View: "AnimatedView" },
    Easing: { bezier: () => "ease" },
    ReduceMotion: { Never: "never" },
    measure: (ref) => ref.measurement || null,
    useAnimatedReaction: (prepare, react) => {
      const reaction = () => react(prepare());
      reaction.prepare = prepare;
      reactions.push(reaction);
    },
    useAnimatedRef: () => {
      const ref = (node) => { ref.current = node; };
      refs.push(ref);
      return ref;
    },
    useAnimatedStyle: (updater) => updater,
    useScrollOffset: () => ({ get: () => 0 }),
    useSharedValue: (initial) => {
      const value = { value: initial, get() { return this.value; }, set(next) { this.value = typeof next === "function" ? next(this.value) : next; } };
      values.push(value);
      return value;
    },
    withDelay: (delay, value) => { delays.push(delay); return value; },
    withTiming: (value, config) => { timings.push(config); return value; },
    cancelAnimation: (value) => cancelled.push(value),
  };
  const dependencies = {
    react: { __esModule: true, default: React, ...React },
    "react-native": {
      AccessibilityInfo: {
        isReduceMotionEnabled: () => Promise.resolve(actualReducedMotion),
        addEventListener: (_event, listener) => {
          preferenceListener = listener;
          return { remove: () => { preferenceListener = undefined; } };
        },
      },
      Pressable: "Pressable",
      View: "View",
      StyleSheet: { create: (styles) => styles },
    },
    "react-native-reanimated": animation,
    "react-native-worklets": { scheduleOnRN: (callback, ...args) => callback(...args) },
    "../../hooks/useSystemReducedMotion": { __esModule: true, default: () => reducedMotion },
  };
  const file = "components/motion/ServiceMotion.native.jsx";
  const compiled = ts.transpileModule(source(file), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
    return dependencies[name];
  } });
  return { ...exports, effects, delays, timings, values, cancelled, reactions, refs, stateChanges, changePreference: () => preferenceListener?.() };
}

test("la visibilidad usa los límites reales del área de desplazamiento", () => {
  const { isServiceEntranceVisible } = motionHarness(false);
  const viewport = { pageX: 0, pageY: 100, width: 300, height: 400 };
  assert.equal(isServiceEntranceVisible(viewport, { pageX: 0, pageY: 120, width: 300, height: 100 }), true);
  assert.equal(isServiceEntranceVisible(viewport, { pageX: 0, pageY: 510, width: 300, height: 100 }), false);
  assert.equal(isServiceEntranceVisible(viewport, { pageX: 0, pageY: 480, width: 300, height: 100 }), false);
  assert.equal(isServiceEntranceVisible(viewport, { pageX: 0, pageY: 470, width: 300, height: 100 }), true);
  assert.equal(isServiceEntranceVisible(viewport, { pageX: 350, pageY: 120, width: 100, height: 100 }), false);
  assert.equal(isServiceEntranceVisible(viewport, { pageX: 0, pageY: 490, width: 100, height: 8 }), true);
  assert.equal(isServiceEntranceVisible(viewport, null), false);
});

test("una tarjeta horizontal debe estar visible en el carrusel y en la pantalla vertical", () => {
  const { isServiceEntranceVisible } = motionHarness(false);
  const parent = {
    viewportRef: { measurement: { pageX: 0, pageY: 0, width: 300, height: 500 } },
    topInset: 40,
    bottomInset: 20,
    parent: null,
  };
  const horizontal = {
    viewportRef: { measurement: { pageX: 0, pageY: 620, width: 300, height: 220 } },
    topInset: 0,
    bottomInset: 0,
    parent,
  };
  const product = { pageX: 20, pageY: 640, width: 180, height: 200 };
  assert.equal(isServiceEntranceVisible(horizontal, product), false);
  horizontal.viewportRef.measurement.pageY = 180;
  product.pageY = 200;
  assert.equal(isServiceEntranceVisible(horizontal, product), true);
  product.pageX = 284;
  assert.equal(isServiceEntranceVisible(horizontal, product), false);
});

test("una tarjeta del carrusel reevalúa su foco al desplazarse el viewport padre", () => {
  const shared = (value) => ({ value, get() { return this.value; }, set(next) { this.value = next; } });
  const parentOffset = shared(0);
  const parent = {
    viewportRef: { measurement: { pageX: 0, pageY: 0, width: 300, height: 400 } },
    offset: parentOffset,
    layoutVersion: shared(0),
    topInset: 0,
    bottomInset: 0,
    parent: null,
  };
  const horizontal = {
    viewportRef: { measurement: { pageX: 0, pageY: 600, width: 300, height: 220 } },
    offset: shared(0),
    layoutVersion: shared(0),
    topInset: 0,
    bottomInset: 0,
    parent,
  };
  const motion = motionHarness(false, false, horizontal);
  const entry = motion.ServiceEntrance({});
  entry.props.ref.measurement = { pageX: 20, pageY: 620, width: 180, height: 200 };
  const reaction = motion.reactions[0];
  const beforeScroll = reaction.prepare();
  assert.equal(motion.stateChanges.length, 0);
  horizontal.viewportRef.measurement.pageY = 180;
  entry.props.ref.measurement.pageY = 200;
  parentOffset.set(400);
  const afterScroll = reaction.prepare();
  assert.notDeepEqual(afterScroll, beforeScroll);
  reaction();
  assert.equal(motion.stateChanges.length, 1);
});

test("la tarjeta lateral se revela al desplazar el carrusel sin scroll vertical", () => {
  const shared = (value) => ({ value, get() { return this.value; }, set(next) { this.value = next; } });
  const parent = {
    viewportRef: { measurement: { pageX: 0, pageY: 0, width: 390, height: 844 } },
    offset: shared(0), layoutVersion: shared(0), parent: null,
  };
  const horizontal = {
    viewportRef: { measurement: { pageX: 0, pageY: 260, width: 390, height: 235 } },
    offset: shared(0), layoutVersion: shared(0), parent,
  };
  const motion = motionHarness(false, false, horizontal);
  let revealed = 0;
  const entry = motion.ServiceEntrance({ onReveal: () => { revealed += 1; } });
  entry.props.ref.measurement = { pageX: 405, pageY: 275, width: 315, height: 205 };
  const reaction = motion.reactions[0];
  const before = reaction.prepare();
  reaction();
  assert.equal(revealed, 0);
  horizontal.offset.set(315);
  entry.props.ref.measurement.pageX = 90;
  assert.notDeepEqual(reaction.prepare(), before);
  assert.equal(parent.offset.get(), 0);
  reaction();
  assert.equal(revealed, 1);
  horizontal.offset.set(0);
  entry.props.ref.measurement.pageX = 405;
  reaction();
  horizontal.offset.set(315);
  entry.props.ref.measurement.pageX = 90;
  reaction();
  assert.equal(revealed, 1);
});

test("las secciones se activan al entrar y no se repiten al regresar", () => {
  const shared = (value) => ({ get: () => value });
  const viewportRef = { measurement: { pageX: 0, pageY: 0, width: 300, height: 400 } };
  const viewport = { viewportRef, offset: shared(0), layoutVersion: shared(0), topInset: 50, bottomInset: 0 };
  const motion = motionHarness(false, false, viewport);
  const first = motion.ServiceEntrance({});
  const second = motion.ServiceEntrance({});
  first.props.ref.measurement = { pageX: 0, pageY: 450, width: 200, height: 100 };
  second.props.ref.measurement = { pageX: 0, pageY: 650, width: 200, height: 100 };
  motion.reactions.forEach((reaction) => reaction());
  assert.equal(motion.stateChanges.length, 0);
  first.props.ref.measurement.pageY = 350;
  motion.reactions.forEach((reaction) => reaction());
  assert.equal(motion.stateChanges.length, 1);
  second.props.ref.measurement.pageY = 350;
  motion.reactions.forEach((reaction) => reaction());
  motion.reactions.forEach((reaction) => reaction());
  assert.equal(motion.stateChanges.length, 2);
});

test("las entradas responden al nuevo tamaño y respetan secciones ya reveladas", () => {
  const shared = (value) => ({ get: () => value });
  const viewportRef = { measurement: { pageX: 0, pageY: 0, width: 300, height: 300 } };
  const viewport = { viewportRef, offset: shared(0), layoutVersion: shared(0), topInset: 0, bottomInset: 0 };
  const motion = motionHarness(false, false, viewport);
  let revealed = 0;
  const pending = motion.ServiceEntrance({ onReveal: () => { revealed += 1; } });
  const recycled = motion.ServiceEntrance({ initiallyRevealed: true });
  pending.props.ref.measurement = { pageX: 0, pageY: 350, width: 200, height: 100 };
  recycled.props.ref.measurement = { pageX: 0, pageY: 100, width: 200, height: 100 };
  motion.reactions.forEach((reaction) => reaction());
  assert.equal(revealed, 0);
  assert.equal(recycled.props.style[1]().opacity, 1);
  viewportRef.measurement.height = 500;
  motion.reactions.forEach((reaction) => reaction());
  assert.equal(revealed, 1);

  const reduced = motionHarness(true, true, viewport);
  const entry = reduced.ServiceEntrance({});
  entry.props.ref.measurement = { pageX: 0, pageY: 100, width: 200, height: 100 };
  reduced.reactions[0]();
  assert.equal(reduced.stateChanges.length, 0);
  assert.equal(entry.props.style[1]().opacity, 1);
});

test("no registra una entrada cuando la sección ya se desmontó", () => {
  const shared = (value) => ({ get: () => value });
  const viewportRef = { measurement: { pageX: 0, pageY: 0, width: 300, height: 300 } };
  const viewport = { viewportRef, offset: shared(0), layoutVersion: shared(0), topInset: 0, bottomInset: 0 };
  const motion = motionHarness(false, false, viewport);
  let revealed = 0;
  const entry = motion.ServiceEntrance({ onReveal: () => { revealed += 1; } });
  entry.props.ref.measurement = { pageX: 0, pageY: 100, width: 200, height: 100 };
  const unmount = motion.effects[1]();
  unmount();
  motion.reactions[0]();
  assert.equal(revealed, 0);
  assert.equal(motion.stateChanges.length, 0);
});

test("el viewport conserva callbacks y la referencia de la lista anidada", () => {
  const motion = motionHarness(false);
  const calls = [];
  const existingRef = { current: null };
  const child = { type: "ScrollView", props: {
    ref: existingRef,
    onScroll: () => calls.push("scroll"),
    onLayout: () => calls.push("layout"),
    onContentSizeChange: () => calls.push("content"),
  } };
  const wrapper = motion.ServiceScrollViewport({ children: child });
  const clone = wrapper.props.children[0].props.children[0];
  const host = {};
  const nativeScroll = { getNativeScrollRef: () => host };
  const list = { getNativeScrollRef: () => nativeScroll };
  clone.props.ref(list);
  assert.equal(existingRef.current, list);
  assert.equal(clone.props.ref.current, list);
  assert.equal(motion.refs[0].current, host);
  clone.props.onScroll();
  clone.props.onLayout({});
  clone.props.onContentSizeChange(300, 900);
  assert.deepEqual(calls, ["scroll", "layout", "content"]);
  assert.equal(motion.values[0].value, 2);
});

test("el viewport horizontal conserva el padre vertical para medir sus dos ejes", () => {
  const parentViewport = { offset: { get: () => 0 }, layoutVersion: { get: () => 0 } };
  const motion = motionHarness(false, false, parentViewport);
  const child = { type: "FlatList", props: {} };
  const wrapper = motion.ServiceScrollViewport({ children: child, horizontal: true });
  const horizontalViewport = wrapper.props.value;
  const view = wrapper.props.children[0];
  assert.equal(horizontalViewport.parent, parentViewport);
  assert.equal(view.props.style.width, "100%");
});

test("las entradas son visibles y movimiento reducido evita espera y desplazamiento", async () => {
  for (const reduced of [false, true]) {
    const motion = motionHarness(reduced);
    const tree = motion.ServiceEntrance({ delay: 60, variant: "hero" });
    const initialStyle = tree.props.style[1]();
    assert.equal(initialStyle.opacity, reduced ? 1 : 0.08);
    assert.equal(initialStyle.transform[0].translateY, reduced ? 0 : 36);
    assert.equal(initialStyle.transform[1].perspective, 1100);
    assert.equal(initialStyle.transform[2].scale, reduced ? 1 : 0.88);
    assert.equal(initialStyle.transform[3].rotateX, reduced ? "0deg" : "9deg");
    const cleanup = motion.effects[0]();
    await Promise.resolve();
    assert.equal(tree.props.style[1]().opacity, 1);
    assert.deepEqual(motion.delays, reduced ? [] : [60]);
    if (!reduced) {
      assert.equal(motion.timings[0].duration, 880);
      assert.equal(motion.timings[0].reduceMotion, "never");
    }
    cleanup();
    assert.ok(motion.cancelled.length > 0);
  }
});

test("no inicia movimiento si la preferencia actual difiere del estado de arranque", async () => {
  const motion = motionHarness(false, true);
  const tree = motion.ServiceEntrance({ variant: "hero" });
  motion.effects[0]();
  await Promise.resolve();
  assert.equal(tree.props.style[1]().transform[0].translateY, 0);
  assert.equal(motion.timings.length, 0);
});

test("descarta una consulta anterior a un cambio de accesibilidad", async () => {
  let resolvePreference;
  const pending = new Promise((resolve) => { resolvePreference = resolve; });
  const motion = motionHarness(false, pending);
  const tree = motion.ServiceEntrance({ variant: "hero" });
  const cleanup = motion.effects[0]();
  motion.changePreference();
  resolvePreference(false);
  await pending;
  await Promise.resolve();
  assert.equal(tree.props.style[1]().transform[0].translateY, 0);
  assert.equal(motion.timings.length, 0);
  cleanup();
});

test("la pulsación conserva la acción y su feedback con movimiento reducido", () => {
  for (const reduced of [false, true]) {
    const motion = motionHarness(reduced);
    let pressed = 0;
    const tree = motion.ServicePressable({ onPress: () => { pressed += 1; } });
    const button = tree.props.children[0];
    button.props.onPressIn({});
    button.props.onPress();
    assert.equal(pressed, 1);
    assert.equal(motion.values[0].value, reduced ? 1 : 0.97);
    if (reduced) assert.equal(button.props.style({ pressed: true })[1].opacity, 0.8);
    button.props.onPressOut({});
    assert.equal(motion.values[0].value, 1);
  }
});

test("la pulsación conserva callbacks y limita la decoración a la preferencia actual", () => {
  const motion = motionHarness(false);
  const events = [];
  const button = motion.ServicePressable({
    onPressIn: () => events.push("in"),
    onPressOut: () => events.push("out"),
  }).props.children[0];
  button.props.onPressIn({});
  button.props.onPressOut({});
  assert.deepEqual(events, ["in", "out"]);
  assert.ok(motion.timings.every((config) => config.reduceMotion === "never"));

  const reduced = motionHarness(true);
  const atmosphere = reduced.ServiceAtmosphere({});
  reduced.effects.forEach((effect) => effect());
  assert.equal(atmosphere.props.pointerEvents, "none");
  assert.equal(atmosphere.props.accessible, false);
  assert.equal(atmosphere.props.style[2]().transform[0].scale, 1);
  assert.equal(reduced.timings.length, 0);
});

test("las pantallas nativas animan secciones estables, no las filas de compras", () => {
  const oferta = source("components/cubacel/CubacelOfertaScreen.native.jsx");
  const remesas = source("components/remesas/RemesasScreen.native.jsx");
  const compras = source("components/compras/MisComprasScreen.native.jsx");
  for (const screen of [oferta, remesas, compras]) {
    assert.match(screen, /<ServiceMotionProvider>/);
    assert.match(screen, /<ServiceEntrance/);
    assert.doesNotMatch(screen, /<ServiceEntrance[^>]*>\s*<AppHeader/);
  }
  assert.match(oferta, /<ServiceEntrance[^>]*style={styles\.heroCopy}/);
  assert.match(oferta, /<ServicePressable[\s\S]*?accessibilityState={{[\s\S]*?expanded:/);
  assert.match(remesas, /<ServiceEntrance[^>]*>[\s\S]*?<FormularioRemesa\s*\/>/);
  assert.match(compras, /<ServiceEntrance[^>]*>[\s\S]*?styles\.kpiContainer/);
  assert.doesNotMatch(compras.slice(compras.indexOf("{/* EMPTY STATE */}"), compras.indexOf("{/* DETAIL & EVIDENCE MODAL")), /ServiceEntrance|ServicePressable/);
});