/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const babel = require("@babel/core");

const root = path.join(__dirname, "..");
const library = "node_modules/react-native-reanimated/src/";
const compiled = new Map();

// JS de la biblioteca instalada, incluido el transform Worklets de Expo.
// No ejecuta Hermes/JSI: solo simula transporte, reloj, hooks y vistas nativas.
function atmosphereHarness(duration, systemReducedMotion = false) {
  let now = 100;
  let frames = [];
  let effect;
  let cleanup;
  let progress;
  const context = vm.createContext({
    __DEV__: true,
    __RUNTIME_KIND: 2, // UI runtime; sin serialización ni salto JSI.
    __frameTimestamp: now,
    console,
    requestAnimationFrame: (callback) => frames.push(callback),
  });
  context.global = context;

  function load(file, dependencies = {}) {
    const filename = path.join(root, file);
    if (!compiled.has(filename)) {
      compiled.set(filename, babel.transformSync(fs.readFileSync(filename, "utf8"), {
        filename,
        configFile: false,
        babelrc: false,
        presets: ["babel-preset-expo"],
        caller: {
          name: "metro", platform: "ios", engine: "hermes", isDev: true,
          supportsStaticESM: false,
        },
      }).code);
    }
    const exports = {};
    vm.runInContext(`(function(exports, require) {\n${compiled.get(filename)}\n})`, context, {
      filename,
    })(exports, (name) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name.startsWith("@babel/runtime/")) return require(name);
      assert.fail(`Dependencia no aislada: ${name} (${file})`);
    });
    return exports;
  }

  const worklets = {
    RuntimeKind: { ReactNative: 1 },
    createSerializable: (value) => value,
    serializableMappingCache: new Map(),
    isWorkletFunction: (fn) => Boolean(fn?.__workletHash),
    scheduleOnUI: (fn) => fn(),
  };
  const common = { SHOULD_BE_USE_WEB: false, logger: { warn() {} } };
  const { ReduceMotion } = load(`${library}commonTypes.ts`);
  const utilCommon = load(`${library}animation/utilCommon.ts`, {
    "react-native-worklets": worklets,
    "../common": common,
    "../commonTypes": { ReduceMotion },
    "../ReducedMotion": {
      ReducedMotionManager: {
        jsValue: systemReducedMotion,
        uiValue: { value: systemReducedMotion },
      },
    },
    // Solo animamos números: las ramas de colores/matrices quedan fuera.
    "../Colors": { isColor: () => false },
    "./transformationMatrix/matrixUtils": { isAffineMatrixFlat: () => false },
  });
  const util = load(`${library}animation/util.ts`, {
    "react-native-worklets": worklets,
    "./utilCommon": utilCommon,
  });
  const { Easing } = load(`${library}Easing.ts`, {
    "./Bezier": load(`${library}Bezier.ts`),
  });
  assert.ok(Easing.linear.__workletHash, "Expo debe transformar los worklets reales");
  const { withTiming } = load(`${library}animation/timing.ts`, {
    "../Easing": { Easing }, "./util": util,
  });
  const { withRepeat } = load(`${library}animation/repeat.ts`, { "./util": util });
  const { valueSetter } = load(`${library}valueSetter.ts`);
  const { mutableHostDecorator } = load(`${library}mutablesCommon.ts`, {
    "./common": common,
    "./reactUtils": { isReactRendering: () => false, isFirstReactRender: () => false },
    "./valueSetter": { valueSetter },
  });
  const React = { useEffect: (fn) => { effect = fn; } };
  const jsx = (type, props) => ({ type, props });
  const atmosphere = load("components/loguin/LoginAtmosphere.native.jsx", {
    react: { __esModule: true, default: React, ...React },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      View: "View",
      StyleSheet: { create: (styles) => styles, absoluteFillObject: {} },
      useWindowDimensions: () => ({ width: 390, height: 844 }),
    },
    "react-native-svg": {
      __esModule: true, default: "Svg", Circle: "Circle", Ellipse: "Ellipse", G: "G",
    },
    "react-native-reanimated": {
      __esModule: true, default: { View: "AnimatedView" },
      Easing, ReduceMotion, withTiming, withRepeat,
      cancelAnimation: util.cancelAnimation,
      useSharedValue: (initial) => (progress ??= mutableHostDecorator({ value: initial })),
      useAnimatedStyle: (updater) => updater,
    },
  });

  return {
    get progress() { return progress; },
    render(props = {}) {
      const tree = atmosphere.default({ enabled: true, reducedMotion: false, ...props });
      const layer = tree.props.children.find((child) => child.props.duration === duration);
      assert.ok(layer, `CloudLayer real de ${duration} ms`);
      layer.type(layer.props);
      // Orden de commit de React al cambiar enabled/reducedMotion.
      const previousCleanup = cleanup;
      cleanup = undefined;
      previousCleanup?.();
      cleanup = effect();
    },
    advance(milliseconds) {
      now += milliseconds;
      context.__frameTimestamp = now;
      const pending = frames;
      frames = [];
      pending.forEach((callback) => callback(now));
    },
    unmount() {
      const previousCleanup = cleanup;
      cleanup = undefined;
      previousCleanup?.();
    },
    get pendingFrames() { return frames.length; },
  };
}

for (const duration of [17000, 25000, 36000]) {
  for (const transition of ["enabled->false", "reducedMotion->true", "unmount"]) {
    test(`CloudLayer ${duration} ms: ${transition} cancela sin arrojar`, () => {
      const h = atmosphereHarness(duration);
      h.render();
      const animation = h.progress._animation;
      assert.ok(animation, "El efecto real debe iniciar una animación");
      h.advance(duration / 2);
      assert.equal(h.progress.get(), 0.5, "withTiming real alcanza la mitad");

      // No capturamos el error esperado del código defectuoso: debe fallar aquí
      // con TypeError: callback is not a function desde repeat.ts/valueSetter.ts.
      if (transition === "unmount") h.unmount();
      else h.render(transition === "enabled->false" ? { enabled: false } : { reducedMotion: true });

      assert.equal(animation.cancelled, true);
      assert.equal(h.progress._animation, null);
      const stopped = h.progress.get();
      if (transition !== "unmount") assert.equal(stopped, 0);
      h.advance(duration * 2); // El frame ya encolado no debe reiniciar el bucle.
      assert.equal(h.progress.get(), stopped);
      assert.equal(h.pendingFrames, 0);
      h.unmount();
    });
  }

  test(`CloudLayer ${duration} ms: Never en quinto argumento vence la preferencia del sistema`, () => {
    const h = atmosphereHarness(duration, true);
    h.render();
    h.advance(duration / 2);
    assert.equal(h.progress.get(), 0.5);
    h.advance(duration / 2);
    h.advance(duration / 2);
    assert.equal(h.progress.get(), 0.5, "La segunda vuelta debe seguir aunque el sistema reduzca movimiento");
    assert.notEqual(h.progress._animation.finished, true);
    h.unmount();
    h.advance(duration);
    assert.equal(h.pendingFrames, 0);
  });
}