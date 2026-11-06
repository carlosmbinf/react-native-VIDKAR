/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}, globals = {}) {
  const result = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  assert.deepEqual(result.diagnostics, []);
  const exports = {};
  vm.runInNewContext(result.outputText, {
    exports, ...globals,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
const byType = (tree, type) => nodes(tree).filter((node) => node.type === type);
function only(tree, type) {
  const found = byType(tree, type);
  assert.equal(found.length, 1, `Se esperaba un único ${String(type)}`);
  return found[0];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree == null || typeof tree === "boolean") return "";
  return typeof tree === "object" ? text(tree.props?.children) : String(tree);
}
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

function harness() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let dirty = false;
  let render;
  let tree;
  function slot(kind, initial) {
    const index = cursor++;
    if (!slots[index]) slots[index] = { kind, ...initial() };
    assert.equal(slots[index].kind, kind);
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
    useCallback(callback, deps) {
      const state = slot("callback", () => ({}));
      if (!sameDeps(state.deps, deps)) { state.value = callback; state.deps = deps?.slice(); }
      return state.value;
    },
    useEffect(fn, deps) {
      const state = slot("effect", () => ({}));
      if (!sameDeps(state.deps, deps)) effects.push({ state, fn, deps: deps?.slice() });
    },
  };
  function flush() {
    let runs = 0;
    while (dirty) {
      assert.ok(++runs < 30, "Los efectos deben estabilizarse");
      dirty = false;
      cursor = 0;
      effects = [];
      tree = render();
      assert.equal(cursor, slots.length);
      for (const effect of effects) {
        effect.state.cleanup?.();
        effect.state.deps = effect.deps;
        effect.state.cleanup = effect.fn();
      }
    }
    return tree;
  }
  return {
    React,
    get tree() { return tree; },
    mount(fn) { render = fn; dirty = true; return flush(); },
    render() { dirty = true; return flush(); },
    act(fn) { fn(); return flush(); },
  };
}

const Link = Object.assign(function Link() {}, { Trigger: "Link.Trigger", AppleZoom: "Link.AppleZoom", AppleZoomTarget: "Link.AppleZoomTarget" });
const user = { _id: "user-test", username: "student" };
const course = { _id: "course-test", titulo: "Curso de prueba", portadaUrl: "https://example.invalid/cover.png", profesorId: "teacher-test", descripcion: "Descripción", precioMensual: 10, moneda: "USD" };
const palette = { dark: false, colors: {} };
const native = {
  Platform: { OS: "ios", Version: 18 },
  StyleSheet: {
    create: (styles) => styles, absoluteFill: {}, hairlineWidth: 1,
    flatten: (style) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
  View: "View", Pressable: "Pressable", Image: "Image", ScrollView: "ScrollView",
  FlatList: "FlatList", RefreshControl: "RefreshControl", TextInput: "TextInput",
  Modal: "Modal", StatusBar: "StatusBar", Alert: { alert() {} },
  useWindowDimensions: () => ({ width: 390 }),
};
const paper = {
  ActivityIndicator: "ActivityIndicator", Button: "Button", Divider: "Divider",
  Icon: "Icon", IconButton: "IconButton", Surface: "Surface", Text: "Text", useTheme: () => palette,
};

function snapshotFixture() {
  let now = 100;
  let timer = 0;
  const timers = new Map();
  const store = load("components/courses/courseZoomSnapshot.js", {}, {
    Date: class extends Date { static now() { return now; } },
    setTimeout: (callback) => { timers.set(++timer, callback); return timer; },
    clearTimeout: (id) => timers.delete(id),
  });
  return { store, timers, advance: (ms) => { now += ms; } };
}

function fixture({ os = "ios", version = 18, reduced = false, snapshot = null, subscription = null, currentUser = user } = {}) {
  const h = harness();
  const calls = [];
  const saves = [];
  const cleared = [];
  const router = { push() {}, replace() {}, back() {} };
  const meteor = {
    user: () => currentUser, userId: () => currentUser._id,
    useTracker: (callback) => callback(),
    subscribe: () => ({ ready: () => true }),
    call: (...args) => calls.push(args),
  };
  const dependencies = {
    react: h.React, "react-native": { ...native, Platform: { OS: os, Version: version } },
    "@meteorrn/core": meteor, "expo-linear-gradient": { LinearGradient: "LinearGradient" },
    "expo-router": { Link, useRouter: () => router, useLocalSearchParams: () => ({ courseId: course._id }), useFocusEffect() {} },
    "react-native-paper": paper, "expo-blur": { BlurView: "BlurView" },
    "expo-screen-orientation": {}, "expo-secure-store": {},
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 20 }) },
    "react-native-vlc-media-player": { VLCPlayer: "VLCPlayer" },
    "../../hooks/useSystemReducedMotion": () => reduced,
    "../../hooks/useDeferredScreenData": () => true,
    "../../services/spotlight/spotlight": {},
    "../../services/meteor/client.native": { getHlsServerUrl() {} },
    "../collections/collections": { SuscripcionesCursoCollection: { findOne: () => subscription } },
    "../Header/AppHeader": { __esModule: true, default: "AppHeader", useAppHeaderContentInset: () => 80 },
    "../navigation/useSafeBack": () => () => {},
    "../motion/ServiceMotion": { ServiceEntrance: "ServiceEntrance", ServiceMotionProvider: "ServiceMotionProvider", ServicePressable: "ServicePressable", ServiceScrollViewport: "ServiceScrollViewport" },
    "../shared/AirPlayVideoPlayer.native": "AirPlayVideoPlayer",
    "./CourseCover.native": "CourseCover",
    "./courseZoomSnapshot": {
      saveCourseZoomSnapshot: (id, visual) => saves.push({ id, visual }),
      getCourseZoomSnapshot: () => snapshot,
      clearCourseZoomSnapshot: (value) => cleared.push(value),
    },
  };
  const globals = { React: h.React, console, setTimeout, clearTimeout };
  const card = load("components/courses/CoursesCatalog.native.jsx", dependencies, globals).CourseCard;
  const screen = load("components/courses/CourseDetail.native.jsx", dependencies, globals).default;
  return {
    h, calls, saves, cleared,
    mountCard: (props = {}) => h.mount(() => card({ item: course, width: 300, onPress() {}, ...props })),
    mountScreen: () => h.mount(() => screen()),
    reply: async (method, result, error = null) => {
      const call = [...calls].reverse().find((entry) => entry[0] === method);
      assert.ok(call, method);
      call[call.length - 1](error, result);
      await Promise.resolve();
      await Promise.resolve();
      h.render();
    },
  };
}

