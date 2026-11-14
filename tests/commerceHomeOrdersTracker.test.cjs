/* global __dirname */
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const coreRoot = path.dirname(require.resolve("@meteorrn/core/package.json")) + path.sep;
const componentPath = path.join(root, "components/comercio/pedidos/ComercioHomeOrdersSection.native.jsx");
const utilsPath = path.join(root, "components/ventas/ventasUtils.js");
const plain = (value) => JSON.parse(JSON.stringify(value));
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

function transpile(source, fileName) {
  const result = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  assert.deepEqual(result.diagnostics, [], fileName);
  return result.outputText;
}

function load(source, fileName, dependencies) {
  const exports = {};
  vm.runInNewContext(transpile(source, fileName), {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
    fetch() { throw new Error("Red prohibida en las pruebas"); },
  }, { filename: fileName });
  return exports;
}

// Hooks suficientes para montar este componente: forceUpdate solo programa un
// render, nunca invalida Tracker ni ejecuta por su cuenta la consulta.
function makeReact() {
  const slots = [];
  const effects = [];
  let index = 0;
  let dirty = false;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const i = index++;
      if (!slots[i]) slots[i] = { value: initial };
      return [slots[i].value, (value) => { slots[i].value = typeof value === "function" ? value(slots[i].value) : value; dirty = true; }];
    },
    useRef(initial) {
      const i = index++;
      if (!slots[i]) slots[i] = { current: initial };
      return slots[i];
    },
    useReducer(reducer, initial) {
      const i = index++;
      if (!slots[i]) slots[i] = { value: initial };
      return [slots[i].value, (action) => { slots[i].value = reducer(slots[i].value, action); dirty = true; }];
    },
    useMemo(factory, deps) {
      const i = index++;
      if (!slots[i] || !sameDeps(slots[i].deps, deps)) slots[i] = { value: factory(), deps: deps?.slice() };
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = index++;
      if (!slots[i] || !sameDeps(slots[i].deps, deps)) {
        slots[i] = { deps: deps?.slice() };
        effects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect(); });
      }
    },
  };
  // El mock de useMemo ya compara las dependencias del callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useCallback = (fn, deps) => React.useMemo(() => fn, deps);
  return {
    React,
    render(component) {
      let tree;
      do {
        dirty = false;
        index = 0;
        tree = component();
        while (effects.length) effects.shift()();
      } while (dirty);
      return tree;
    },
    get dirty() { return dirty; },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

function fixture({ restrictedQuery = false } = {}) {
  const hooks = makeReact();
  const calls = [];
  class OfflineDDP extends EventEmitter {
    constructor() { super(); this.autoReconnect = false; }
    sub(name, params) {
      const id = `offline-${calls.filter((call) => call.type === "sub").length + 1}`;
      calls.push({ type: "sub", id, name, params: plain(params) });
      return id;
    }
    unsub(id) { calls.push({ type: "unsub", id }); }
    connect() { throw new Error("Red prohibida en las pruebas"); }
    disconnect() {}
  }

  // Node transpila las fuentes instaladas sin parchearlas. Se sustituyen solo
  // el transporte, las funciones nativas y React, no Tracker ni Minimongo.
  for (const key of Object.keys(require.cache)) if (key.startsWith(coreRoot)) delete require.cache[key];
  delete require.cache[require.resolve("ejson", { paths: [coreRoot] })];
  const originalExtension = Module._extensions[".js"];
  const originalLoad = Module._load;
  const originalNextTick = process.nextTick;
  const originalAfterInteractions = global.afterInteractions;
  const originalWebSocket = global.WebSocket;
  let Meteor;
  try {
    Module._extensions[".js"] = (module, filename) => filename.startsWith(coreRoot)
      ? module._compile(transpile(fs.readFileSync(filename, "utf8"), filename), filename)
      : originalExtension(module, filename);
    Module._load = function (request, parent, isMain) {
      if (parent?.filename.startsWith(coreRoot)) {
        if (request === "react") return hooks.React;
        if (request === "../lib/ddp.js") return { __esModule: true, default: OfflineDDP };
        if (request.includes("reactNativeBindings")) return { batchedUpdates: (fn) => fn(), runAfterInteractions: (fn) => setTimeout(fn, 0) };
      }
      return originalLoad.apply(this, arguments);
    };
    global.WebSocket = class { constructor() { throw new Error("Red prohibida en las pruebas"); } };
    Meteor = require("@meteorrn/core").default;
    Meteor.connect("ws://offline.invalid/websocket", { AsyncStorage: { getItem: async () => null, setItem() {}, removeItem() {} }, NetInfo: null });
  } finally {
    Module._extensions[".js"] = originalExtension;
    Module._load = originalLoad;
    process.nextTick = originalNextTick;
    if (originalAfterInteractions === undefined) delete global.afterInteractions;
    else global.afterInteractions = originalAfterInteractions;
    if (originalWebSocket === undefined) delete global.WebSocket;
    else global.WebSocket = originalWebSocket;
  }

  const ddp = Meteor.getData().ddp;
  const collection = new Meteor.Mongo.Collection("ventas_Recharge");
  const queries = [];
  const originalFind = collection.find.bind(collection);
  collection.find = (selector, options) => {
    queries.push(plain({ selector, options }));
    return originalFind(selector, options);
  };
  const utils = load(fs.readFileSync(utilsPath, "utf8"), utilsPath, {});
  let source = fs.readFileSync(componentPath, "utf8");
  if (restrictedQuery) {
    const current = "VentasRechargeCollection.find({ userId }, options)";
    assert.ok(source.includes(current), "La mutación debe afectar el selector local real");
    source = source.replace(current, "VentasRechargeCollection.find(selector, options)");
  }
  const component = load(source, componentPath, {
    react: hooks.React,
    "@meteorrn/core": Meteor,
    "@expo/vector-icons/MaterialCommunityIcons": "Icon",
    "expo-router": { useRouter: () => ({ push() {} }) },
    "react-native": { View: "View", StyleSheet: { create: (styles) => styles } },
    "react-native-paper": { Surface: "Surface", Text: "Text", useTheme: () => ({ dark: false, colors: {} }) },
    "../../collections/collections": { VentasRechargeCollection: collection },
    "../../motion/ServiceMotion": { ServiceEntrance: "ServiceEntrance", ServiceMotionProvider: "ServiceMotionProvider", ServicePressable: "ServicePressable" },
    "../../ventas/ventasUtils": utils,
    "./components/PedidoCard": "PedidoCard",
  }).default;
  let tree;
  let mounted = false;
  return {
    Meteor, ddp, calls, queries,
    get tree() { return tree; },
    mount() { mounted = true; tree = hooks.render(component); },
    flush() {
      Meteor.Tracker.flush({ _throwFirstError: true });
      if (mounted && hooks.dirty) tree = hooks.render(component);
    },
    unmount() { if (mounted) { mounted = false; hooks.unmount(); this.flush(); } },
    raw(id) { return Meteor.getData().db.ventas_Recharge.findOne({ _id: id }); },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
const ids = (tree) => nodes(tree).filter((node) => node.type === "PedidoCard").map((node) => node.props.venta._id);
const add = (h, id, fields) => h.ddp.emit("added", { collection: "ventas_Recharge", id, fields });
const change = (h, id, fields) => h.ddp.emit("changed", { collection: "ventas_Recharge", id, fields });
const sale = (createdAt) => ({ userId: "usuario-a", createdAt, estado: "PREPARANDO", isCancelada: false, producto: { carritos: [{ type: "COMERCIO" }] } });
const activeSelector = { userId: "usuario-a", "producto.carritos.type": "COMERCIO", estado: { $ne: "ENTREGADO" }, isCancelada: { $ne: true } };

function setup(h) {
  h.ddp.emit("added", { collection: "users", id: "usuario-a", fields: {} });
  h.Meteor._reactiveDict.set("_userIdSaved", "usuario-a");
  h.mount();
  h.flush();
  const home = h.calls.find((call) => call.type === "sub");
  assert.equal(home.name, "ventasRecharge");
  assert.deepEqual(home.params[0], activeSelector);
  // La segunda suscripción representa una pantalla de detalle que conserva
  // documentos. Los mensajes DDP ya reflejan la unión calculada en el servidor;
  // este transporte aislado no pretende implementar su mergebox.
  const detail = h.Meteor.subscribe("ventasRecharge", { userId: "usuario-a" });
  const detailCall = h.calls.at(-1);
  assert.notEqual(detailCall.id, home.id);
  return { home, detail, detailCall };
}

test("DDP y Tracker reales actualizan pedidos activos, removed y logout", (t) => {
  const h = fixture();
  t.after(() => h.unmount());
  const { home, detail, detailCall } = setup(h);
  t.after(() => detail.stop());
  assert.deepEqual(h.queries[0].selector, { userId: "usuario-a" });
  assert.deepEqual(h.queries[0].options, home.params[1]);
  assert.deepEqual(home.params[1].sort, { createdAt: -1 });
  assert.equal(h.tree, null);

  add(h, "entrega", sale(3));
  add(h, "cancelacion", sale(2));
  add(h, "eliminado", sale(1));
  h.flush();
  assert.equal(h.tree, null, "added no sustituye ready");
  h.ddp.emit("ready", { subs: [home.id, detailCall.id] });
  h.flush();
  assert.deepEqual(ids(h.tree), ["entrega", "cancelacion", "eliminado"]);
  assert.equal(detail.ready(), true);

  change(h, "entrega", { estado: "ENTREGADO" });
  h.flush();
  assert.equal(h.raw("entrega").estado, "ENTREGADO", "la otra suscripción conserva el documento");
  assert.deepEqual(ids(h.tree), ["cancelacion", "eliminado"], "changed debe invalidar el selector estable");
  change(h, "cancelacion", { isCancelada: true });
  h.flush();
  assert.equal(h.raw("cancelacion").isCancelada, true);
  assert.deepEqual(ids(h.tree), ["eliminado"]);

  // El último render reactivo ha registrado el selector de usuario antes de removed.
  assert.deepEqual(h.queries.at(-1).selector, { userId: "usuario-a" });
  h.ddp.emit("removed", { collection: "ventas_Recharge", id: "eliminado" });
  h.flush();
  assert.equal(h.raw("eliminado"), null);
  assert.equal(h.tree, null);
  assert.ok(h.queries.every((query) => JSON.stringify(query.selector) === JSON.stringify({ userId: "usuario-a" })));
  assert.ok(Object.values(h.Meteor.getData().subscriptions).some((sub) => sub.subIdRemember === home.id && !sub.inactive));
  assert.equal(h.calls.filter((call) => call.type === "sub" && call.id === home.id).length, 1);
  assert.equal(h.calls.some((call) => call.type === "unsub" && call.id === home.id), false);

  add(h, "antes-de-logout", sale(4));
  h.flush();
  assert.deepEqual(ids(h.tree), ["antes-de-logout"]);
  h.Meteor.handleLogout();
  h.flush();
  assert.equal(h.tree, null);
  assert.ok(h.calls.some((call) => call.type === "unsub" && call.id === home.id), "logout detiene la suscripción del componente");
  assert.equal(detail.ready(), true, "la suscripción externa sigue activa hasta detenerla");
});

test("desmontar detiene la suscripción del componente", (t) => {
  const h = fixture();
  t.after(() => h.unmount());
  const { home, detail } = setup(h);
  t.after(() => detail.stop());
  h.unmount();
  assert.ok(h.calls.some((call) => call.type === "unsub" && call.id === home.id));
  assert.equal(Object.values(h.Meteor.getData().subscriptions).some((sub) => sub.subIdRemember === home.id), false);
});

test("control negativo: el selector local restringido deja la tarjeta obsoleta", (t) => {
  const h = fixture({ restrictedQuery: true });
  t.after(() => h.unmount());
  const { home, detail, detailCall } = setup(h);
  t.after(() => detail.stop());
  add(h, "pedido", sale(1));
  add(h, "pedido-cancelado", sale(2));
  h.ddp.emit("ready", { subs: [home.id, detailCall.id] });
  h.flush();
  assert.deepEqual(ids(h.tree), ["pedido-cancelado", "pedido"]);
  change(h, "pedido", { estado: "ENTREGADO" });
  h.flush();
  assert.equal(h.raw("pedido").estado, "ENTREGADO");
  assert.deepEqual(ids(h.tree), ["pedido-cancelado", "pedido"], "el selector restringido no se invalida al entregar");
  change(h, "pedido-cancelado", { isCancelada: true });
  h.flush();
  assert.equal(h.raw("pedido-cancelado").isCancelada, true);
  assert.deepEqual(ids(h.tree), ["pedido-cancelado", "pedido"], "el selector restringido tampoco se invalida al cancelar");
});