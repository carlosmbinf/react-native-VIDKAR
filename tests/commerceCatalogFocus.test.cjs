/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const sameDeps = (a, b) => a && b && a.length === b.length &&
  a.every((value, index) => Object.is(value, b[index]));

// Ejecuta el hook de foco y los dos trackers reales del catalogo, sin layout nativo.
function createHarness() {
  const filename = "components/productos/ProductosScreen.native.jsx";
  const source = read(filename);
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  const statements = [];
  const visit = (node) => {
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      const initializer = declaration?.initializer;
      if (initializer && ts.isCallExpression(initializer) &&
          ["useDeferredScreenData", "Meteor.useTracker"].includes(initializer.expression.getText(ast))) {
        statements.push(node.getText(ast));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(statements.length, 3);
  const slots = [];
  const timers = new Map();
  const subscriptions = [];
  let cursor = 0;
  let pendingEffects = [];
  let dirty = true;
  let focused = true;
  let nextTimer = 0;
  let state;
  let products = [{ _id: "product", idTienda: "store", name: "Producto", count: 2 }];
  const stores = [{ _id: "store", title: "Tienda" }];
  const slot = (initialize) => {
    const index = cursor++;
    if (!slots[index]) slots[index] = initialize();
    return slots[index];
  };
  const React = {
    useState(initial) {
      const current = slot(() => ({ value: initial }));
      return [current.value, (value) => {
        if (!Object.is(value, current.value)) { current.value = value; dirty = true; }
      }];
    },
    useCallback(callback, deps) {
      const current = slot(() => ({}));
      if (!sameDeps(current.deps, deps)) {
        current.value = callback;
        current.deps = deps;
      }
      return current.value;
    },
  };
  const Meteor = {
    userId: () => null,
    user: () => null,
    subscribe(name) {
      subscriptions.push(name);
      return { ready: () => true };
    },
    useTracker(callback, deps) {
      const current = slot(() => ({}));
      current.run = callback;
      if (!sameDeps(current.deps, deps)) {
        current.value = callback();
        current.deps = deps;
      }
      return current.value;
    },
  };
  const dependencies = {
    react: React,
    "expo-router/react-navigation": {
      useFocusEffect(callback) {
        const current = slot(() => ({}));
        if (current.focused !== focused || current.callback !== callback) {
          pendingEffects.push(() => {
            current.cleanup?.();
            current.focused = focused;
            current.callback = callback;
            current.cleanup = focused ? callback() : undefined;
          });
        }
      },
    },
  };
  const compiled = ts.transpileModule(read("hooks/useDeferredScreenData.js"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => dependencies[name],
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout: (id) => timers.delete(id),
  });
  const renderTrackers = vm.runInNewContext(`() => {
    ${statements.join("\n")}
    return { dataReady, categoriesReady, productCount, tiendasConProductos, loadingProducts };
  }`, {
    useDeferredScreenData: exports.default,
    Meteor,
    CategoriasComercioCollection: { find: () => ({ fetch: () => [{ _id: "category" }] }) },
    TiendasComercioCollection: { find: () => ({ fetch: () => stores }) },
    ProductosComercioCollection: { find: () => ({ fetch: () => products }) },
    nearbyStoreIds: ["store"],
    tiendasCercanas: stores,
    loadingTiendas: false,
    catalogQuery: { enabled: true, selector: {}, options: { limit: 3 }, limit: 2 },
    TIENDAS_CLIENT_FIELDS: {},
    PRODUCTOS_COMERCIO_FIELDS: {},
  });
  function flush() {
    let count = 0;
    while (dirty || timers.size) {
      assert.ok(++count < 30, "El foco debe estabilizarse");
      if (dirty) {
        dirty = false;
        cursor = 0;
        pendingEffects = [];
        state = renderTrackers();
        pendingEffects.forEach((effect) => effect());
      }
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    }
    return state;
  }
  return {
    subscriptions,
    mount: flush,
    focus(value) { focused = value; dirty = true; return flush(); },
    updateProduct(count) {
      products = [{ ...products[0], count }];
      for (const current of slots) {
        if (current.run) current.value = current.run();
      }
      dirty = true;
      return flush();
    },
    unmount() { slots.forEach((current) => current.cleanup?.()); timers.clear(); },
  };
}

test("abrir y volver del detalle conserva productos sin recargar el catalogo", (t) => {
  const harness = createHarness();
  t.after(() => harness.unmount());
  const initial = harness.mount();
  assert.equal(initial.productCount, 1);
  assert.equal(initial.loadingProducts, false);
  const initialSubscriptions = [...harness.subscriptions];
  assert.deepEqual(initialSubscriptions, ["categoriasComercioCatalogo", "tiendas", "productosComercio"]);
  for (let index = 0; index < 3; index += 1) {
    for (const focused of [false, true]) {
      const current = harness.focus(focused);
      assert.equal(current.dataReady, true);
      assert.equal(current.categoriesReady, true);
      assert.equal(current.loadingProducts, false);
      assert.equal(current.tiendasConProductos, initial.tiendasConProductos);
      assert.deepEqual(harness.subscriptions, initialSubscriptions);
    }
  }
});

test("conservar el catalogo al perder foco no congela cambios reactivos de stock", (t) => {
  const harness = createHarness();
  t.after(() => harness.unmount());
  harness.mount();
  harness.focus(false);
  const updated = harness.updateProduct(0);
  assert.equal(updated.tiendasConProductos[0].productos[0].count, 0);
  assert.equal(updated.tiendasConProductos[0].productosDisponibles, 0);
  const returned = harness.focus(true);
  assert.equal(returned.tiendasConProductos, updated.tiendasConProductos);
});
