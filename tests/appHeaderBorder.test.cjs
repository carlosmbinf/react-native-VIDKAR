/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props.children)];
}
const byType = (tree, type) => nodes(tree).filter((node) => node.type === type);
const flatten = (style) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
const borders = (tree) => byType(tree, "View").filter((node) => {
  const style = flatten(node.props.style);
  return style?.height === 0.5 && style?.bottom === 0;
});

function fixture(os, dark) {
  let fallbackCalls = 0;
  const React = {
    Fragment: "Fragment",
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useCallback: (callback) => callback,
  };
  const dependencies = {
    react: React,
    "react-native": {
      Image: "Image", View: "View",
      Platform: { OS: os },
      StyleSheet: { create: (styles) => styles, absoluteFill: { position: "absolute" }, hairlineWidth: 0.5 },
      useWindowDimensions: () => ({ width: 390, height: 844 }),
    },
    "expo-blur": { BlurView: "BlurView" },
    "expo-linear-gradient": { LinearGradient: "LinearGradient" },
    "@react-native-masked-view/masked-view": { __esModule: true, default: "MaskedView" },
    "expo-status-bar": { StatusBar: "StatusBar" },
    "expo-router/react-navigation": { useIsFocused: () => true },
    "react-native-paper": {
      Appbar: { Header: "Appbar.Header", Content: "Appbar.Content", BackAction: "Appbar.BackAction" },
      Portal: "Portal",
      useTheme: () => ({ dark }),
    },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 47 }) },
    "./appHeaderBlurTarget": { appHeaderBlurTargetRef: { current: null } },
    "../navigation/useSafeBack": {
      __esModule: true,
      default: () => () => { fallbackCalls++; },
      useCanNavigateBack: () => true,
    },
  };
  const result = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "components", "Header", "AppHeader.jsx"), "utf8"), {
    fileName: "AppHeader.jsx",
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  assert.deepEqual(result.diagnostics, []);
  const exports = {};
  vm.runInNewContext(result.outputText, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
  });
  return {
    render: (props = {}) => exports.default({ title: "Prueba", ...props }),
    fallbackCalls: () => fallbackCalls,
  };
}

for (const os of ["ios", "android"]) {
  for (const dark of [false, true]) {
    for (const portal of [false, true]) {
      test(`${os}, dark=${dark}, portal=${portal}: header sin borde conserva blur, título y safe area`, () => {
        const tree = fixture(os, dark).render({ portal });
        assert.equal(borders(tree).length, 0);
        assert.equal(byType(tree, "BlurView").length, 1);
        assert.equal(byType(tree, "Appbar.Content")[0].props.title, "Prueba");
        assert.equal(byType(tree, "Portal").length, portal ? 1 : 0);
        const frame = byType(tree, "View").find((node) => flatten(node.props.style)?.minHeight === 103);
        assert.ok(frame);
        assert.equal(flatten(frame.props.style).paddingTop, 47);
        assert.equal(flatten(frame.props.style).backgroundColor, "transparent");
      });
    }
  }
}

test("header transparente: no añade borde ni blur", () => {
  const tree = fixture("ios", true).render({ transparent: true });
  assert.equal(borders(tree).length, 0);
  assert.equal(byType(tree, "BlurView").length, 0);
});

test("se preservan la navegación de vuelta y el callback personalizado", () => {
  const f = fixture("android", false);
  byType(f.render(), "Appbar.BackAction")[0].props.onPress();
  assert.equal(f.fallbackCalls(), 1);
  let customCalls = 0;
  byType(f.render({ onBack: () => { customCalls++; } }), "Appbar.BackAction")[0].props.onPress();
  assert.equal(customCalls, 1);
  assert.equal(f.fallbackCalls(), 1);
});

test("el separador sigue disponible solo si se solicita explícitamente", () => {
  assert.equal(borders(fixture("ios", true).render({ showBottomBorder: true })).length, 1);
});
