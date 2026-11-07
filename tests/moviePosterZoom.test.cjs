/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const filename = path.resolve(__dirname, "../components/downloadVideos/DownloadVideosHome.native.jsx");
const source = ts.createSourceFile(filename, fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
const card = source.statements.find((statement) => ts.isVariableStatement(statement)
  && statement.declarationList.declarations.some((declaration) => declaration.name.getText(source) === "MoviePosterCard"));
const code = ts.transpileModule(card.getText(source), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
}).outputText;
const image = source.statements.find((statement) => ts.isVariableStatement(statement)
  && statement.declarationList.declarations.some((declaration) => declaration.name.getText(source) === "CachedMovieImageBackground"));
const imageCode = ts.transpileModule(`${image.getText(source)}\nexports.ImageComponent = CachedMovieImageBackground;`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
}).outputText;
const detailFilename = path.resolve(__dirname, "../components/downloadVideos/PeliculaDetalle.native.jsx");
const detailCode = ts.transpileModule(fs.readFileSync(detailFilename, "utf8"), {
  fileName: detailFilename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
}).outputText;
const nodes = (tree) => Array.isArray(tree)
  ? tree.flatMap(nodes)
  : tree && typeof tree === "object" ? [tree, ...nodes(tree.props?.children)] : [];

function render(platform, reducedMotion, version = 18) {
  const Link = Object.assign(() => null, { Trigger: "LinkTrigger", AppleZoom: "AppleZoom" });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    Link,
    Platform: { OS: platform, Version: version },
    useCinemaReducedMotion: () => reducedMotion,
    getMovieImageUrl: () => "https://fixture.example/poster.jpg",
    getMovieTitle: (movie) => movie.nombrePeli,
    getMovieYear: () => "2026",
    getMovieViews: () => 0,
    normalizeGenres: () => [],
    CinemaPosterPressable: "CinemaPosterPressable",
    Surface: "Surface",
    CachedMovieImageBackground: "CachedMovieImageBackground",
    View: "View",
    LinearGradient: "LinearGradient",
    Text: "Text",
    IconButton: "IconButton",
    StyleSheet: { absoluteFill: {} },
    styles: {},
  });
  let presses = 0;
  const movie = { _id: "movie-fixture", nombrePeli: "Pelicula de prueba" };
  const tree = exports.MoviePosterCard({
    movie,
    palette: {},
    onPress: (selected) => { assert.equal(selected, movie); presses++; },
  });
  return { tree, Link, get presses() { return presses; } };
}

function renderDetail({ platform, reducedMotion, version = 18 }) {
  const Link = Object.assign(() => null, { AppleZoomTarget: "AppleZoomTarget" });
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (initial) => [initial, () => {}],
    useEffect: () => {},
  };
  const dependencies = {
    react: { __esModule: true, default: React },
    "expo-blur": { BlurView: "BlurView" },
    "react-native": {
      Alert: { alert() {} },
      ImageBackground: "ImageBackground",
      Linking: { openURL() { return Promise.resolve(); } },
      Platform: { OS: platform, Version: version },
      ScrollView: "ScrollView",
      StyleSheet: { absoluteFill: {}, create: (styles) => styles },
      View: "View",
    },
    "react-native-paper": {
      ActivityIndicator: "ActivityIndicator",
      Button: "Button",
      IconButton: "IconButton",
      Text: "Text",
      useTheme: () => ({ dark: false, colors: { onSurfaceVariant: "#333", surface: "#fff", outlineVariant: "#ddd" } }),
    },
    "expo-router": { Link, useRouter: () => ({ back() {}, push() {} }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "../../services/meteor/client.native": { Meteor: { call() {} } },
    "../../services/appUrls": { getMeteorHttpOriginUrl: () => "https://fixture.example" },
    "../Header/AppHeader": { default: "AppHeader" },
    "../../hooks/useSystemReducedMotion": { __esModule: true, default: () => reducedMotion },
  };
  const exports = {};
  vm.runInNewContext(detailCode, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
  });
  return { tree: exports.default({ movieId: "movie-fixture" }), Link };
}

