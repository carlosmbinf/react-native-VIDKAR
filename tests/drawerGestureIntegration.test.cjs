/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Simula eventos JS; el reconocimiento de gestos nativo requiere dispositivo.
function loadModule(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
    console,
    process,
  });
  return exports;
}

function createDrawerHarness({ scrollable = true, contentAtTopRef, lifecycle = false, ...props } = {}) {
  const responders = [];
  const animations = [];
  const animatedValues = [];
  const hooks = [];
  let hookIndex = 0;
  let effects = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: "Fragment",
    useEffect: (effect, deps) => {
      const index = hookIndex++;
      const previous = hooks[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        hooks[index] = { deps, cleanup: previous?.cleanup };
        effects.push(() => {
          hooks[index].cleanup?.();
          hooks[index].cleanup = effect();
        });
      }
    },
    useRef: (value) => {
      const index = hookIndex++;
      return hooks[index] || (hooks[index] = { current: value });
    },
    useState: (value) => {
      const index = hookIndex++;
      if (!hooks[index]) hooks[index] = { value: typeof value === "function" ? value() : value };
      return [hooks[index].value, (next) => {
        hooks[index].value = typeof next === "function" ? next(hooks[index].value) : next;
      }];
    },
  };
  const policy = loadModule("components/drawer/drawerGesturePolicy.js");
  const animated = {
    Value: class {
      constructor(value) { this.value = value; this.interpolations = []; animatedValues.push(this); }
      setValue(value) { this.value = value; }
      interpolate(config) {
        this.interpolations.push(config);
        return { value: this, config };
      }
      stopAnimation(callback) {
        animations.filter((animation) => animation.value === this && !animation.done).forEach((animation) => {
          animation.done = true;
          animation.callback?.({ finished: false });
        });
        callback?.(this.value);
      }
    },
    View: "AnimatedView",
    timing: (value, config) => ({ start: (callback) => { animations.push({ kind: "timing", value, config, callback }); } }),
    spring: (value, config) => ({ start: (callback) => { animations.push({ kind: "spring", value, config, callback }); } }),
  };
  const native = {
    Animated: animated,
    Keyboard: { metrics: () => null, addListener: () => ({ remove() {} }) },
    Modal: "Modal",
    PanResponder: { create: (handlers) => { responders.push(handlers); return { panHandlers: handlers }; } },
    Platform: { OS: "ios" },
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    StatusBar: "StatusBar",
    StyleSheet: { absoluteFill: {}, absoluteFillObject: {}, create: (styles) => styles, hairlineWidth: 1 },
    View: "View",
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
  const paper = {
    Divider: "Divider", IconButton: "IconButton", Portal: "Portal", Surface: "Surface", Text: "Text",
    useTheme: () => ({ dark: false, colors: {} }),
  };
  const { default: DrawerBottom } = loadModule("components/drawer/DrawerBottom.native.jsx", {
    "expo-blur": { BlurView: "BlurView" },
    "expo-linear-gradient": { LinearGradient: "LinearGradient" },
    react: { __esModule: true, default: React, ...React },
    "react-native": native,
    "react-native-paper": paper,
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "./drawerGesturePolicy": policy,
  });
  let currentProps = { open: true, scrollable, contentAtTopRef, title: "Detalle", ...props };
  let tree;
  const nodes = (node) => Array.isArray(node)
    ? node.flatMap(nodes)
    : node && typeof node === "object"
      ? [node, ...nodes(node.props?.children)]
      : [];
  const render = (next = {}) => {
    currentProps = { ...currentProps, ...next };
    hookIndex = 0;
    effects = [];
    tree = DrawerBottom(currentProps);
    if (lifecycle) effects.forEach((effect) => effect());
  };
  render();
  return {
    responders,
    animations,
    animatedValues,
    get nodes() { return nodes(tree); },
    render,
    completeDrawer: () => {
      const animation = animations.filter((item) => item.value === animatedValues[0]).at(-1);
      animation.done = true;
      animation.value.setValue(animation.config.toValue);
      animation.callback?.({ finished: true });
    },
  };
}

const down = { dx: 2, dy: 25 };
const offset = (y) => ({ nativeEvent: { contentOffset: { y } } });

test("el scroll integrado y el header respetan la posición y el inicio del gesto", () => {
  const { nodes, responders: [header, content] } = createDrawerHarness();
  const scroll = nodes.find((node) => node.type === "ScrollView");
  assert.ok(scroll);

  scroll.props.onScroll(offset(80));
  scroll.props.onTouchStart();
  header.onStartShouldSetPanResponder();
  assert.equal(header.onMoveShouldSetPanResponder(null, down), false);
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, down), false);

  scroll.props.onScroll(offset(0));
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, down), false);
  scroll.props.onTouchEnd();
  scroll.props.onTouchStart();
  header.onStartShouldSetPanResponder();
  assert.equal(header.onMoveShouldSetPanResponder(null, down), true);
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, down), true);

  scroll.props.onScroll(offset(20));
  scroll.props.onScroll(offset(0));
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, down), false);
});

test("un scroll externo también exige comenzar el arrastre en el tope", () => {
  const position = { current: false };
  const { nodes, responders: [header, content] } = createDrawerHarness({ scrollable: false, contentAtTopRef: position });
  const body = nodes.find((node) => node.type === "View" && node.props.onTouchStart);
  assert.ok(body);

  body.props.onTouchStart();
  header.onStartShouldSetPanResponder();
  assert.equal(header.onMoveShouldSetPanResponder(null, down), false);
  position.current = true;
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, down), false);
  body.props.onTouchEnd();
  body.props.onTouchStart();
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, down), true);
  position.current = false;
  body.props.onTouchMove();
  position.current = true;
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, down), false);
});

