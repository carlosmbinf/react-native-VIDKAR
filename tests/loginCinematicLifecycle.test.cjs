/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const filename = path.join(__dirname, "../components/loguin/CinematicScreenTransition.native.jsx");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;

function mount({ active = true, appActive = true, reducedMotion = false, focused = true } = {}) {
  let time = 0;
  let completions = 0;
  const effects = [];
  const pending = new Map();
  const timeline = { get: () => time, set(value) { time = value; } };
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    createElement: (type, props, ...children) => ({ type, props, children }),
    useLayoutEffect: (fn) => effects.push(fn),
    useState: () => [true, () => {}],
  };
  const dependencies = {
    react: { __esModule: true, default: react, ...react },
    "expo-linear-gradient": { LinearGradient: "Gradient" },
    "expo-router/react-navigation": { useIsFocused: () => focused },
    "react-native": {
      Keyboard: { isVisible: () => true, addListener: () => ({ remove() {} }) },
      StyleSheet: { create: (styles) => styles },
      useWindowDimensions: () => ({ width: 390 }),
      View: "View",
    },
    "react-native-reanimated": {
      __esModule: true, default: { View: "AnimatedView" },
      cancelAnimation() {},
      Easing: { linear: (x) => x },
      ReduceMotion: { Never: "never" },
      useAnimatedStyle: () => null,
      useSharedValue: () => timeline,
      withTiming: (_end, _config, callback) => callback,
    },
    "react-native-worklets": { scheduleOnRN: (fn) => fn() },
    "./LoginAtmosphere.native": "Atmosphere",
    "./cinematicTimeline": { CINEMATIC_DURATION: 1540 },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) { return dependencies[name]; },
    setTimeout(fn, ms) { pending.set(ms, fn); return ms; },
    clearTimeout(ms) { pending.delete(ms); },
    requestAnimationFrame(fn) { fn(); return 1; },
    cancelAnimationFrame() {},
  }, { filename });
  const tree = exports.default({ active, appActive, reducedMotion, onComplete: () => completions++, login: "Login", children: "RealMenu" });
  const cleanups = effects.map((effect) => effect());
  return {
    tree,
    tick(ms) { pending.get(ms)?.(); },
    finish() { if (typeof time === "function") time(true); },
    unmount() { cleanups.forEach((cleanup) => cleanup?.()); },
    get completions() { return completions; },
    get pending() { return pending.size; },
  };
}

test("la espera del teclado tiene límite y el reloj de respaldo completa la entrega una vez", () => {
  const scene = mount();
  const [, login, , menu] = scene.tree.children;
  assert.equal(login.props.key, "login");
  assert.equal(menu.props.key, "menu");
  assert.equal(menu.props.pointerEvents, "none");
  scene.tick(230);
  assert.equal(scene.completions, 0);
  scene.tick(1990);
  scene.finish();
  assert.equal(scene.completions, 1);
  scene.unmount();
  assert.equal(scene.pending, 0);
});

test("reduce motion, segundo plano y pérdida de foco entregan el menú inmediatamente", () => {
  for (const props of [{ reducedMotion: true }, { appActive: false }, { focused: false }]) {
    const scene = mount(props);
    assert.equal(scene.completions, 1);
    assert.equal(scene.tree.children[3].props.pointerEvents, "auto");
    assert.equal(scene.pending, 0);
  }
});

test("desmontar durante el movimiento invalida la confirmación tardía del hilo UI", () => {
  const scene = mount();
  scene.tick(230);
  scene.unmount();
  scene.finish();
  assert.equal(scene.completions, 0);
  assert.equal(scene.pending, 0);
});
