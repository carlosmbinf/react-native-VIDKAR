/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

function render(movie, loading = false, trailerError = false, dark = true) {
  const pushes = [];
  const links = [];
  const alerts = [];
  let backs = 0;
  const states = [movie, loading, 100];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: "Fragment",
    useState: () => [states.shift(), () => {}],
    useEffect: () => {},
  };
  const dependencies = {
    react: { __esModule: true, default: React },
    "react-native": {
      Alert: { alert: (...args) => alerts.push(args) },
      ImageBackground: "ImageBackground", ScrollView: "ScrollView", View: "View",
      StyleSheet: { create: (styles) => styles, absoluteFillObject: {} },
      Linking: { openURL: (url) => {
        links.push(url);
        return trailerError ? Promise.reject(new Error("fixture")) : Promise.resolve();
      } },
    },
    "expo-blur": { BlurView: "BlurView" },
    "react-native-paper": {
      ActivityIndicator: "ActivityIndicator", Chip: "Chip", IconButton: "IconButton", Text: "Text",
      Button: "FooterButton",
      useTheme: () => ({ dark, colors: {
        surface: dark ? "#111827" : "#ffffff",
        onSurface: dark ? "#fff" : "#111827",
        onSurfaceVariant: dark ? "#ccc" : "#475569",
        surfaceVariant: dark ? "#334155" : "#e2e8f0",
        outlineVariant: dark ? "#475569" : "#cbd5e1",
      } }),
    },
    "expo-router": { useRouter: () => ({ push: (route) => pushes.push(route), back: () => backs++ }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "../../services/meteor/client.native": { Meteor: {} },
    "../../services/appUrls": { getMeteorHttpOriginUrl: () => "https://fixture.example" },
    "../Header/AppHeader": { __esModule: true, default: "AppHeader" },
  };
  const filename = path.resolve(__dirname, "../components/downloadVideos/PeliculaDetalle.native.jsx");
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console: { warn: () => {} }, require: (name) => {
    assert.ok(Object.hasOwn(dependencies, name), name);
    return dependencies[name];
  } });
  const tree = exports.default({ movieId: "fixture-movie" });
  const header = tree.props.children[0];
  const footer = tree.props.children[2];
  const actions = footer.props.children[1].props.children;
  return { tree, header, footer, actions, pushes, links, alerts, get backs() { return backs; } };
}

test("reproducir y trailer son dos acciones del footer con los destinos existentes", async () => {
  const result = render({ nombrePeli: "Fixture", urlPeliHTTPS: "https://fixture.example/movie", urlTrailer: "https://fixture.example/trailer" });
  assert.equal(result.header.type, "AppHeader");
  assert.equal(result.actions.length, 2);
  assert.equal(result.header.props.actions, undefined);
  assert.ok(result.actions.every((action) => action.type === "FooterButton" && !action.props.disabled));
  assert.equal(result.actions[1].props.accessibilityLabel, "Reproducir película");
  assert.equal(result.actions[0].props.accessibilityLabel, "Ver tráiler");
  assert.equal(result.actions[1].props.mode, "contained");
  assert.equal(result.actions[0].props.mode, "outlined");
  assert.equal(result.tree.props.children[1].props.contentContainerStyle.paddingBottom, 130);
  assert.equal(result.tree.props.children[1].props.bounces, false);
  assert.equal(result.tree.props.children[1].props.alwaysBounceVertical, false);
  assert.equal(result.tree.props.children[1].props.overScrollMode, "never");
  assert.equal(result.footer.props.style[1].paddingBottom, 18);
  result.actions[1].props.onPress();
  assert.equal(result.pushes[0].pathname, "/(normal)/PeliculaPlayer");
  assert.equal(result.pushes[0].params.id, "fixture-movie");
  await result.actions[0].props.onPress();
  assert.deepEqual(result.links, ["https://fixture.example/trailer"]);
  result.header.props.onBack();
  assert.equal(result.backs, 1);
});

