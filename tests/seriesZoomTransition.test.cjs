/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies) {
  const result = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  assert.deepEqual(result.diagnostics, []);
  const exports = {};
  vm.runInNewContext(result.outputText, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      const dependency = dependencies[name];
      return Object.hasOwn(dependency, "default") ? { __esModule: true, ...dependency } : dependency;
    },
  });
  return exports;
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props.children)];
}
const byType = (tree, type) => nodes(tree).filter((node) => node.type === type);
const palette = { elevated: "#111", border: "#222" };
const item = { _id: "serie-fixture", nombre: "Serie de prueba", urlBackgroundHTTPS: "https://example.invalid/poster.jpg", urlBackground: "http://example.invalid/legacy.jpg" };

function fixture({ os = "ios", version = 18, reducedMotion = false, seriesPromise = new Promise(() => {}) } = {}) {
  let cursor = 0;
  const states = [];
  const effects = [];
  const alerts = [];
  const React = {
    Fragment: "Fragment",
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useEffect: (effect) => effects.push(effect),
    useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
  };
  const Link = Object.assign("Link", { AppleZoom: "AppleZoom", AppleZoomTarget: "AppleZoomTarget", Trigger: "Trigger" });
  const native = Object.fromEntries([
    "ActivityIndicator", "Image", "ImageBackground", "Pressable", "ScrollView", "View",
    "FlatList", "KeyboardAvoidingView", "Modal", "TextInput",
  ].map((name) => [name, name]));
  Object.assign(native, {
    Platform: { OS: os, Version: version },
    StyleSheet: {
      create: (styles) => styles,
      absoluteFill: { position: "absolute" },
      flatten: (styles) => Array.isArray(styles)
        ? Object.assign({}, ...styles.filter(Boolean))
        : styles,
    },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    Alert: { alert: (...args) => alerts.push(args) },
    Linking: {},
    Animated: {},
    Easing: {},
  });
  const paper = Object.fromEntries(["ActivityIndicator", "Button", "Chip", "IconButton", "Surface", "Text"].map((name) => [name, name]));
  paper.useTheme = () => ({ dark: true, colors: {} });
  const dependencies = {
    react: React,
    "react-native": native,
    "react-native-paper": paper,
    "expo-router": { Link, useRouter: () => ({ back() {}, push() {} }) },
    "expo-linear-gradient": { LinearGradient: "LinearGradient" },
    "expo-blur": { BlurView: "BlurView" },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "../Header/AppHeader": { default: "AppHeader" },
    "../../hooks/useSystemReducedMotion": { default: () => reducedMotion },
    "../collections/collections": {},
    "../../services/meteor/client.native": {},
    "../../services/meteor/session.native": {},
    "../../services/series/seriesPlayback.native": {
      getSeries: () => seriesPromise,
      getSeriesSeasons: () => Promise.resolve([]),
      getSeasonChapters: () => Promise.resolve([]),
    },
    "../cinema/ModernBottomDrawer": {},
  };
  const catalog = load("components\\series\\SeriesCatalog.native.jsx", dependencies);
  const detail = load("components\\series\\SeriesDetail.native.jsx", dependencies);
  return {
    alerts, effects,
    card(onPress = () => {}, series = item, compact = false) {
      cursor = 0;
      return catalog.SeriesPoster({ item: series, palette, onPress, compact });
    },
    detail(poster = item.urlBackgroundHTTPS) {
      cursor = 0;
      return detail.default({ idSerie: item._id, initialPosterUri: poster });
    },
  };
}

test("iOS 18: el card navega con zoom sobre la imagen, sin incluir etiquetas", () => {
  const tree = fixture().card();
  assert.equal(String(tree.type), "Link");
  assert.equal(tree.props.push, true);
  assert.equal(tree.props.href.pathname, "/(normal)/SeriesDetail");
  assert.equal(tree.props.href.params.id, item._id);
  assert.equal(tree.props.href.params.poster, item.urlBackgroundHTTPS);
  const zoom = byType(tree, "AppleZoom")[0];
  assert.equal(byType(zoom, "ImageBackground")[0].props.source.uri, item.urlBackgroundHTTPS);
  assert.equal(byType(zoom, "Text").length, 0);
  assert.equal(byType(tree, "Pressable")[0].props.onPress, undefined);
});