test("iOS: el zoom tiene Link propietario y una sola navegacion al detalle correcto", () => {
  const result = render("ios", false);
  assert.equal(result.tree.type, result.Link);
  assert.equal(result.tree.props.push, true);
  assert.equal(result.tree.props.asChild, true);
  assert.equal(result.tree.props.href.pathname, "/(normal)/PeliculaDetalle");
  assert.equal(result.tree.props.href.params.id, "movie-fixture");
  assert.equal(result.tree.props.children[0].type, "LinkTrigger");
  const pressable = nodes(result.tree).find((node) => node.type === "CinemaPosterPressable");
  assert.equal(pressable.props.onPress, undefined, "Link inyecta la accion sin duplicar router.push");
  assert.notEqual(pressable.props.motionEnabled, false, "la tarjeta conserva el efecto de presión");
  const cachedImage = nodes(result.tree).find((node) => node.type === "CachedMovieImageBackground");
  assert.equal(cachedImage.props.zoomEnabled, true);
  assert.equal(nodes(result.tree).filter((node) => node.type === "AppleZoom").length, 0,
    "el Link.AppleZoom real se monta dentro de la imagen, no alrededor de sus capas");
  assert.equal(pressable.props.accessibilityRole, "button");
  assert.equal(pressable.props.accessibilityLabel, "Abrir Pelicula de prueba");
});

test("el destino del detalle permite el regreso por zoom solo en iOS compatible", () => {
  for (const options of [
    { platform: "ios", version: 18, reducedMotion: false, expected: 1 },
    { platform: "ios", version: 17, reducedMotion: false, expected: 0 },
    { platform: "ios", version: 18, reducedMotion: true, expected: 0 },
    { platform: "android", version: 35, reducedMotion: false, expected: 0 },
  ]) {
    const result = renderDetail(options);
    const targets = nodes(result.tree).filter((node) => node.type === "AppleZoomTarget");
    assert.equal(targets.length, options.expected);
    if (targets.length) {
      assert.equal(nodes(targets[0]).filter((node) => node.type === "ImageBackground").length, 1);
      assert.equal(nodes(targets[0]).filter((node) => node.type === "Text").length, 0,
        "solo la imagen hero es el destino de zoom, no el contenido del detalle");
    }
  }
});

test("Android, iOS no compatible y movimiento reducido conservan el callback sin zoom", () => {
  for (const [platform, reducedMotion, version] of [["android", false, 35], ["ios", true, 18], ["ios", false, 17]]) {
    const result = render(platform, reducedMotion, version);
    assert.equal(result.tree.type, "CinemaPosterPressable");
    assert.equal(nodes(result.tree).filter((node) => node.type === "AppleZoom").length, 0);
    result.tree.props.onPress();
    assert.equal(result.presses, 1);
  }
});

test("el poster conserva un unico hijo nativo para zoom y no pierde la imagen al aplanar Fabric", () => {
  const exports = {};
  const effects = [];
  const states = [];
  const style = { flex: 1 };
  const imageStyle = { borderRadius: 8 };
  const uri = "https://fixture.example/imagenesPeliculas?calidad=mid&idPeli=movie-fixture";
  vm.runInNewContext(imageCode, {
    exports,
    React: {
      createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
      useState: (initial) => [initial, (value) => states.push(value)],
      useEffect: (effect) => effects.push(effect),
    },
    View: "View",
    Link: Object.assign(function Link() {}, { AppleZoom: "AppleZoom" }),
    Reanimated: { View: "AnimatedView" },
    ImageBackground: "ImageBackground",
    LinearGradient: "LinearGradient",
    ActivityIndicator: "ActivityIndicator",
    Text: "Text",
    IconButton: "IconButton",
    StyleSheet: { absoluteFill: { position: "absolute" } },
    styles: {},
    console,
  });
  const tree = exports.ImageComponent({ source: { uri }, style, imageStyle, zoomEnabled: true });
  assert.equal(tree.type, "View");
  assert.equal(tree.props.collapsable, false, "Expo zoom debe recibir el contenedor, no sus capas aplanadas");
  assert.equal(tree.props.style, style);
  const nativeImage = nodes(tree).find((node) => node.type === "ImageBackground");
  const zoom = nodes(tree).find((node) => node.type === "AppleZoom");
  assert.ok(zoom, "la transición marca solo la imagen nativa como origen");
  assert.equal(zoom.props.children[0], nativeImage);
  assert.equal(nativeImage.props.source.uri, uri);
  assert.equal(nativeImage.props.imageStyle, imageStyle);
  assert.equal(nativeImage.props.resizeMode, "cover");
  effects[0]();
  nativeImage.props.onLoad();
  assert.deepEqual(states, ["loading", "loaded"]);
});