test("acciones visibles y deshabilitadas durante carga o sin enlaces", () => {
  for (const [movie, loading] of [[null, true], [{}, false], [{ urlPeli: "fixture", urlTrailer: "fixture" }, true]]) {
    const result = render(movie, loading);
    assert.equal(result.actions.length, 2);
    assert.ok(result.actions.every((action) => action.props.disabled));
  }
});

test("el fallo al abrir trailer se comunica al usuario", async () => {
  const result = render({ urlTrailer: "https://fixture.example/trailer" }, false, true);
  result.actions[0].props.onPress();
  await new Promise(setImmediate);
  assert.equal(result.alerts[0][0], "No se pudo abrir el tráiler");
});

test("datos de pelicula en capsulas tipo Cubacel sin recortar reparto ni sinopsis", () => {
  const actor = "Nombre de actor suficientemente largo para ocupar varias lineas";
  const result = render({
    year: 2026, extension: "mkv", tamano: "2 GB",
    clasificacion: ["Drama", "Aventura"], actors: [actor],
    descripcion: "Sinopsis completa de la pelicula.",
  });
  const nodes = (tree) => Array.isArray(tree)
    ? tree.flatMap(nodes)
    : tree && typeof tree === "object" ? [tree, ...nodes(tree.props?.children)] : [];
  const pills = nodes(result.tree).filter((node) => typeof node.type === "function" && node.type.name === "DetailPill");
  assert.deepEqual(pills.map((pill) => [pill.props.label, pill.props.value]), [
    ["Año", "2026"], ["Formato", "MKV"], ["Tamaño", "2 GB"],
    ["Género", "Drama"], ["Género", "Aventura"], ["Reparto", actor],
  ]);
  const rendered = pills.at(-1).type(pills.at(-1).props);
  assert.equal(rendered.props.style[0].borderRadius, 22);
  assert.equal(rendered.props.style[0].maxWidth, "100%");
  assert.equal(rendered.props.children[1].props.numberOfLines, undefined);
  assert.ok(nodes(result.tree).some((node) => node.type === "Text" && node.props.children.includes("Sinopsis completa de la pelicula.")));
});

test("sinopsis y chips se adaptan al tema; los chips sobre la imagen mantienen contraste", () => {
  const nodes = (tree) => Array.isArray(tree)
    ? tree.flatMap(nodes)
    : tree && typeof tree === "object" ? [tree, ...nodes(tree.props?.children)] : [];
  for (const dark of [false, true]) {
    const result = render({ descripcion: "Sinopsis", year: 2026, clasificacion: ["Drama"] }, false, false, dark);
    const body = result.tree.props.children[1].props.children[1];
    assert.equal(body.props.style[1].backgroundColor, dark ? "#111827" : "#ffffff");
    assert.equal(result.tree.props.style[1].backgroundColor, dark ? "#090d16" : "#e2e8f0");
    if (!dark) {
      assert.equal(body.props.style[2].borderColor, "#cbd5e1");
      assert.equal(body.props.style[2].borderWidth, 1);
      assert.ok(body.props.style[2].boxShadow);
    } else {
      assert.equal(body.props.style[2], false);
    }
    const description = nodes(body).find((node) => node.props.variant === "bodyLarge");
    assert.equal(description.props.style.color, dark ? "#ccc" : "#475569");
    const pills = nodes(result.tree).filter((node) => typeof node.type === "function" && node.type.name === "DetailPill");
    const genre = pills.find((pill) => pill.props.label === "Género");
    const rendered = genre.type(genre.props);
    if (!dark) {
      assert.equal(rendered.props.style[1].backgroundColor, "#e2e8f0");
      assert.equal(rendered.props.children[1].props.style[1].color, "#111827");
    }
    const year = pills.find((pill) => pill.props.label === "Año");
    const heroPill = year.type(year.props);
    assert.equal(heroPill.props.children[1].props.style[0].color, "#ffffff");
    assert.equal(heroPill.props.children[1].props.style[1], false);
  }
});
