/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Renderiza JSX real y simula hooks, cómputos Meteor y hosts nativos; no usa red.
function createHarness() {
  const instances = new Map();
  const mapHosts = new Map();
  const subscriptions = [];
  const documents = { users: {}, stores: {}, sales: {} };
  const ready = {};
  let current;
  let scope;
  let revision = 0;
  let root;
  let props;
  let tree;
  let dirty = false;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const slot = (kind, init = () => ({})) => {
    const index = current.cursor++;
    const item = current.slots[index] ||= { kind, ...init() };
    assert.equal(item.kind, kind);
    return item;
  };
  const React = {
    Fragment: "Fragment",
    createElement: (type, attrs, ...children) => ({ type, props: { ...attrs, children } }),
    memo: (component, compare) => ({ component, compare }),
    useRef: (initial) => slot("ref", () => ({ value: { current: initial } })).value,
    useState(initial) {
      const state = slot("state", () => ({ value: typeof initial === "function" ? initial() : initial }));
      return [state.value, (value) => {
        const next = typeof value === "function" ? value(state.value) : value;
        if (!Object.is(next, state.value)) { state.value = next; dirty = true; }
      }];
    },
    useEffect(effect, deps) {
      const state = slot("effect");
      if (!same(state.deps, deps)) {
        current.effects.push(() => { state.cleanup?.(); state.deps = deps; state.cleanup = effect(); });
      }
    },
  };
  const stop = (item) => { for (const sub of item.subs || []) sub.active = false; item.subs = []; };
  const Meteor = {
    user: () => ({ _id: "cliente" }),
    subscribe(name, selector, options) {
      assert.ok(scope, "Suscripción fuera del cómputo");
      assert.ok(["tiendas", "user", "ventasRecharge"].includes(name));
      const sub = { name, id: selector._id, options, active: true };
      subscriptions.push(sub);
      scope.subs.push(sub);
      return { ready: () => ready[`${name}:${selector._id}`] !== false };
    },
    users: { findOne: (selector) => documents.users[selector._id] || null },
    useTracker(fn, deps) {
      const item = slot("tracker", () => ({ subs: [] }));
      if (!same(item.deps, deps) || item.revision !== revision) {
        stop(item);
        item.deps = deps;
        item.revision = revision;
        scope = item;
        item.value = fn();
        scope = null;
      }
      return item.value;
    },
  };
  class AnimatedValue {
    setValue() {}
    interpolate() { return 0; }
  }
  const native = {
    Platform: { OS: "ios" }, View: "View", StyleSheet: { create: (styles) => styles },
    Animated: { Value: AnimatedValue, View: "Animated.View", timing: () => ({}), parallel: () => ({ start() {} }) },
    Easing: { bezier: () => () => 0 },
  };
  const paper = {
    ActivityIndicator: "ActivityIndicator", Text: "Text", Surface: "Surface", Divider: "Divider",
    IconButton: "IconButton", Card: { Title: "Card.Title" },
    useTheme: () => ({ dark: false, colors: {} }),
  };
  const collections = {
    TiendasComercioCollection: { findOne: ({ _id }) => documents.stores[_id] || null },
    VentasRechargeCollection: { findOne: ({ _id }) => documents.sales[_id] || null },
  };
  const dependencies = {
    react: React, "@meteorrn/core": Meteor, "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "react-native": native, "react-native-paper": paper,
    "react-native-maps": { __esModule: true, default: "MapView", Marker: "Marker", Polyline: "Polyline" },
    "expo-linear-gradient": { LinearGradient: "LinearGradient" },
    "../../collections/collections": collections, "../../../collections/collections": collections,
    "../../../archivos/SubidaArchivos.native": "SubidaArchivos", "./PedidoStepper": "PedidoStepper",
  };
  function load(file) {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true, compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } });
    assert.deepEqual(result.diagnostics, []);
    const exports = {};
    vm.runInNewContext(result.outputText, { exports, React, require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    } }, { filename: file });
    return exports.default;
  }
  const map = load("components/comercio/maps/MapaPedidoConCadete.native.jsx");
  dependencies["../../maps/MapaPedidoConCadete"] = map;
  const card = load("components/comercio/pedidos/components/PedidoCard.native.jsx");
  function resolve(node, key, visited, effects, force) {
    if (Array.isArray(node)) return node.map((child, i) => resolve(child, `${key}.${i}`, visited, effects, force));
    if (!node || typeof node !== "object" || !node.type) return node;
    let type = node.type;
    if (typeof type === "function" || type.component) {
      const instance = instances.get(key) || { slots: [], type };
      if (instance.type !== type) { instance.slots.forEach(stop); instance.slots = []; instance.type = type; }
      instances.set(key, instance);
      visited.add(key);
      if (type.component && !force && instance.props && type.compare(instance.props, node.props)) {
        for (const id of instances.keys()) if (id.startsWith(`${key}.`)) visited.add(id);
        for (const id of mapHosts.keys()) if (id.startsWith(`${key}.`)) visited.add(id);
        return instance.tree;
      }
      instance.props = node.props;
      instance.cursor = 0;
      instance.effects = [];
      current = instance;
      if (type.component) type = type.component;
      const rendered = type(node.props);
      effects.push(...instance.effects);
      instance.tree = resolve(rendered, `${key}.child`, visited, effects, force);
      return instance.tree;
    }
    if (type === "MapView") {
      visited.add(key);
      if (!mapHosts.has(key)) mapHosts.set(key, { camera: node.props.initialRegion });
    }
    return { ...node, props: { ...node.props, children: resolve(node.props.children, `${key}.children`, visited, effects, force) } };
  }
  function render(force = false) {
    let count = 0;
    do {
      assert.ok(++count < 20, "Render debe estabilizarse");
      dirty = false;
      const visited = new Set();
      const effects = [];
      tree = resolve(React.createElement(root, props), "root", visited, effects, force);
      for (const [key, instance] of instances) if (!visited.has(key)) {
        instance.slots.forEach((item) => { stop(item); item.cleanup?.(); });
        instances.delete(key);
      }
      for (const key of mapHosts.keys()) if (!visited.has(key)) mapHosts.delete(key);
      effects.forEach((effect) => effect());
    } while (dirty);
    return tree;
  }
  return {
    documents, subscriptions, ready, map, card,
    mount(component, initial) { root = component; props = initial; return render(); },
    update(next) { props = next; return render(); },
    invalidate() { revision++; return render(true); },
    moveCamera(region) { assert.equal(mapHosts.size, 1); mapHosts.values().next().value.camera = region; },
    get camera() { return mapHosts.values().next().value?.camera; },
    unmount() { instances.forEach((instance) => instance.slots.forEach((item) => { stop(item); item.cleanup?.(); })); instances.clear(); },
    get tree() { return tree; },
  };
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object") return [];
  return [node, ...nodes(node.props?.children)];
}
const all = (h, type) => nodes(h.tree).filter((node) => node.type === type);
const marker = (h) => all(h, "Marker").find((node) => node.props.description === "Posición actual del repartidor");
const coords = (value) => value && [value.latitude, value.longitude];
const activeUsers = (h) => h.subscriptions.filter((s) => s.active && s.name === "user");
const destination = { latitude: 0, longitude: 0 };

