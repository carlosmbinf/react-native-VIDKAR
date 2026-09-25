import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const RESULT_ID = "7cebedbd-865d-4e3a-9136-08e663bf5f34";
const sources = await Promise.all([
  "../services/mcp/mcpClient.js",
  "../components/mcp/SiriSearchScreen.native.jsx",
].map(async (file) => ts.transpileModule(await fs.readFile(new URL(file, import.meta.url), "utf8"), {
  fileName: file,
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
}).outputText));

// Ejecuta el código real con bridge, hooks y reloj aislados; no requiere un binario ni red.
function fixture() {
  const state = {
    now: 1000000,
    userId: "fixture-owner",
    ownerId: "fixture-owner",
    configured: true,
    focused: true,
    params: { resultId: RESULT_ID },
    reads: 0,
    network: 0,
    revoked: false,
    envelope: { query: "Consulta privada", tool: "get_users", data: { results: [{ id: "fixture", type: "user", title: "Privado" }] }, summary: "Resumen privado", expiresAt: 1120000 },
  };
  const timers = new Map();
  let timerId = 0;
  const addTimer = (fn, delay, repeat = false) => {
    const id = ++timerId;
    timers.set(id, { fn, due: state.now + delay, delay, repeat });
    return id;
  };
  const network = () => { state.network += 1; throw new Error("La prueba prohíbe red e inferencia"); };
  const Meteor = { userId: () => state.userId, useTracker: (fn) => fn(), call: network };
  const native = {
    getConfiguration: async () => ({ configured: state.configured, ownerId: state.ownerId }),
    getNaturalLanguageResult: async () => {
      state.reads += 1;
      if (state.revoked) throw new Error("snapshot expired by revision");
      if (state.read) return state.read();
      return JSON.stringify(state.envelope);
    },
    executeTool: network,
    discoverTools: network,
  };
  const listeners = new Set();
  const AppState = {
    currentState: "active",
    addEventListener: (_, fn) => { listeners.add(fn); return { remove: () => listeners.delete(fn) }; },
  };
  let cursor = 0;
  let dirty = true;
  let mounted = true;
  let tree;
  const slots = [];
  let effects = [];
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));
  const effect = (fn, deps) => {
    const index = cursor++;
    const previous = slots[index];
    if (changed(previous?.deps, deps)) {
      const slot = { deps, cleanup: previous?.cleanup };
      slots[index] = slot;
      effects.push({ slot, fn });
    }
  };
  const memo = (fn, deps) => {
    const index = cursor++;
    if (changed(slots[index]?.deps, deps)) slots[index] = { deps, value: fn() };
    return slots[index].value;
  };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (initial) => {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: initial };
      return [slots[index].value, (next) => {
        if (!mounted) return;
        const value = typeof next === "function" ? next(slots[index].value) : next;
        if (!Object.is(value, slots[index].value)) { slots[index].value = value; dirty = true; }
      }];
    },
    useRef: (initial) => { const index = cursor++; return slots[index] ||= { current: initial }; },
    useMemo: memo,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useLayoutEffect: effect,
    useEffect: effect,
  };
  const dependencies = {
    "expo-secure-store": {},
    "expo-constants": {},
    "../../modules/vidkar-mcp/src": { VidkarMCP: native },
    "../meteor/client.native": { Meteor },
    "./mcpProtocol": {},
    "@meteorrn/core": Meteor,
    "expo-router": { useLocalSearchParams: () => state.params, useRouter: () => ({ push: network, back() {} }) },
    "expo-router/react-navigation": { useIsFocused: () => state.focused },
    react: React,
    "react-native": { AppState, Alert: { alert: network }, FlatList: "FlatList", View: "View", Pressable: "Pressable", StyleSheet: { create: (s) => s } },
    "react-native-paper": {
      useTheme: () => ({ colors: { background: "white" } }),
      Appbar: { Header: "Header", Content: "HeaderContent", BackAction: "Back", Action: "Refresh" },
      Card: { Content: "CardContent" }, Avatar: {}, Text: "Text", Button: "Button", ActivityIndicator: "ActivityIndicator",
    },
    "../../services/navigation/universalLinks": { resolveUniversalLink: network },
  };
  const execute = (source) => {
    const exports = {};
    vm.runInNewContext(source, {
      exports,
      require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; },
      Date: class extends Date { static now() { return state.now; } },
      setTimeout: (fn, delay) => addTimer(fn, delay), clearTimeout: (id) => timers.delete(id),
      setInterval: (fn, delay) => addTimer(fn, delay, true), clearInterval: (id) => timers.delete(id),
      fetch: network,
    });
    return exports;
  };
  const client = execute(sources[0]);
  dependencies["../../services/mcp/mcpClient"] = client;
  const Screen = execute(sources[1]).default;
  const render = () => {
    if (!mounted) return;
    let count = 0;
    while (dirty) {
      assert.ok(count++ < 30, "render estable");
      dirty = false;
      cursor = 0;
      effects = [];
      tree = Screen();
      const pending = effects;
      pending.forEach(({ slot }) => slot.cleanup?.());
      pending.forEach(({ slot, fn }) => { slot.cleanup = fn(); });
    }
  };
  const flush = async () => {
    for (let i = 0; i < 20; i += 1) { await Promise.resolve(); render(); }
    assert.equal(state.network, 0);
  };
  return {
    state, client, timers, listeners,
    async mount() { render(); await flush(); },
    async update(values) { Object.assign(state, values); dirty = true; render(); await flush(); },
    async app(value) { AppState.currentState = value; listeners.forEach((fn) => fn(value)); render(); await flush(); },
    async refresh() {
      await tree.props.children[0].props.children.find((node) => node?.type === "Refresh").props.onPress();
      await flush();
    },
    async advance(ms) {
      const end = state.now + ms;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
        if (!next) break;
        const [id, timer] = next;
        state.now = timer.due;
        if (timer.repeat) timer.due += timer.delay;
        else timers.delete(id);
        timer.fn();
        await flush();
      }
      state.now = end;
      await flush();
    },
    flush,
    list: () => tree.props.children.find((node) => node?.type === "FlatList").props,
    text: () => JSON.stringify(tree),
    unmount() { mounted = false; slots.forEach((slot) => slot.cleanup?.()); },
  };
}