test("instantánea de portada es temporal, por ID y se limpia por identidad", () => {
  const { store, advance } = snapshotFixture();
  store.saveCourseZoomSnapshot("a", { url: "a" });
  const old = store.getCourseZoomSnapshot("a");
  store.saveCourseZoomSnapshot("b", { url: "b" });
  const current = store.getCourseZoomSnapshot("b");
  store.clearCourseZoomSnapshot(old);
  assert.equal(store.getCourseZoomSnapshot("b"), current);
  assert.equal(store.getCourseZoomSnapshot("a"), null);
  advance(5001);
  assert.equal(store.getCourseZoomSnapshot("b"), null);
  store.clearCourseZoomSnapshot(current);
});

test("card iOS enlaza una sola portada con estilos compatibles con Slot", () => {
  const f = fixture();
  f.mountCard();
  const link = only(f.h.tree, Link);
  const card = only(link, "Link.Trigger").props.children[0];
  assert.equal(Array.isArray(card.props.style), false);
  assert.equal(link.props.href.params.courseId, course._id);
  assert.equal(byType(only(link, "Link.AppleZoom"), "CourseCover").length, 1);
  assert.equal(card.props.style.borderRadius, 20);
  assert.equal(card.props.style.borderCurve, "continuous");
  link.props.onPress();
  assert.equal(f.saves[0].visual.url, course.portadaUrl);
  f.h.act(() => only(f.h.tree, "CourseCover").props.onError());
  only(f.h.tree, Link).props.onPress();
  assert.equal(f.saves[1].visual.failed, true);
});

test("card bloqueada, iOS anterior y movimiento reducido evitan el zoom", () => {
  for (const options of [{ version: 17 }, { reduced: true }, { os: "android" }]) {
    const f = fixture(options);
    f.mountCard();
    assert.equal(byType(f.h.tree, Link).length, 0);
    assert.equal(typeof only(f.h.tree, "ServicePressable").props.onPress, "function");
  }
  const locked = fixture();
  locked.mountCard({ locked: true });
  assert.equal(byType(locked.h.tree, Link).length, 0);
  assert.equal(only(locked.h.tree, "Pressable").props.onPress, undefined);
});

