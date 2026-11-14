/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const MemoryDb = require("@meteorrn/minimongo");
const ts = require("typescript");

// Ejecuta la sección y sus utilidades reales; los límites React/nativos se simulan.
function load(file, dependencies) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  assert.deepEqual(output.diagnostics, [], file);
  const exports = {};
  vm.runInNewContext(output.outputText, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
    fetch() { throw new Error("Red prohibida en las pruebas"); },
  }, { filename: file });
  return exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

// MemoryDb ejecuta selector, proyección y orden reales. La invalidación de
// useTracker se simula a partir de sus eventos; no se prueba DDP ni su scheduler.
function fixture() {
  const db = new MemoryDb();
  db.debug = false;
  const collection = db.addCollection("ventas_Recharge");
  const pushes = [];
  const subscriptions = [];
  const queries = [];
  const slots = [];
  let userId = "usuario-a";
  let ready = false;
  let cursor = 0;
  let trackerFn;
  let listening = false;
  let trackerData;
  let tree;
  let props = {};
  let renders = 0;
  let mounted = false;

  function render(nextProps = props) {
    props = nextProps;
    cursor = 0;
    renders += 1;
    tree = component(props);
    return tree;
  }
  function invalidate() {
    trackerData = trackerFn();
    if (mounted) render();
  }
  const React = {
    createElement: (type, elementProps, ...children) => ({ type, props: { ...elementProps, children } }),
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: initial };
      return [slots[index].value, (update) => {
        slots[index].value = typeof update === "function" ? update(slots[index].value) : update;
        if (mounted) render();
      }];
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!slots[index] || !sameDeps(slots[index].deps, deps)) {
        slots[index] = { value: factory(), deps: deps?.slice() };
      }
      return slots[index].value;
    },
    useCallback(callback, deps) {
      // Las dependencias se comprueban en el mock de useMemo.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      return React.useMemo(() => callback, deps);
    },
  };
  const Meteor = {
    userId: () => userId,
    subscribe(name, selector, options) {
      subscriptions.push(plain({ name, selector, options }));
      return { ready: () => ready };
    },
    useTracker(fn, deps) {
      assert.deepEqual(plain(deps), []);
      trackerFn = fn;
      if (!listening) {
        listening = true;
        db.on("change", invalidate);
        invalidate();
      }
      return trackerData;
    },
  };
  const utils = load("components/ventas/ventasUtils.js", {});
  const component = load("components/comercio/pedidos/ComercioHomeOrdersSection.native.jsx", {
    react: React,
    "@meteorrn/core": Meteor,
    "@expo/vector-icons/MaterialCommunityIcons": "Icon",
    "expo-router": { useRouter: () => ({ push: (route) => pushes.push(route) }) },
    "react-native": { View: "View", StyleSheet: { create: (styles) => styles } },
    "react-native-paper": { Surface: "Surface", Text: "Text", useTheme: () => ({ dark: false, colors: {} }) },
    "../../collections/collections": {
      VentasRechargeCollection: {
        find(selector, options) {
          queries.push(plain({ selector, options }));
          return { fetch: () => collection.find(selector, options) };
        },
      },
    },
    "../../motion/ServiceMotion": { ServiceEntrance: "ServiceEntrance", ServiceMotionProvider: "ServiceMotionProvider", ServicePressable: "ServicePressable" },
    "../../ventas/ventasUtils": utils,
    "./components/PedidoCard": "PedidoCard",
  }).default;

  return {
    pushes, queries, subscriptions,
    get tree() { return tree; },
    get renders() { return renders; },
    mount(initialProps) { render(initialProps); mounted = true; },
    render,
    setUser(value) { userId = value; if (trackerFn) invalidate(); },
    setReady(value) { ready = value; invalidate(); },
    upsert(doc) { collection.upsert(doc); },
    async flush() { await new Promise((resolve) => setImmediate(resolve)); },
    close() { mounted = false; db.removeListener("change", invalidate); },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
const byType = (tree, type) => nodes(tree).filter((node) => node.type === type);
const cards = (h) => byType(h.tree, "PedidoCard");
const ids = (h) => cards(h).map((card) => card.props.venta._id);
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  return text(tree.props.children);
}
const sale = (id, createdAt, extra = {}) => ({
  _id: id, userId: "usuario-a", createdAt, estado: "PREPARANDO",
  producto: { carritos: [{ type: "COMERCIO" }] }, ...extra,
});