test("snapshot helper exige expiresAt finito, numérico y futuro, sin renovar TTL", async () => {
  const f = fixture();
  for (const value of [undefined, null, "1120000", false, NaN, Infinity, -Infinity, 0, f.state.now - 1, f.state.now]) {
    f.state.envelope.expiresAt = value;
    await assert.rejects(f.client.getMCPNaturalLanguageResult(RESULT_ID), /formato|venció/);
  }
  // JSON.parse acepta 1e400 como Infinity: comprobar también el número no finito real.
  f.state.read = () => JSON.stringify(f.state.envelope).replace('"expiresAt":1000000', '"expiresAt":1e400');
  await assert.rejects(f.client.getMCPNaturalLanguageResult(RESULT_ID), /formato/);
  delete f.state.read;
  f.state.envelope.expiresAt = f.state.now + 1;
  assert.equal((await f.client.getMCPNaturalLanguageResult(RESULT_ID)).expiresAt, f.state.now + 1);
  f.state.now += 1;
  await assert.rejects(f.client.getMCPNaturalLanguageResult(RESULT_ID), /venció/);
  assert.equal(f.state.network, 0);
});

test("snapshot helper rechaza logout, owner incorrecto y cambio de sesión durante lectura", async () => {
  const f = fixture();
  f.state.userId = null;
  await assert.rejects(f.client.getMCPNaturalLanguageResult(RESULT_ID), /Inicia sesión/);
  assert.equal(f.state.reads, 0);
  f.state.userId = "another-owner";
  await assert.rejects(f.client.getMCPNaturalLanguageResult(RESULT_ID), /sesión actual/);
  f.state.userId = f.state.ownerId;
  f.state.read = () => { f.state.userId = null; return JSON.stringify(f.state.envelope); };
  await assert.rejects(f.client.getMCPNaturalLanguageResult(RESULT_ID), /sesión actual/);
  assert.equal(f.state.network, 0);
});

test("UI elimina resultados, consulta y resumen exactamente al vencimiento absoluto", async () => {
  const f = fixture();
  f.state.envelope.expiresAt = f.state.now + 1001;
  await f.mount();
  assert.equal(f.list().data.length, 1);
  await f.advance(1000);
  assert.equal(f.list().data.length, 1);
  await f.advance(1);
  assert.equal(f.list().data.length, 0);
  assert.doesNotMatch(f.text(), /Consulta privada|Resumen privado|Privado/);
  assert.match(f.text(), /venció/);
  assert.equal(f.timers.size, 0);
  f.unmount();
});