test("cine conserva velocidad del gesto y no notifica cierres cancelados", () => {
  let closes = 0;
  const harness = createDrawerHarness({ lifecycle: true, motionPreset: "cinema", onClose: () => { closes++; } });
  harness.completeDrawer();
  const header = harness.responders[0];
  header.onPanResponderGrant();
  header.onPanResponderMove(null, { dy: 20 });
  header.onPanResponderRelease(null, { dy: 20, vy: 0.3 });
  assert.equal(harness.animations.at(-1).kind, "spring");
  assert.equal(harness.animations.at(-1).config.velocity, 300);
  assert.equal(harness.animations.at(-1).config.toValue, 0);
  header.onPanResponderRelease(null, { dy: 300, vy: 1.5 });
  harness.animations.at(-1).callback({ finished: false });
  assert.equal(closes, 0);
  harness.completeDrawer();
  const wipe = harness.animations.find((animation) => animation.value === harness.animatedValues[1]);
  assert.equal(wipe.config.duration, 480);
  assert.equal(closes, 1);
});

test("la apertura cinematográfica usa resorte y el barrido anima opacidad y traslación nativas", () => {
  const harness = createDrawerHarness({ lifecycle: true, motionPreset: "cinema" });
  const opening = harness.animations.find((animation) => animation.value === harness.animatedValues[0]);
  const wipe = harness.animations.find((animation) => animation.value === harness.animatedValues[1]);
  const wipeNode = harness.nodes.find((node) => node.type === "AnimatedView" && node.props.pointerEvents === "none");
  const wipeStyle = wipeNode.props.style[1];

  assert.equal(opening.kind, "spring");
  assert.equal(opening.config.toValue, 0);
  assert.equal(opening.config.useNativeDriver, true);
  assert.equal(wipe.kind, "timing");
  assert.equal(wipe.config.duration, 480);
  assert.equal(wipe.config.useNativeDriver, true);
  assert.equal(wipeStyle.opacity.config.inputRange[1], 0.24);
  assert.equal(wipeStyle.opacity.config.outputRange[1], 0.68);
  assert.equal(wipeStyle.transform[0].translateX.config.inputRange[1], 1);
  assert.equal(wipeStyle.transform[0].translateX.config.outputRange[0], -390 * 1.35);
  assert.equal(harness.animatedValues[1].interpolations.length, 2);
});

test("cerrar conserva el panel hasta finalizar y bloquea gestos que interrumpan la salida", () => {
  let closed = 0;
  const harness = createDrawerHarness({ lifecycle: true, motionPreset: "cinema", onClosed: () => { closed++; } });
  harness.completeDrawer();
  harness.render({ open: false });
  const count = harness.animations.length;
  const [header, content] = harness.responders;
  assert.ok(harness.nodes.some((node) => node.type === "Portal"));
  header.onStartShouldSetPanResponder();
  assert.equal(header.onMoveShouldSetPanResponder(null, down), false);
  assert.equal(content.onMoveShouldSetPanResponderCapture(null, down), false);
  for (const responder of [header, content]) {
    responder.onPanResponderGrant();
    responder.onPanResponderRelease(null, { dy: 10, vy: 0 });
    responder.onPanResponderTerminate();
  }
  assert.equal(harness.animations.length, count);
  assert.equal(closed, 0);
  harness.completeDrawer();
  harness.render();
  assert.equal(closed, 1);
  assert.equal(harness.nodes.length, 0);
});

test("reabrir durante la salida cancela el cierre sin reiniciar la posición", () => {
  let closed = 0;
  const harness = createDrawerHarness({ lifecycle: true, motionPreset: "cinema", onClosed: () => { closed++; } });
  harness.completeDrawer();
  harness.render({ open: false });
  const closing = harness.animations.at(-1);
  closing.value.setValue(120);
  harness.render({ open: true });
  assert.equal(closing.done, true);
  assert.equal(closed, 0);
  assert.equal(harness.animations.at(-1).value.value, 120);
  assert.equal(harness.animations.at(-1).config.toValue, 0);
});

test("reducir movimiento elimina el resorte y los drawers existentes conservan timing", () => {
  for (const props of [{}, { motionPreset: "cinema", reducedMotion: true }]) {
    const harness = createDrawerHarness(props);
    harness.responders[0].onPanResponderRelease(null, { dy: 20, vy: 0.2 });
    assert.equal(harness.animations.at(-1).kind, "timing");
    assert.equal(harness.animations.at(-1).config.duration, props.reducedMotion ? 0 : 180);
  }
});

test("reducir movimiento omite el barrido y la apertura termina sin duración", () => {
  const harness = createDrawerHarness({ lifecycle: true, motionPreset: "cinema", reducedMotion: true });
  const opening = harness.animations.find((animation) => animation.value === harness.animatedValues[0]);
  assert.equal(opening.kind, "timing");
  assert.equal(opening.config.duration, 0);
  assert.equal(harness.animations.some((animation) => animation.value === harness.animatedValues[1]), false);
  const wipeNode = harness.nodes.find((node) => node.type === "AnimatedView" && node.props.pointerEvents === "none");
  assert.equal(wipeNode.props.style[1].opacity, 0);
});
