/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Verifica eventos y políticas JS, no sustituye la física/renderización nativa.
function createHarness(reducedMotion = false) {
  const effects = [];
  const values = [];
  const springs = [];
  const cancellations = [];
  const delays = [];
  const React = {
    createContext: () => ({ Provider: "Provider" }),
    useContext: () => reducedMotion,
    useEffect: (effect) => effects.push(effect),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  };
  const animation = {
    __esModule: true,
    default: { View: "AnimatedView" },
    ReduceMotion: { System: "system" },
    useAnimatedStyle: (updater) => updater,
    useSharedValue: (initial) => {
      const value = { value: initial, get() { return this.value; }, set(next) { this.value = next; } };
      values.push(value);
      return value;
    },
    withSpring: (target, config) => { springs.push({ target, config }); return target; },
    withDelay: (delay, target) => { delays.push(delay); return target; },
    cancelAnimation: (value) => cancellations.push(value),
  };
  const native = {
    Pressable: "Pressable",
    View: "View",
    StyleSheet: {
      absoluteFillObject: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
      create: (styles) => styles,
    },
  };
  const dependencies = {
    react: { __esModule: true, default: React },
    "react-native": native,
    "react-native-reanimated": animation,
    "expo-linear-gradient": { LinearGradient: "LinearGradient" },
    "../../hooks/useSystemReducedMotion": { __esModule: true, default: () => reducedMotion },
  };
  const file = "components/cinema/CinemaMotion.native.jsx";
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
    return dependencies[name];
  } });
  return { ...exports, effects, values, springs, cancellations, delays };
}

test("la presión tiene inclinación limitada y la acción no espera al resorte", () => {
  const harness = createHarness();
  let presses = 0;
  const tree = harness.CinemaPosterPressable({ height: 238, onPress: () => { presses++; } });
  tree.props.onPressIn({ nativeEvent: { locationX: 10000, locationY: -10000 } });
  assert.equal(harness.values[0].value, 1);
  assert.equal(harness.values[1].value, 5);
  assert.equal(harness.values[2].value, 5);
  tree.props.onPress();
  assert.equal(presses, 1);
  tree.props.onPressOut();
  assert.ok(harness.values.every((value) => value.value === 0));
  const cleanup = harness.effects[0]();
  cleanup();
  assert.equal(harness.cancellations.length, 3);
});

test("movimiento reducido conserva feedback estático y acción sin inclinación", () => {
  const harness = createHarness(true);
  let presses = 0;
  const tree = harness.CinemaPosterPressable({ height: 238, onPress: () => { presses++; } });
  tree.props.onPressIn({ nativeEvent: { locationX: 158, locationY: 238 } });
  tree.props.onPress();
  assert.equal(presses, 1);
  assert.equal(harness.springs.length, 0);
  assert.equal(tree.props.style({ pressed: true })[1].opacity, 0.94);
  const transform = tree.props.children[0].props.style().transform;
  assert.equal(transform.find((entry) => "scale" in entry).scale, 1);
  assert.equal(transform.find((entry) => "rotateX" in entry).rotateX, "0deg");
});

test("el revelado es acotado y reducir movimiento elimina desplazamiento y espera", () => {
  for (const reducedMotion of [false, true]) {
    const harness = createHarness(reducedMotion);
    const tree = harness.CinemaDetailReveal({ delay: 70 });
    const cleanup = harness.effects[0]();
    const style = tree.props.style[1]();
    assert.equal(style.opacity, 1);
    assert.equal(style.transform[0].translateY, 0);
    assert.equal(harness.delays.length, reducedMotion ? 0 : 1);
    if (!reducedMotion) {
      assert.equal(harness.springs[0].config.stiffness, 220);
      assert.equal(harness.springs[0].config.damping, 22);
      assert.equal(harness.delays[0], 70);
    }
    cleanup();
    assert.equal(harness.cancellations.length, 1);
  }
});

test("la llegada escalonada de texto usa spring físico y no espera con movimiento reducido", () => {
  for (const reducedMotion of [false, true]) {
    const harness = createHarness(reducedMotion);
    const tree = harness.CinemaEntrance({ delay: 100, variant: "headline" });
    const cleanup = harness.effects[0]();
    const style = tree.props.style[1]();
    assert.equal(style.opacity, 1);
    assert.equal(style.transform[0].translateY, 0);
    assert.equal(harness.delays.length, reducedMotion ? 0 : 1);
    if (!reducedMotion) {
      assert.equal(harness.delays[0], 100);
      assert.equal(harness.springs[0].config.stiffness, 220);
      assert.equal(harness.springs[0].config.damping, 22);
    } else {
      assert.equal(harness.springs.length, 0);
    }
    cleanup();
  }
});

test("la escena del hero monta tres capas, órbita y destellos sin bloquear accesibilidad", () => {
  const harness = createHarness();
  const entranceProgress = { get: () => 1 };
  const scrollY = { get: () => 200 };
  const tree = harness.CinemaHeroAtmosphere({ entranceProgress, scrollY });
  const nodes = (node) => Array.isArray(node)
    ? node.flatMap(nodes)
    : node && typeof node === "object"
      ? [node, ...nodes(node.props?.children)]
      : [];
  const animatedViews = nodes(tree).filter((node) => node.type === "AnimatedView");
  assert.equal(tree.props.pointerEvents, "none");
  assert.equal(tree.props.accessible, false);
  assert.equal(animatedViews.length, 7);
  const cloudLayers = animatedViews.slice(0, 3).map((node) => node.props.style[2]());
  assert.ok(cloudLayers.every((style) => style.opacity > 0.4));
  assert.notEqual(cloudLayers[0].transform[0].translateX, cloudLayers[1].transform[0].translateX);
  assert.equal(animatedViews[3].props.style[1]().opacity, 0.42);
});

test("el hero mantiene atmósfera estática cuando el usuario pide reducir movimiento", () => {
  const harness = createHarness(true);
  const tree = harness.CinemaHeroAtmosphere({
    entranceProgress: { get: () => 0 },
    scrollY: { get: () => 800 },
  });
  const layers = tree.props.children.slice(0, 3);
  const styles = layers.map((node) => node.props.style[2]());
  assert.deepEqual(styles.map((style) => style.opacity), [0.46, 0.5, 0.32]);
  assert.ok(styles.every((style) => style.transform[0].translateX === 0));
});