for (const compact of [false, true]) {
  test(`el ancho sobrevive la combinación de estilos de Link.Trigger (compact=${compact})`, () => {
    const f = fixture();
    const render = () => byType(f.card(undefined, item, compact), "Pressable")[0];
    const card = render();
    assert.equal(typeof card.props.style, "object");
    assert.equal(Array.isArray(card.props.style), false);
    // Slot combina style con object spread; una función perdería sus dimensiones.
    const mergedStyle = { ...{}, ...card.props.style };
    assert.equal(mergedStyle.width, compact ? 148 : 158);
    card.props.onPressIn();
    const pressed = render();
    assert.equal(pressed.props.style.width, compact ? 148 : 158);
    assert.equal(pressed.props.style.opacity, 0.78);
    card.props.onPressOut();
    assert.equal(render().props.style.opacity, undefined);
  });
}

test("los cards compactos también usan zoom y las series sin portada conservan onPress", () => {
  const f = fixture();
  assert.equal(byType(f.card(undefined, item, true), "AppleZoom").length, 1);
  let selected;
  const noPoster = { _id: "no-poster", nombre: "Sin portada" };
  const card = f.card((value) => { selected = value; }, noPoster);
  assert.equal(card.type, "Pressable");
  assert.equal(byType(card, "AppleZoom").length, 0);
  card.props.onPress();
  assert.equal(selected, noPoster);
});

for (const options of [{ os: "android" }, { version: 17 }, { reducedMotion: true }]) {
  test(`navegación convencional: ${JSON.stringify(options)}`, () => {
    let selected;
    const f = fixture(options);
    const card = f.card((value) => { selected = value; });
    assert.equal(card.type, "Pressable");
    assert.equal(byType(card, "AppleZoom").length, 0);
    card.props.onPress();
    assert.equal(selected, item);
    assert.equal(byType(f.detail(), "AppleZoomTarget").length, 0);
  });
}

test("el destino existe durante la carga y conserva la portada tras resolver Meteor", async () => {
  let resolve;
  const f = fixture({ seriesPromise: new Promise((done) => { resolve = done; }) });
  const pending = f.detail();
  const target = byType(pending, "AppleZoomTarget")[0];
  assert.ok(target);
  assert.equal(byType(target, "ImageBackground")[0].props.source.uri, item.urlBackgroundHTTPS);
  assert.equal(byType(pending, "Button").find((node) => node.props.icon === "play").props.disabled, true);
  assert.equal(byType(pending, "ActivityIndicator").length, 1);
  assert.equal(byType(pending, "Surface").length, 1);
  f.effects[0]();
  resolve({ ...item, poster: "https://example.invalid/other.jpg" });
  await new Promise(setImmediate);
  const loaded = f.detail();
  assert.equal(byType(byType(loaded, "AppleZoomTarget")[0], "ImageBackground")[0].props.source.uri, item.urlBackgroundHTTPS);
  assert.equal(byType(loaded, "ActivityIndicator").length, 0);
  assert.equal(byType(loaded, "Button").find((node) => node.props.icon === "play").props.disabled, false);
});

test("entrada directa: al cargar se prefiere HTTPS igual que en el catálogo", async () => {
  const f = fixture({ seriesPromise: Promise.resolve(item) });
  f.detail(null);
  f.effects[0]();
  await new Promise(setImmediate);
  const tree = f.detail(null);
  assert.equal(byType(byType(tree, "AppleZoomTarget")[0], "ImageBackground")[0].props.source.uri, item.urlBackgroundHTTPS);
});

test("serie inexistente: permite volver en lugar de mantener el estado de carga", async () => {
  const f = fixture({ seriesPromise: Promise.resolve(null) });
  f.detail();
  f.effects[0]();
  await new Promise(setImmediate);
  const tree = f.detail();
  assert.equal(byType(tree, "AppleZoomTarget").length, 0);
  assert.equal(byType(tree, "Button").length, 1);
});

test("fallo de Meteor: muestra el error y permite volver al catálogo", async () => {
  const f = fixture({ seriesPromise: Promise.reject(new Error("Fallo de prueba")) });
  f.detail();
  f.effects[0]();
  await new Promise(setImmediate);
  assert.equal(f.alerts.length, 1);
  assert.equal(f.alerts[0][0], "Error");
  const tree = f.detail();
  assert.equal(byType(tree, "ActivityIndicator").length, 0);
  assert.equal(byType(tree, "Button").length, 1);
});

test("la ruta nativa transmite id y portada normalizados", () => {
  const screen = load("app\\(normal)\\SeriesDetail.native.tsx", {
    react: { createElement: (type, props) => ({ type, props }) },
    "expo-router": { useLocalSearchParams: () => ({ id: [item._id], poster: [item.urlBackgroundHTTPS] }) },
    "../../components/series/SeriesDetail.native": { default: "SeriesDetail" },
  });
  const tree = screen.default();
  assert.equal(tree.props.idSerie, item._id);
  assert.equal(tree.props.initialPosterUri, item.urlBackgroundHTTPS);
});
