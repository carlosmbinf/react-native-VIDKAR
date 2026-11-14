/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const methods = [
  "home.getDtShopProducts",
  "home.getProxyVpnPackages",
  "home.getPendingDebt",
  "home.getPriceSetup",
  "home.getPendingEvidence",
  "home.getCashApprovals",
];

function responses(revision) {
  return {
    [methods[0]]: { dtshopProducts: [{ id: revision, name: `Producto ${revision}` }] },
    [methods[1]]: {
      proxyPackages: { porMegas: [{ id: `proxy-${revision}` }], porTiempo: [] },
      vpnPackages: { porMegas: [], porTiempo: [{ id: `vpn-${revision}` }] },
    },
    [methods[2]]: { pendingDebtVentas: [{ precio: revision }] },
    [methods[3]]: { ownServicePrices: [{ type: "megas" }] },
    [methods[4]]: { pendingEvidenceVentas: [{ _id: `evidence-${revision}` }] },
    [methods[5]]: { cashApprovalVentas: [{ type: "PROXY" }] },
  };
}

// Renderiza la pantalla contenedora y el hook reales; solo la vista hija y los
// límites nativos/Meteor se sustituyen. No modela el layout ni un dispositivo.
function createHarness() {
  const slots = [];
  const timers = new Map();
  const calls = [];
  let now = 100000;
  let nextTimer = 0;
  let cursor = 0;
  let pendingEffects = [];
  let dirty = true;
  let mounted = true;
  let focused = true;
  let revision = 1;
  let tree;

  const sameDeps = (a, b) => a !== undefined && b !== undefined &&
    a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const slot = (kind, initial) => {
    const index = cursor++;
    if (!slots[index]) slots[index] = { kind, ...initial() };
    assert.equal(slots[index].kind, kind, `Orden de hooks en ${index}`);
    return slots[index];
  };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const state = slot("state", () => ({ value: typeof initial === "function" ? initial() : initial }));
      if (!state.set) state.set = (update) => {
        if (!mounted) return;
        const next = typeof update === "function" ? update(state.value) : update;
        if (!Object.is(next, state.value)) {
          state.value = next;
          dirty = true;
        }
      };
      return [state.value, state.set];
    },
    useRef(initial) {
      return slot("ref", () => ({ value: { current: initial } })).value;
    },
    useMemo(factory, deps) {
      const memo = slot("memo", () => ({}));
      if (!sameDeps(memo.deps, deps)) {
        memo.value = factory();
        memo.deps = deps?.slice();
      }
      return memo.value;
    },
    useCallback(fn, deps) {
      // Este es el mock del hook: las dependencias pertenecen al componente real.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      return React.useMemo(() => fn, deps);
    },
    useEffect(effect, deps) {
      const state = slot("effect", () => ({}));
      if (!sameDeps(state.deps, deps)) pendingEffects.push({ state, effect, deps: deps?.slice() });
    },
  };
  const setTimer = (fn, delay = 0) => {
    const id = ++nextTimer;
    timers.set(id, { fn, due: now + Math.max(0, delay) });
    return id;
  };
  const user = { _id: "fixture-user", username: "fixture", profile: { role: "user" } };
  const Meteor = {
    useTracker: (fn) => fn(),
    call(method, ...args) {
      assert.ok(methods.includes(method), `Método inesperado: ${method}`);
      assert.equal(args.length, 1, `Argumentos inesperados para ${method}`);
      const callback = args[0];
      assert.equal(typeof callback, "function");
      calls.push(method);
      callback(null, responses(revision)[method]);
    },
  };
  const dependencies = {
    react: React,
    "@meteorrn/core": Meteor,
    "expo-router": { router: { push() {}, replace() {} } },
    "expo-router/react-navigation": {
      useIsFocused: () => focused,
      // El arnés fuerza un render al cambiar focused, como haría el navegador.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useFocusEffect: (callback) => React.useEffect(() => focused ? callback() : undefined, [focused, callback]),
    },
    "react-native": {
      Alert: { alert() {} },
      AppState: { addEventListener: () => ({ remove() {} }) },
      Linking: { openSettings: async () => {} },
    },
    "../../services/meteor/session.native": { useCurrentSession: () => ({ user, userId: user._id }) },
    "../../services/app/appVersion": { getAppVersionInfo: () => ({ version: "test", buildNumber: "test" }) },
    "../../services/location/cadeteLocationDisclosure.native": {},
    "../../services/location/cadeteBackgroundLocation.native": {},
    "../../services/notifications/PushMessaging.native": {
      getPushNotificationPermissionState: async () => ({ granted: true, canAskAgain: true }),
    },
    "../../services/mcp/mcpClient": {},
    "../archivos/evidencePendingUtils": { buildPendingEvidenceAggregate: (items) => ({ pendingEvidenceCount: items.length }) },
    "../navigator/sessionRoute": { userHasEmpresaRole: () => false },
    "./MenuPrincipalScreen.jsx": "MenuPrincipalScreen",
  };
  const load = (file) => {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    const output = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    });
    assert.deepEqual(output.diagnostics, [], file);
    const exports = {};
    vm.runInNewContext(output.outputText, {
      exports,
      React,
      require(name) {
        assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
        return dependencies[name];
      },
      Date: class extends Date { static now() { return now; } },
      performance: { now: () => now },
      setTimeout: setTimer,
      clearTimeout: (id) => timers.delete(id),
      console: { log() {}, warn() {} },
      fetch: () => { throw new Error("Red prohibida en esta prueba"); },
    }, { filename: file });
    return exports.default;
  };
  dependencies["../../hooks/useDeferredScreenData"] = load("hooks/useDeferredScreenData.js");
  const MenuPrincipal = load("components/Main/MenuPrincipal.native.jsx");

  function render() {
    let count = 0;
    while (dirty && mounted) {
      assert.ok(++count <= 50, "Los efectos deben estabilizarse");
      dirty = false;
      cursor = 0;
      pendingEffects = [];
      tree = MenuPrincipal();
      assert.equal(tree.type, "MenuPrincipalScreen");
      assert.equal(cursor, slots.length, "Cantidad estable de hooks");
      for (const { state } of pendingEffects) state.cleanup?.();
      for (const { state, effect, deps } of pendingEffects) {
        state.deps = deps;
        state.cleanup = effect();
      }
    }
  }
  async function flush() {
    // Las seis llamadas se resuelven secuencialmente mediante promesas.
    for (let i = 0; i < 50; i += 1) {
      render();
      await Promise.resolve();
    }
    render();
  }
  async function advance(ms) {
    const end = now + ms;
    let executed = 0;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.due <= end)
        .sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!next) break;
      assert.ok(++executed <= 100, "Los temporizadores deben estabilizarse");
      const [id, timer] = next;
      timers.delete(id);
      now = timer.due;
      timer.fn();
      await flush();
    }
    now = end;
    await flush();
  }
  return {
    calls,
    get props() { return tree.props; },
    setRevision(value) { revision = value; },
    async mount() { await flush(); await advance(0); },
    async focus(value) { focused = value; dirty = true; await flush(); await advance(0); },
    async refresh() { const promise = tree.props.onRefresh(); await flush(); return { promise }; },
    advance,
    unmount() {
      mounted = false;
      for (const state of slots) if (state.kind === "effect") state.cleanup?.();
      timers.clear();
    },
  };
}