test("suscribe y consulta los pedidos propios activos con campos y orden completos", async (t) => {
  const h = fixture();
  t.after(() => h.close());
  h.upsert([
    sale("antigua", 10), sale("nueva", 40, { estado: "ENCAMINO", isCobrado: true, cadeteid: "cadete", metodoPago: "EFECTIVO", privado: "omitido" }),
    sale("mixta", 30, { producto: { carritos: [{ type: "VPN" }, { type: "COMERCIO" }] } }),
    sale("cuarta", 20), sale("quinta", 9), sale("sexta", 8), sale("otro-usuario", 90, { userId: "usuario-b" }),
    sale("cancelada", 80, { isCancelada: true }), sale("entregada", 70, { estado: "ENTREGADO" }),
    sale("vpn", 60, { producto: { carritos: [{ type: "VPN" }] } }),
  ]);
  h.mount();
  assert.equal(h.tree, null, "la suscripción pendiente oculta incluso pedidos existentes");
  const selector = { userId: "usuario-a", "producto.carritos.type": "COMERCIO", estado: { $ne: "ENTREGADO" }, isCancelada: { $ne: true } };
  const options = { fields: { _id: 1, cadeteid: 1, createdAt: 1, estado: 1, isCancelada: 1, isCobrado: 1, metodoPago: 1, "producto.carritos": 1, userId: 1 }, sort: { createdAt: -1 } };
  assert.deepEqual(h.subscriptions.at(-1), { name: "ventasRecharge", selector, options });
  assert.deepEqual(h.queries.at(-1), { selector: { userId: "usuario-a" }, options });
  h.setReady(true);
  assert.deepEqual(ids(h), ["nueva", "mixta", "cuarta", "antigua", "quinta", "sexta"]);
  assert.equal(cards(h)[0].props.currentStep, 3);
  assert.deepEqual(plain(cards(h)[0].props.venta), {
    _id: "nueva", cadeteid: "cadete", createdAt: 40, estado: "ENCAMINO", isCobrado: true,
    metodoPago: "EFECTIVO", producto: { carritos: [{ type: "COMERCIO" }] }, userId: "usuario-a",
  });
  assert.ok(byType(h.tree, "Text").map(text).includes("Tienes 6 entregas de comercio en seguimiento."));
  assert.ok(byType(h.tree, "Text").map(text).includes("6"));
  await h.flush();
});

test("inserciones y cambios de estado o cobro actualizan las props de las tarjetas", async (t) => {
  const h = fixture();
  t.after(() => h.close());
  h.mount();
  h.setReady(true);
  assert.equal(h.tree, null);
  const before = h.renders;
  h.upsert(sale("primera", 1, { isCobrado: false }));
  await h.flush();
  assert.ok(h.renders > before, "la inserción invalida la consulta sin render manual");
  assert.deepEqual(ids(h), ["primera"]);
  assert.ok(byType(h.tree, "Text").map(text).includes("Tienes una entrega de comercio en seguimiento."));
  h.upsert(sale("segunda", 2));
  await h.flush();
  assert.deepEqual(ids(h), ["segunda", "primera"]);
  h.upsert({ _id: "primera", isCobrado: true });
  await h.flush();
  assert.equal(cards(h)[1].props.venta.isCobrado, true, "cobrar no oculta una entrega activa");
  assert.equal(cards(h)[1].props.currentStep, 1);
  h.upsert({ _id: "primera", estado: "CADETEENDESTINO" });
  await h.flush();
  assert.equal(cards(h)[1].props.currentStep, 4);
  h.upsert({ _id: "segunda", isCancelada: true });
  await h.flush();
  assert.deepEqual(ids(h), ["primera"]);
  h.upsert({ _id: "primera", estado: "ENTREGADO" });
  await h.flush();
  assert.equal(h.tree, null);
});

test("cambia de usuario y preparación sin mostrar pedidos de otra sesión", async (t) => {
  const h = fixture();
  t.after(() => h.close());
  h.setUser(null);
  h.mount();
  assert.equal(h.tree, null);
  assert.equal(h.subscriptions.length, 0);
  assert.equal(h.queries.length, 0);
  h.upsert([sale("a", 1), sale("b", 2, { userId: "usuario-b" })]);
  h.setUser("usuario-a");
  assert.equal(h.tree, null);
  h.setReady(true);
  assert.deepEqual(ids(h), ["a"]);
  h.setReady(false);
  h.setUser("usuario-b");
  assert.equal(h.tree, null);
  assert.equal(h.subscriptions.at(-1).selector.userId, "usuario-b");
  assert.equal(h.queries.at(-1).selector.userId, "usuario-b");
  h.setReady(true);
  assert.deepEqual(ids(h), ["b"]);
  h.setUser(null);
  assert.equal(h.tree, null);
  await h.flush();
});

test("expansión y navegación sobreviven a cambios reactivos y a props obsoletas", async (t) => {
  const h = fixture();
  t.after(() => h.close());
  h.upsert([sale("uno", 1), sale("dos", 2)]);
  h.mount({ catalogOrders: [sale("externa", 99)], catalogLoading: false });
  h.setReady(true);
  assert.deepEqual(ids(h), ["dos", "uno"]);
  cards(h)[1].props.onToggleExpand();
  assert.deepEqual(cards(h).map((card) => card.props.isExpanded), [false, true]);
  h.upsert({ _id: "uno", estado: "ENCAMINO" });
  await h.flush();
  assert.equal(cards(h)[1].props.currentStep, 3);
  assert.equal(cards(h)[1].props.isExpanded, true);
  h.render({ catalogOrders: [], catalogLoading: true });
  assert.deepEqual(ids(h), ["dos", "uno"], "las props antiguas no sustituyen la colección");
  assert.equal(cards(h)[1].props.isExpanded, true);
  cards(h)[1].props.onToggleExpand();
  assert.equal(cards(h)[1].props.isExpanded, false);
  const button = byType(h.tree, "ServicePressable");
  assert.equal(button.length, 1);
  assert.equal(button[0].props.accessibilityRole, "button");
  assert.equal(text(button[0]), "Ver todos");
  button[0].props.onPress();
  assert.deepEqual(h.pushes, ["/(normal)/MisCompras"]);
});