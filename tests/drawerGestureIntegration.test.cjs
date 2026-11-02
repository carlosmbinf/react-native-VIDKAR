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

function createDrawerHarness({ scrollable = true, contentAtTopRef } = {}) {
  const responders = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: "Fragment",
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    useState: (value) => [typeof value === "function" ? value() : value, () => {}],
  };
  const policy = loadModule("components/drawer/drawerGesturePolicy.js");
  const animated = {
    Value: class { setValue() {} stopAnimation() {} },
    View: "AnimatedView",
    timing: () => ({ start: () => {} }),
  };
  const native = {
    Animated: animated,
    Keyboard: { metrics: () => null },
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
  const tree = DrawerBottom({ open: true, scrollable, contentAtTopRef, title: "Detalle" });
  const nodes = (node) => Array.isArray(node)
    ? node.flatMap(nodes)
    : node && typeof node === "object"
      ? [node, ...nodes(node.props?.children)]
      : [];
  return { responders, nodes: nodes(tree) };
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