test("ubicación reactiva admite ambos nombres, cero y mantiene la cámara del usuario", () => {
  const h = createHarness();
  h.documents.stores.store = { ubicacion: { latitud: 0, longitud: 1 } };
  h.documents.users.a = { username: "A", cordenadas: { latitude: 0, longitude: "2" } };
  h.mount(h.map, { idTienda: "store", cadeteId: "a", coordenadasDestino: destination });
  assert.deepEqual(coords(marker(h).props.coordinate), [0, 2]);
  assert.deepEqual(coords(all(h, "Marker")[0].props.coordinate), [0, 1]);
  const view = all(h, "MapView")[0];
  assert.ok(view.props.initialRegion);
  assert.equal(view.props.region, undefined, "La cámara no debe ser controlada en cada actualización");
  const userCamera = { latitude: 8, longitude: 9, latitudeDelta: 0.02, longitudeDelta: 0.02 };
  h.moveCamera(userCamera);
  const sub = activeUsers(h)[0];
  assert.deepEqual(Object.keys(sub.options.fields).sort(), ["coordenadas", "cordenadas", "username"]);
  h.documents.users.a = { username: "A", coordenadas: { latitude: "3", longitude: 0 } };
  h.invalidate();
  assert.deepEqual(coords(marker(h).props.coordinate), [3, 0]);
  assert.equal(all(h, "MapView").length, 1);
  assert.equal(all(h, "MapView")[0].props.region, undefined);
  assert.equal(h.camera, userCamera, "La cámara manipulada no se reinicia al cambiar la ubicación");
  assert.deepEqual(coords(all(h, "Polyline")[0].props.coordinates[1]), [3, 0]);
  h.documents.users.a = { cordenadas: { latitude: 4, longitude: 5 }, coordenadas: { latitude: 3, longitude: 0 } };
  h.invalidate();
  assert.deepEqual(coords(marker(h).props.coordinate), [4, 5], "El campo histórico de seguimiento tiene prioridad");
  h.unmount();
  assert.equal(activeUsers(h).length, 0);
});

test("datos inválidos no crean marcadores y la ubicación válida alternativa sí", () => {
  const h = createHarness();
  h.documents.stores.store = { coordenadas: { latitude: "", longitude: null } };
  h.documents.users.a = { cordenadas: { latitude: 91, longitude: 1 }, coordenadas: { latitude: 0, longitude: 0 } };
  h.mount(h.map, { idTienda: "store", cadeteId: "a", coordenadasDestino: { latitude: "bad", longitude: 0 } });
  assert.equal(all(h, "Marker").length, 1);
  assert.deepEqual(coords(marker(h).props.coordinate), [0, 0]);
  assert.equal(all(h, "MapView")[0].props.initialRegion.latitude, 0);
  h.documents.users.a = { cordenadas: { latitude: Infinity, longitude: 0 } };
  h.invalidate();
  assert.equal(all(h, "MapView").length, 0);
  h.unmount();
});

