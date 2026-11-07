/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function harness(development = true) {
  const logs = [];
  const filename = "app/(normal)/_layout.tsx";
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", filename), "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const jsx = (type, props) => ({ type, props });
  const Stack = Object.assign(() => {}, { Screen: "Screen" });
  const dependencies = {
    "expo-router": { Stack },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "../../hooks/useSystemReducedMotion": { __esModule: true, default: () => false },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    __DEV__: development,
    console: { info: (prefix, fields) => logs.push({ prefix, fields }) },
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), name);
      return dependencies[name];
    },
  });
  const layout = exports.default();
  return {
    logs,
    transition(origin, params, closing = false, destination = "ProductoComercio") {
      const route = { key: "destination-key", name: destination, params };
      layout.props.screenListeners({
        route,
        navigation: { getState: () => ({ routes: [{ key: "origin-key", name: origin }, route] }) },
      }).transitionStart({ data: { closing } });
    },
  };
}

test("el diagnostico distingue zoom desde Inicio y catalogo sin revelar identificadores", () => {
  const h = harness();
  const params = {
    __internal_expo_router_zoom_transition_source_id: "synthetic-source",
    __internal_expo_router_zoom_transition_screen_id: "destination-key",
    productId: "synthetic-product",
  };
  h.transition("Main", params);
  h.transition("ComerciosList", params, true);
  for (const { prefix, fields } of h.logs) {
    assert.equal(prefix, "[CatalogImageZoom]");
    assert.equal(fields.hasImageSource, true);
    assert.equal(fields.matchesDestination, true);
    assert.doesNotMatch(JSON.stringify(fields), /synthetic-source|synthetic-product|destination-key/);
  }
  assert.equal(h.logs[0].fields.origin, "Main");
  assert.equal(h.logs[1].fields.origin, "ComerciosList");
  assert.equal(h.logs[1].fields.closing, true);
});

test("el diagnostico detecta referencia ausente o asociada a otra ruta", () => {
  const h = harness();
  h.transition("Main", undefined);
  assert.equal(h.logs[0].fields.hasImageSource, false);
  assert.equal(h.logs[0].fields.matchesDestination, false);
  h.transition("Main", {
    __internal_expo_router_zoom_transition_source_id: "synthetic-source",
    __internal_expo_router_zoom_transition_screen_id: "other-key",
  });
  assert.equal(h.logs[1].fields.hasImageSource, true);
  assert.equal(h.logs[1].fields.matchesDestination, false);
});

test("no registra transiciones ajenas ni logs en produccion", () => {
  const h = harness();
  h.transition("Main", {}, false, "User");
  assert.equal(h.logs.length, 0);
  const production = harness(false);
  production.transition("Main", {});
  assert.equal(production.logs.length, 0);
});
