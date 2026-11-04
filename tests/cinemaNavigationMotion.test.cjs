/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function loadModule(file, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

function motionHarness() {
  let state;
  let listener;
  let cleanup;
  let removed = 0;
  let resolveQuery;
  const query = new Promise((resolve) => { resolveQuery = resolve; });
  const { default: invokeMotionHook } = loadModule("hooks/useSystemReducedMotion.js", {
    react: {
      useState: (initial) => [state ??= initial, (value) => { state = value; }],
      useEffect: (effect) => { cleanup = effect(); },
    },
    "react-native-reanimated": { useReducedMotion: () => false },
    "react-native": { AccessibilityInfo: {
      addEventListener: (name, callback) => {
        assert.equal(name, "reduceMotionChanged");
        listener = callback;
        return { remove: () => { removed++; } };
      },
      isReduceMotionEnabled: () => query,
    } },
  });
  invokeMotionHook();
  return {
    get state() { return state; },
    get removed() { return removed; },
    emit: (value) => listener(value),
    resolveQuery,
    cleanup: () => cleanup(),
  };
}

test("la preferencia cambia en sesión y una consulta anterior no pisa el evento", async () => {
  const harness = motionHarness();
  assert.equal(harness.state, false);
  harness.emit(true);
  harness.resolveQuery(false);
  await Promise.resolve();
  assert.equal(harness.state, true);
  harness.emit(false);
  assert.equal(harness.state, false);
  harness.cleanup();
  assert.equal(harness.removed, 1);
});

test("desmontar cancela la suscripción y descarta la consulta pendiente", async () => {
  const harness = motionHarness();
  harness.cleanup();
  harness.resolveQuery(true);
  await Promise.resolve();
  assert.equal(harness.state, false);
  assert.equal(harness.removed, 1);
});

test("solo las rutas de catálogo reciben la transición y se conserva la navegación del player", () => {
  for (const reducedMotion of [false, true]) {
    const jsx = (type, props) => ({ type, props });
    const Stack = Object.assign(() => {}, { Screen: "Screen" });
    const { default: Layout } = loadModule("app/(normal)/_layout.tsx", {
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "expo-router": { Stack },
      "../../hooks/useSystemReducedMotion": { __esModule: true, default: () => reducedMotion },
    });
    const tree = Layout();
    for (const name of ["PeliculasVideos", "Cinema"]) {
      const screen = tree.props.children.find((child) => child.props.name === name);
      assert.equal(screen.props.options.animation, reducedMotion ? "none" : "slide_from_right");
      assert.equal(screen.props.options.gestureEnabled, true);
      assert.equal(screen.props.options.animationDuration, 300);
    }
    assert.equal(tree.props.screenOptions.animation, undefined);
    assert.equal(tree.props.children.find((child) => child.props.name === "PeliculaPlayer").props.options, undefined);
    assert.equal(tree.props.children.find((child) => child.props.name === "SeriesPlayer").props.options.animation, "slide_from_right");
  }
});