test("portada real y fallback comparten la representación visual en catálogo y detalle", () => {
  const h = harness();
  const cover = load("components/courses/CourseCover.native.jsx", {
    react: h.React, "react-native": native, "react-native-paper": paper,
    "expo-linear-gradient": { LinearGradient: "LinearGradient" },
  }).default;
  h.mount(() => cover({ url: course.portadaUrl, initial: "C", failed: false }));
  assert.equal(only(h.tree, "Image").props.source.uri, course.portadaUrl);
  assert.equal(only(h.tree, "Image").props.resizeMode, "cover");
  h.mount(() => cover({ url: course.portadaUrl, initial: "C", failed: true }));
  assert.equal(byType(h.tree, "Image").length, 0);
  assert.equal(text(only(h.tree, "Text")), "C");
  h.mount(() => cover({ url: null, initial: "C", failed: false }));
  assert.equal(only(h.tree, "LinearGradient").props.accessibilityLabel, "Curso sin portada disponible");
});

test("detalle muestra solo la portada provisional y habilita suscripción con datos y acceso reales", async () => {
  const snapshot = { courseId: course._id, visual: { url: course.portadaUrl, failed: true, initial: "C" } };
  const f = fixture({ snapshot });
  f.mountScreen();
  assert.equal(only(f.h.tree, "CourseCover").props.failed, true);
  assert.equal(byType(f.h.tree, "Link.AppleZoomTarget").length, 1);
  assert.equal(byType(f.h.tree, "Button").length, 0);
  assert.equal(f.cleared[0], snapshot);
  await f.reply("cursos.detalle.obtener", { course, lessons: [{ _id: "lesson", titulo: "Lección", orden: 1 }] });
  assert.equal(byType(f.h.tree, "Button").some((button) => text(button) === "Suscribirme"), false);
  await f.reply("cursos.puedeAcceder", { access: false });
  const subscribe = byType(f.h.tree, "Button").find((button) => text(button) === "Suscribirme");
  assert.ok(subscribe);
  assert.equal(only(f.h.tree, "IconButton").props.disabled, true);
  f.h.act(() => { subscribe.props.onPress(); });
  assert.equal(f.calls.find((entry) => entry[0] === "cursos.agregarAlCarrito")[1], course._id);
  assert.equal(only(f.h.tree, "ScrollView").props.bounces, false);
});

test("error al cargar el detalle permite reintentar sin exponer acciones", async () => {
  const f = fixture({ snapshot: { courseId: course._id, visual: { url: null, initial: "C" } } });
  f.mountScreen();
  await f.reply("cursos.detalle.obtener", null, { reason: "Error de prueba" });
  assert.ok(byType(f.h.tree, "Text").some((entry) => text(entry) === "Error de prueba"));
  assert.ok(byType(f.h.tree, "Button").some((entry) => text(entry) === "Reintentar"));
  assert.equal(byType(f.h.tree, "Button").some((entry) => text(entry) === "Suscribirme"), false);
});

test("suscripción activa mantiene reproducción y oculta la acción de compra", async () => {
  const f = fixture({ subscription: { estado: "ACTIVA", fechaFin: "2999-01-01" } });
  f.mountScreen();
  await f.reply("cursos.detalle.obtener", { course, lessons: [{ _id: "lesson", titulo: "Lección", orden: 1 }] });
  assert.equal(byType(f.h.tree, "Button").some((button) => text(button) === "Suscribirme"), false);
  const play = only(f.h.tree, "IconButton");
  assert.equal(play.props.disabled, false);
  f.h.act(() => { play.props.onPress(); });
  assert.equal(f.calls.find((entry) => entry[0] === "cursos.media.solicitarReproduccion")[1], "lesson");
});

test("suscripción vencida conserva la acción de renovación", async () => {
  const f = fixture({ subscription: { estado: "ACTIVA", fechaFin: "2000-01-01" } });
  f.mountScreen();
  await f.reply("cursos.detalle.obtener", { course, lessons: [] });
  await f.reply("cursos.puedeAcceder", { access: false });
  assert.ok(byType(f.h.tree, "Button").some((button) => text(button) === "Renovar"));
});

test("un fallo de actualización conserva el curso y muestra el error", async () => {
  const f = fixture();
  f.mountScreen();
  await f.reply("cursos.detalle.obtener", { course, lessons: [] });
  const refresh = only(f.h.tree, "ScrollView").props.refreshControl;
  f.h.act(() => { refresh.props.onRefresh(); });
  await f.reply("cursos.detalle.obtener", null, { reason: "No se pudo actualizar" });
  assert.ok(byType(f.h.tree, "Text").some((entry) => text(entry) === course.titulo));
  assert.ok(byType(f.h.tree, "Text").some((entry) => text(entry) === "No se pudo actualizar"));
});