function expectedCatalogs(revision) {
  return Object.assign({}, ...Object.values(responses(revision)));
}

function assertCatalogs(actual, revision) {
  // El objeto raíz se crea en otro contexto VM; comparar su contenido observable.
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expectedCatalogs(revision));
}

async function initialLoad(t) {
  const harness = createHarness();
  t.after(() => harness.unmount());
  await harness.mount();
  assert.deepEqual(harness.calls, methods, "la carga inicial solicita los seis métodos en orden");
  assert.ok(!harness.calls.includes("home.getCommerceOrders"));
  assertCatalogs(harness.props.normalHomeCatalogs, 1);
  assert.equal(harness.props.homeRefreshing, true);
  await harness.advance(699);
  assert.equal(harness.props.homeRefreshing, true, "la carga dura al menos 700 ms");
  await harness.advance(1);
  assert.equal(harness.props.homeRefreshing, false);
  assert.equal(harness.props.normalHomeCatalogsLoading, false);
  return harness;
}

test("la primera carga obtiene los seis catálogos y respeta el tiempo mínimo", async (t) => {
  await initialLoad(t);
});

test("blur y focus ordinarios conservan los catálogos sin volver a solicitarlos", async (t) => {
  const harness = await initialLoad(t);
  await harness.focus(false);
  assertCatalogs(harness.props.normalHomeCatalogs, 1);
  assert.deepEqual(harness.calls, methods, "perder el foco no debe solicitar catálogos");
  await harness.focus(true);
  await harness.advance(700);
  assertCatalogs(harness.props.normalHomeCatalogs, 1);
  assert.equal(harness.props.homeRefreshing, false);
  assert.deepEqual(harness.calls, methods, "volver a enfocar no debe repetir las seis llamadas");
});

test("el refresco manual vuelve a solicitar los seis métodos y actualiza los catálogos", async (t) => {
  const harness = await initialLoad(t);
  harness.setRevision(2);
  const { promise } = await harness.refresh();
  assert.deepEqual(harness.calls, [...methods, ...methods]);
  assertCatalogs(harness.props.normalHomeCatalogs, 2);
  assert.equal(harness.props.homeRefreshing, true);
  await harness.advance(699);
  assert.equal(harness.props.homeRefreshing, true);
  await harness.advance(1);
  await promise;
  assert.equal(harness.props.homeRefreshing, false);
  assert.equal(harness.props.normalHomeCatalogsLoading, false);
});