test("UI revalida solo en memoria al volver a active o recuperar foco", async () => {
  const f = fixture();
  await f.mount();
  await f.app("background");
  assert.equal(f.list().data.length, 0);
  const reads = f.state.reads;
  await f.advance(10000);
  assert.equal(f.state.reads, reads);
  await f.app("active");
  assert.equal(f.state.reads, reads + 1);
  assert.equal(f.list().data.length, 1);
  await f.update({ focused: false });
  assert.equal(f.list().data.length, 0);
  assert.equal(f.timers.size, 0);
  f.state.revoked = true;
  await f.update({ focused: true });
  assert.equal(f.list().data.length, 0);
  assert.match(f.text(), /venció/);
  f.unmount();
});

test("UI elimina también datos JSON y resumen no tabulares al expirar", async () => {
  const f = fixture();
  f.state.envelope.data = { privateValue: "Dato confidencial de prueba" };
  f.state.envelope.expiresAt = f.state.now + 1;
  await f.mount();
  assert.match(f.text(), /Dato confidencial de prueba/);
  assert.match(f.text(), /Resumen privado/);
  await f.advance(1);
  assert.doesNotMatch(f.text(), /Dato confidencial de prueba|Resumen privado|Consulta privada/);
  f.unmount();
});

test("UI no conserva un snapshot que vence con la app suspendida", async () => {
  const f = fixture();
  await f.mount();
  await f.app("inactive");
  f.state.now = f.state.envelope.expiresAt;
  await f.app("active");
  assert.equal(f.list().data.length, 0);
  assert.match(f.text(), /venció/);
  f.unmount();
});

test("UI detecta revocación de revisión local para el mismo owner sin reconsultar backend", async () => {
  const f = fixture();
  await f.mount();
  f.state.revoked = true;
  await f.advance(5000);
  assert.equal(f.list().data.length, 0);
  assert.equal(f.timers.size, 0);
  const reads = f.state.reads;
  await f.advance(10000);
  assert.equal(f.state.reads, reads);
  f.unmount();
});

test("UI borra datos al cambiar userId reactivo o cerrar sesión", async () => {
  for (const userId of [null, "another-owner"]) {
    const f = fixture();
    await f.mount();
    await f.update({ userId });
    assert.equal(f.list().data.length, 0);
    assert.doesNotMatch(f.text(), /Consulta privada|Resumen privado|Privado/);
    assert.equal(f.timers.size, 0);
    f.unmount();
  }
});

test("UI descarta respuestas tardías tras TTL, logout, retorno de sesión, parámetros o desmontaje", async () => {
  for (const event of ["ttl", "logout", "session-return", "params", "unmount"]) {
    const f = fixture();
    f.state.envelope.expiresAt = f.state.now + 6000;
    await f.mount();
    let resolve;
    f.state.read = () => new Promise((done) => { resolve = done; });
    await f.advance(5000);
    assert.equal(typeof resolve, "function");
    if (event === "ttl") await f.advance(1000);
    if (event === "logout") await f.update({ userId: null });
    if (event === "session-return") {
      await f.update({ userId: null });
      f.state.revoked = true;
      await f.update({ userId: f.state.ownerId });
    }
    if (event === "params") await f.update({ params: { resultId: "invalid" } });
    if (event === "unmount") f.unmount();
    resolve(JSON.stringify(f.state.envelope));
    await f.flush();
    if (event !== "unmount") assert.equal(f.list().data.length, 0, event);
    f.unmount();
    assert.equal(f.timers.size, 0, event);
    assert.equal(f.listeners.size, 0, event);
  }
});

test("lecturas locales y refresh manual nunca amplían el TTL recibido inicialmente", async () => {
  const f = fixture();
  f.state.envelope.expiresAt = f.state.now + 6000;
  await f.mount();
  f.state.envelope.expiresAt += 120000;
  await f.refresh();
  assert.equal(f.state.reads, 2);
  await f.advance(5000);
  assert.equal(f.list().data.length, 1);
  await f.advance(1000);
  assert.equal(f.list().data.length, 0);
  const reads = f.state.reads;
  await f.refresh();
  assert.equal(f.state.reads, reads);
  f.unmount();
});