test("reasignar cambia la suscripción y nunca muestra la posición anterior mientras carga", () => {
  const h = createHarness();
  h.documents.stores.store = { coordenadas: { latitude: 1, longitude: 1 } };
  h.documents.users.a = { cordenadas: { latitude: 2, longitude: 2 } };
  h.documents.users.b = { coordenadas: { latitude: 3, longitude: 3 } };
  const props = { idTienda: "store", cadeteId: "a", coordenadasDestino: destination };
  h.mount(h.map, props);
  const userCamera = { latitude: 5, longitude: 6, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  h.moveCamera(userCamera);
  h.ready["user:b"] = false;
  h.update({ ...props, cadeteId: "b" });
  assert.deepEqual(activeUsers(h).map((s) => s.id), ["b"]);
  assert.equal(marker(h), undefined);
  assert.equal(all(h, "MapView").length, 1);
  assert.equal(h.camera, userCamera);
  h.ready["user:b"] = true;
  h.invalidate();
  assert.deepEqual(coords(marker(h).props.coordinate), [3, 3]);
  assert.equal(h.camera, userCamera);
  h.update({ ...props, cadeteId: null });
  assert.equal(activeUsers(h).length, 0);
  assert.equal(marker(h), undefined);
  h.unmount();
});

test("el detalle reactivo reasigna sin cambios de props y no recupera una asignación eliminada", () => {
  const h = createHarness();
  h.documents.stores.store = { coordenadas: { latitude: 1, longitude: 1 } };
  h.documents.users.a = { cordenadas: { latitude: 2, longitude: 2 } };
  h.documents.users.b = { cordenadas: { latitude: 3, longitude: 3 } };
  const venta = { _id: "venta", estado: "ENCAMINO", cadeteid: "a", isCobrado: true,
    producto: { carritos: [{ idTienda: "store", coordenadas: destination }] } };
  h.documents.sales.venta = venta;
  h.mount(h.card, { venta, currentStep: 3, isExpanded: true, onToggleExpand() {} });
  h.documents.sales.venta = { ...venta, cadeteid: "b" };
  h.invalidate();
  assert.deepEqual(coords(marker(h).props.coordinate), [3, 3]);
  assert.ok(activeUsers(h).every((sub) => sub.id === "b"));
  const { cadeteid: _removed, ...unassigned } = venta;
  h.documents.sales.venta = unassigned;
  h.invalidate();
  assert.equal(all(h, "MapView").length, 0);
  assert.equal(activeUsers(h).length, 0);
  h.unmount();
});

test("pedido cerrado o cancelado no inicia seguimiento de ubicación", () => {
  for (const extra of [{ isExpanded: false }, { isExpanded: true, isCancelada: true }, { isExpanded: true, estado: "ENTREGADO" }]) {
    const h = createHarness();
    const venta = { _id: "venta", estado: extra.estado || "ENCAMINO", cadeteid: "a", isCobrado: true,
      isCancelada: extra.isCancelada, producto: { carritos: [{ idTienda: "store", coordenadas: destination }] } };
    h.documents.sales.venta = venta;
    h.mount(h.card, { venta, currentStep: 3, isExpanded: extra.isExpanded, onToggleExpand() {} });
    assert.equal(all(h, "MapView").length, 0);
    assert.equal(activeUsers(h).filter((sub) => sub.options.fields.cordenadas || sub.options.fields.coordenadas).length, 0);
    h.unmount();
  }
});

test("tarjeta memoizada propaga cambios de asignación y cierra tracking al retirar cadete", () => {
  const h = createHarness();
  h.documents.stores.store = { coordenadas: { latitude: 1, longitude: 1 } };
  h.documents.users.a = { username: "A", cordenadas: { latitude: 2, longitude: 2 } };
  h.documents.users.b = { username: "B", coordenadas: { latitude: 3, longitude: 3 } };
  const venta = { _id: "venta", estado: "ENCAMINO", cadeteid: "a", isCobrado: true,
    producto: { carritos: [{ idTienda: "store", coordenadas: destination }] } };
  h.documents.sales.venta = venta;
  const props = { venta, currentStep: 3, isExpanded: true, onToggleExpand() {} };
  h.mount(h.card, props);
  assert.deepEqual(coords(marker(h).props.coordinate), [2, 2]);
  const userCamera = { latitude: 5, longitude: 6, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  h.moveCamera(userCamera);
  h.update(props);
  assert.equal(h.camera, userCamera, "Un render omitido por memo conserva el mapa");
  h.documents.sales.venta = { ...venta, cadeteid: "b" };
  h.update({ ...props, venta: { ...venta, cadeteid: "b" } });
  assert.deepEqual(coords(marker(h).props.coordinate), [3, 3]);
  assert.equal(h.camera, userCamera);
  assert.ok(activeUsers(h).every((sub) => sub.id === "b"));
  h.documents.sales.venta = { ...venta, cadeteid: null };
  h.invalidate();
  assert.equal(all(h, "MapView").length, 0);
  assert.equal(activeUsers(h).length, 0);
  h.unmount();
});