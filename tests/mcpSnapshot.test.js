import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as inAppSearch from "../services/mcp/inAppSearch.js";
import { isMCPAdmin } from "../services/mcp/mcpAccess.js";
import "./meteorSession.test.js";
import { loginHarness } from "./helpers/loginHarness.js";

const RESULT_ID = "7cebedbd-865d-4e3a-9136-08e663bf5f34";
const sources = await Promise.all([
  "../services/mcp/mcpClient.js",
  "../components/mcp/SiriSearchScreen.native.jsx",
  "../services/navigation/universalLinks.ts",
  "../services/meteor/client.native.js",
  "../app/+native-intent.tsx",
  "../../react-download/mcp/search.mjs",
  "../components/mcp/MCPSettingsScreen.native.jsx",
].map(async (file) => ts.transpileModule(await fs.readFile(new URL(file, import.meta.url), "utf8"), {
  fileName: file.replace(/\.mjs$/, ".js"),
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
}).outputText));

// Ejecuta el código real con bridge, hooks y reloj aislados; no requiere un binario ni red.
function fixture({ admin = true, search = false, settings = false } = {}) {
  const state = {
    now: 1000000,
    userId: "fixture-owner",
    user: admin
      ? { _id: "fixture-owner", username: "carlosmbinf", profile: { role: "admin" } }
      : { _id: "fixture-owner", username: "cliente", profile: { role: "user" } },
    userReady: true,
    ownerId: "fixture-owner",
    revision: "7cebedbd-865d-4e3a-9136-08e663bf5f34",
    connected: true,
    restoring: false,
    connections: 0,
    configured: true,
    focused: true,
    params: { resultId: RESULT_ID },
    reads: 0,
    network: 0,
    revoked: false,
    calls: [],
    confirmations: [],
    navigations: [],
    serverTokens: [],
    serverCalls: [],
    secureStore: new Map(),
    configureFailureToken: null,
    allowToolDiscovery: false,
    nextToken: 0,
    response: { success: true, results: [], pagination: { limit: 20, offset: 0, total: 0, hasMore: false } },
    envelope: { query: "Consulta privada", tool: "get_users", data: { results: [{ id: "fixture", type: "user", title: "Privado" }] }, summary: "Resumen privado", expiresAt: 1120000 },
  };
  if (search) state.params = { query: "Terminator", entityType: "all" };
  const issueToken = (label, tokenId = `token-${state.nextToken + 1}`) => {
    const token = `vidkar_mcp_fixture_${++state.nextToken}`;
    const createdAt = new Date(state.now);
    const metadata = { tokenId, label, createdAt, tokenPreview: `${token.slice(0, 18)}…` };
    const existingIndex = state.serverTokens.findIndex((entry) => entry.tokenId === tokenId);
    if (existingIndex >= 0) state.serverTokens[existingIndex] = metadata;
    else state.serverTokens.push(metadata);
    return { token, tokenId, label, createdAt, mcpUrl: "https://www.vidkar.com/mcp" };
  };
  const timers = new Map();
  let timerId = 0;
  const addTimer = (fn, delay, repeat = false) => {
    const id = ++timerId;
    timers.set(id, { fn, due: state.now + delay, delay, repeat });
    return id;
  };
  const network = () => { state.network += 1; throw new Error("La prueba prohíbe red e inferencia"); };
  const sessionListeners = new Set();
  const Meteor = {
    userId: () => state.userId,
    useTracker: (fn) => fn(),
    call: (methodName, ...args) => {
      const callback = args.pop();
      state.serverCalls.push({ args, methodName });
      if (methodName === "mcp.tokens.list") {
        callback(null, { tokens: state.serverTokens, mcpUrl: "https://www.vidkar.com/mcp" });
      } else if (methodName === "mcp.tokens.create") {
        callback(null, issueToken(args[0] || "VIDKAR iOS"));
      } else if (methodName === "mcp.tokens.rotate") {
        const existing = state.serverTokens.find((token) => token.tokenId === args[0] && !token.revokedAt);
        if (!existing) {
          const error = new Error("Token MCP no encontrado.");
          error.error = "mcp-token-not-found";
          callback(error);
        } else {
          callback(null, issueToken(args[1] || "VIDKAR iOS", args[0]));
        }
      } else if (methodName === "mcp.tokens.revoke") {
        const token = state.serverTokens.find((entry) => entry.tokenId === args[0]);
        if (token) token.revokedAt = new Date(state.now);
        callback(null, { success: Boolean(token), tokenId: args[0] });
      } else {
        network();
      }
    },
    status: () => ({ connected: state.connected, hasDdp: state.connections > 0 || state.connected }),
    loggingIn: () => state.restoring, loggingOut: () => false,
    getAuthToken: () => state.restoring ? "fixture-resume" : null,
    getData: () => ({ onChange: (fn) => sessionListeners.add(fn), offChange: (fn) => sessionListeners.delete(fn) }),
    connect: () => { state.connections += 1; },
    reconnect: () => { state.connections += 1; },
  };
  const native = {
    getConfiguration: async () => ({ configured: state.configured, ownerId: state.ownerId, revision: state.revision }),
    configure: async (url, token, ownerId) => {
      if (token === state.configureFailureToken) {
        throw new Error("UnexpectedException: El token MCP no pertenece a la sesión actual de VIDKAR.");
      }
      state.configured = true;
      state.ownerId = String(ownerId);
      state.nativeToken = token;
      state.nativeUrl = url;
    },
    clearConfiguration: async () => {
      state.configured = false;
      state.ownerId = null;
      state.nativeToken = null;
      state.nativeUrl = null;
    },
    getNaturalLanguageResult: async () => {
      state.reads += 1;
      if (state.revoked) throw new Error("snapshot expired by revision");
      if (state.read) return state.read();
      return JSON.stringify(state.envelope);
    },
    executeTool: network,
    discoverTools: search ? async () => {
      await state.discover?.();
      return [{ name: "search_entities", readOnly: true, inputSchema: { properties: {
        entity: {}, query: {}, id: {}, limit: {}, offset: {}, confirmed: {},
      } } }];
    } : async () => {
      if (state.allowToolDiscovery) return [];
      return network();
    },
    executeToolForSession: search ? async (tool, args, ownerId, revision) => {
      assert.equal(ownerId, state.ownerId);
      assert.equal(revision, state.revision);
      state.calls.push({ tool, args });
      return state.execute ? state.execute(tool, args) : JSON.stringify(state.response);
    } : network,
  };
  // Bridge anterior: captura la revisión demasiado tarde. Permite que la
  // regresión falle por aceptar consentimiento viejo, no por una API ausente.
  native.executeToolForOwner = (tool, args, ownerId) => native.executeToolForSession(tool, args, ownerId, state.revision);
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
      if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
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
    "expo-secure-store": {
      getItemAsync: async (key) => state.secureStore.get(key) || null,
      setItemAsync: async (key, value) => { state.secureStore.set(key, value); },
      deleteItemAsync: async (key) => { state.secureStore.delete(key); },
    },
    "expo-constants": {},
    "../appUrls": {
      getMCPUrl: () => "https://www.vidkar.com/mcp",
      getHlsServerUrl: () => "https://hls.vidkar.com",
      getMeteorUrl: () => "wss://www.vidkar.com/websocket",
      normalizeMeteorUrl: (value) => typeof value === "string" && /^wss?:\/\//i.test(value) ? value : null,
    },
    "../../services/appUrls": { getMCPUrl: () => "https://www.vidkar.com/mcp" },
    "../../modules/vidkar-mcp/src": { VidkarMCP: native },
    "../meteor/client.native": { Meteor },
    "./mcpProtocol": {},
    "@meteorrn/core": Meteor,
    "expo-router": { useLocalSearchParams: () => state.params, useRouter: () => ({
      push: (target) => { state.navigations.push(target); }, back() {}, canGoBack: () => false,
      replace: (target) => { state.navigations.push(target); },
      setParams: (params) => { state.params = { ...state.params, ...params }; dirty = true; },
    }) },
    "expo-router/react-navigation": { useIsFocused: () => state.focused },
    "../Header/AppHeader": {
      default: "AppHeader",
      MENU_PRINCIPAL_HEADER_COLOR: "#1e3a8a",
      useAppHeaderContentInset: () => 112,
    },
    react: React,
    "react-native": { AppState, Keyboard: { dismiss() {} }, Alert: { alert: (...args) => state.confirmations.push(args) }, FlatList: "FlatList", ScrollView: "ScrollView", View: "View", Pressable: "Pressable", StyleSheet: { create: (s) => s } },
    "react-native-paper": {
      useTheme: () => ({ colors: { background: "white" } }),
      Appbar: { Header: "Header", Content: "HeaderContent", BackAction: "Back", Action: "Refresh" },
      Card: { Content: "CardContent" }, Avatar: {}, Text: "Text", TextInput: "TextInput", Chip: "Chip", Button: "Button", ActivityIndicator: "ActivityIndicator",
    },
    "../../services/mcp/inAppSearch": inAppSearch,
    "../../services/mcp/mcpAccess": { isMCPAdmin },
    "../services/appUrls": { getVidkarBaseUrl: () => "https://www.vidkar.com" },
    "../../services/meteor/session.native": {
      useCurrentSession: () => ({ user: state.user, userId: state.userId, userReady: state.userReady }),
    },
    "../loguin/Loguin.native": "Loguin",
    "./SiriSearchResultSection.native": "SiriSearchResultSection",
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
  };
  const execute = (source) => {
    const exports = {};
    vm.runInNewContext(source, {
      exports,
      React: dependencies.react,
      require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; },
      Date: class extends Date { static now() { return state.now; } },
      setTimeout: (fn, delay) => addTimer(fn, delay), clearTimeout: (id) => timers.delete(id),
      setInterval: (fn, delay) => addTimer(fn, delay, true), clearInterval: (id) => timers.delete(id),
      fetch: network,
      URL,
      URLSearchParams,
      process: { env: {} },
    });
    return exports;
  };
  const client = execute(sources[0]);
  dependencies["../../services/mcp/mcpClient"] = client;
  const links = execute(sources[2]);
  dependencies["../../services/navigation/universalLinks"] = links;
  dependencies["../services/navigation/universalLinks"] = links;
  dependencies["../../services/meteor/client.native"] = execute(sources[3]);
  const { redirectSystemPath } = execute(sources[4]);
  const Screen = execute(sources[settings ? 6 : 1]).default;
  const render = () => {
    if (!mounted) return;
    let count = 0;
    while (dirty) {
      assert.ok(count++ < 30, "render estable");
      dirty = false;
      cursor = 0;
      effects = [];
      tree = settings ? Screen({}) : Screen();
      const pending = effects;
      pending.forEach(({ slot }) => slot.cleanup?.());
      pending.forEach(({ slot, fn }) => { slot.cleanup = fn(); });
    }
  };
  const flush = async () => {
    for (let i = 0; i < 100; i += 1) { await Promise.resolve(); render(); }
    assert.equal(state.network, 0);
  };
  return {
    state, client, native, timers, listeners, sessionListeners, links, redirectSystemPath,
    get tree() { return tree; },
    async mount() { render(); await flush(); },
    async update(values) { Object.assign(state, values); sessionListeners.forEach((fn) => fn()); dirty = true; render(); await flush(); },
    async app(value) { AppState.currentState = value; listeners.forEach((fn) => fn(value)); render(); await flush(); },
    async refresh() {
      const findRefreshAction = (node) => {
        if (!node || typeof node !== "object") return null;
        if (node.props?.accessibilityLabel === "Actualizar búsqueda" && typeof node.props.onPress === "function") return node;
        return Object.values(node).flat().map(findRefreshAction).find(Boolean);
      };
      const refreshAction = findRefreshAction(tree);
      assert.ok(refreshAction, "acción de actualizar búsqueda visible");
      await refreshAction.props.onPress();
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
    async press(label) {
      const find = (node) => {
        if (!node || typeof node !== "object") return null;
        if (node.props?.onPress && node.props.children?.flat().includes(label)) return node;
        return Object.values(node).flat().map(find).find(Boolean);
      };
      const node = find(tree);
      assert.ok(node, `control ${label}`);
      node.props.onPress();
      render();
      await flush();
    },
    async confirm(accepted) {
      const alert = state.confirmations.at(-1);
      assert.ok(alert, "confirmación visible");
      alert[2][accepted ? 1 : 0].onPress();
      await flush();
    },
    list: () => {
      const props = tree.props.children.find((node) => node?.type === "FlatList").props;
      return { ...props, data: props.data.flatMap((section) => section.results) };
    },
    sections: () => tree.props.children.find((node) => node?.type === "FlatList").props,
    text: () => JSON.stringify(tree),
    unmount() { mounted = false; slots.forEach((slot) => slot.cleanup?.()); },
  };
}

test("crea un token desde mobile y registra cuál quedó cargado en este dispositivo", async () => {
  const f = fixture();
  const created = await f.client.createAndConfigureMCPToken();

  assert.equal(f.state.configured, true);
  assert.equal(f.state.nativeToken, created.token);
  assert.equal(f.state.secureStore.get("vidkar.mcp.tokenId.v1"), created.tokenId);
  assert.equal(f.state.secureStore.has("vidkar.mcp.pendingBearer.v1"), false);

  const access = await f.client.getMCPAccessStatus();
  assert.equal(access.configured, true);
  assert.equal(access.token.tokenId, created.tokenId);
  assert.equal(access.tokens.length, 1);
  assert.equal(access.bearer, undefined);
});

test("renovar reemplaza el secreto conservando el tokenId y revoca invalida el dispositivo", async () => {
  const f = fixture();
  const created = await f.client.createAndConfigureMCPToken();
  const previousToken = f.state.nativeToken;
  const rotated = await f.client.rotateAndConfigureMCPToken(created.tokenId);

  assert.equal(rotated.tokenId, created.tokenId);
  assert.notEqual(rotated.token, previousToken);
  assert.equal(f.state.nativeToken, rotated.token);
  assert.equal(f.state.serverTokens.length, 1);
  assert.equal(f.state.serverTokens[0].tokenId, created.tokenId);

  await f.client.revokeMCPToken(created.tokenId);
  assert.equal(f.state.serverTokens[0].revokedAt instanceof Date, true);
  assert.equal(f.state.configured, false);
  assert.equal(f.state.secureStore.has("vidkar.mcp.tokenId.v1"), false);
  assert.equal(f.state.secureStore.has("vidkar.mcp.bearer.v1"), false);
});

test("renovar un tokenId que desapareció del backend crea y carga su reemplazo", async () => {
  const f = fixture();
  const original = await f.client.createAndConfigureMCPToken("VIDKAR iOS");
  f.state.serverTokens = [];

  const replacement = await f.client.rotateAndConfigureMCPToken(original.tokenId);

  assert.notEqual(replacement.tokenId, original.tokenId);
  assert.notEqual(replacement.token, original.token);
  assert.equal(replacement.replacedMissingBackendToken, true);
  assert.equal(f.state.nativeToken, replacement.token);
  assert.equal(f.state.secureStore.get("vidkar.mcp.tokenId.v1"), replacement.tokenId);
  assert.equal(f.state.serverTokens.length, 1);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.rotate").length, 1);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.create").length, 2);
});

test("token MCP con owner mismatch conserva la referencia segura y permite renovarlo", async () => {
  const f = fixture({ settings: true });
  const created = await f.client.createAndConfigureMCPToken("VIDKAR iOS");
  f.state.configured = false;
  f.state.ownerId = null;
  f.state.configureFailureToken = created.token;
  f.state.allowToolDiscovery = true;

  await f.mount();

  assert.equal(f.state.serverTokens.length, 1);
  assert.equal(f.state.secureStore.get("vidkar.mcp.tokenId.v1"), created.tokenId);
  assert.equal(f.state.secureStore.has("vidkar.mcp.bearer.v1"), false);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.create").length, 1);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.rotate").length, 0);
  assert.match(f.text(), /Renovar y reconectar/);
  assert.match(f.text(), /no está conectado/);
  assert.doesNotMatch(f.text(), new RegExp(created.token));

  await f.press("Renovar y reconectar");

  assert.equal(f.state.configured, true);
  assert.equal(f.state.secureStore.get("vidkar.mcp.tokenId.v1"), created.tokenId);
  assert.notEqual(f.state.nativeToken, created.token);
  assert.equal(f.state.serverTokens.length, 1);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.create").length, 1);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.rotate").length, 1);
  assert.doesNotMatch(f.text(), new RegExp(created.token));
});

test("token guardado sin registro backend ofrece crear un reemplazo seguro", async () => {
  const f = fixture({ settings: true });
  f.state.configured = false;
  f.state.ownerId = null;
  f.state.secureStore.set("vidkar.mcp.tokenId.v1", "token-ausente-en-backend");
  f.state.secureStore.set("vidkar.mcp.bearer.v1", "vidkar_mcp_bearer_sin_registro");
  f.state.allowToolDiscovery = true;

  await f.mount();

  assert.match(f.text(), /Token local sin registro/);
  assert.match(f.text(), /Crear reemplazo/);
  assert.doesNotMatch(f.text(), /vidkar_mcp_bearer_sin_registro/);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.rotate").length, 0);

  await f.press("Crear reemplazo");

  assert.equal(f.state.configured, true);
  assert.equal(f.state.serverTokens.length, 1);
  assert.notEqual(f.state.nativeToken, "vidkar_mcp_bearer_sin_registro");
  assert.equal(f.state.secureStore.get("vidkar.mcp.tokenId.v1"), f.state.serverTokens[0].tokenId);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.create").length, 1);
});

test("si se perdió el tokenId, se puede elegir y renovar un token de la cuenta con confirmación", async () => {
  const f = fixture({ settings: true });
  const created = await f.client.createAndConfigureMCPToken("Cliente MCP");
  f.state.secureStore.delete("vidkar.mcp.tokenId.v1");
  f.state.secureStore.set("vidkar.mcp.bearer.v1", "vidkar_mcp_stale_bearer_not_current");
  f.state.configured = false;
  f.state.ownerId = null;
  f.state.allowToolDiscovery = true;

  await f.mount();

  assert.equal(f.state.serverTokens.length, 1);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.create").length, 1);
  assert.match(f.text(), /crea un reemplazo o renueva uno de los tokens de la cuenta/i);
  assert.match(f.text(), /Renovar aquí/);

  await f.press("Renovar aquí");
  assert.match(f.state.confirmations.at(-1)[1], /dejará de funcionar en el otro cliente/);
  await f.confirm(true);

  assert.equal(f.state.configured, true);
  assert.equal(f.state.secureStore.get("vidkar.mcp.tokenId.v1"), created.tokenId);
  assert.notEqual(f.state.nativeToken, created.token);
  assert.equal(f.state.serverTokens.length, 1);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.create").length, 1);
  assert.equal(f.state.serverCalls.filter(({ methodName }) => methodName === "mcp.tokens.rotate").length, 1);
});

test("catálogo elimina confirmación heredada en caché y discovery sin habilitar escrituras", async () => {
  for (const force of [false, true]) {
    const f = fixture();
    const tools = [
      { name: "get_users", readOnly: true, requiresConfirmation: true,
        security: { requiresConfirmation: true, confirmationFor: ["personal"], permissions: ["users:read"] } },
      { name: "write_fixture", readOnly: false, requiresConfirmation: true },
      { name: "unknown_fixture", requiresConfirmation: true },
    ];
    const cached = JSON.stringify({ updatedAt: f.state.now - 1000, tools });
    f.state.secureStore.set("vidkar.mcp.tools.v2", cached);
    let discoveries = 0;
    f.native.discoverTools = async () => { discoveries += 1; return tools; };
    const result = await f.client.discoverMCPTools({ force });
    assert.equal(discoveries, force ? 1 : 0);
    assert.equal(result[0].requiresConfirmation, false);
    assert.equal(result[0].security.requiresConfirmation, false);
    assert.equal(result[0].security.confirmationFor.length, 0);
    assert.deepEqual(Array.from(result[0].security.permissions), ["users:read"]);
    assert.equal(result[1].readOnly, false);
    assert.equal(result[1].requiresConfirmation, true);
    assert.equal(result[2].readOnly, undefined);
    assert.equal(result[2].requiresConfirmation, true);
    assert.equal(tools[0].requiresConfirmation, true, "no modifica el catálogo original");
    if (!force) assert.equal(f.state.secureStore.get("vidkar.mcp.tools.v2"), cached, "no renueva el TTL de caché");
    await assert.rejects(f.client.executeMCPTool("write_fixture"), /No tienes permisos/);
    await assert.rejects(f.client.executeMCPTool("unknown_fixture"), /No tienes permisos/);
  }
});

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

test("UI muestra todos los campos sanitizados del perfil MCP sin volver a consultar la red", async () => {
  const f = fixture();
  f.state.envelope = {
    query: "Perfil de usuario @fixture-user",
    tool: "get_user",
    data: {
      success: true, id: "fixture-user-id", username: "fixture-user", name: "Usuario de prueba",
      role: "admin", createdAt: "2024-01-02T03:04:05.000Z", picture: null, emailCount: 1,
      serviceState: { vpn: true, proxyMegas: 1024, vpnMegas: 2048, proxyUnlimited: false,
        vpnUnlimited: true, vpnServerDomains: ["fixture.example"] },
      serviceUsage: { proxy: { active: true, usedBytes: 512, limitMB: 1024 },
        vpn: { active: true, connected: true, usedBytes: 256, unlimited: true } },
      banned: false,
    },
    summary: "Perfil completo autorizado de @fixture-user",
    expiresAt: 1120000,
  };
  await f.mount();
  const rendered = f.text();
  for (const field of ["username", "role", "createdAt", "emailCount", "serviceState", "vpnServerDomains", "serviceUsage", "banned"]) {
    assert.match(rendered, new RegExp(field));
  }
  assert.match(rendered, /fixture\.example/);
  assert.doesNotMatch(rendered, /password|token|correo@ejemplo/);
  assert.equal(f.state.network, 0, "el detalle lee únicamente el snapshot privado en memoria");
  f.unmount();
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

test("una cuenta normal no puede leer snapshots ni ejecutar MCP desde Siri", async () => {
  const f = fixture({ admin: false });
  await f.mount();
  assert.equal(f.state.reads, 0);
  assert.equal(f.state.calls.length, 0);
  assert.equal(f.state.network, 0);
  assert.match(f.text(), /solo para administradores/);
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

test("búsqueda estable usa el término literal y nunca ejecuta un planner o playback", async () => {
  const f = fixture({ search: true });
  f.state.response.results = [
    { id: "movie-1", type: "movie", title: "Terminator", deepLink: "vidkar://movie/movie-1?q=Terminator&play=true" },
    { id: "movie-2", type: "movie", title: "Terminator 2", deepLink: "vidkar://movie/movie-2?q=Terminator" },
  ];
  await f.mount();
  assert.equal(f.state.calls.length, 1);
  assert.equal(f.state.calls[0].tool, "search_entities");
  assert.equal(f.state.calls[0].args.query, "Terminator");
  assert.equal(f.state.calls[0].args.entity, "all");
  assert.equal(f.state.calls[0].args.confirmed, undefined);
  assert.equal(f.list().data.length, 2);
  assert.equal(f.state.navigations.length, 0);
  assert.equal(f.state.confirmations.length, 0);
  const section = f.sections().renderItem({ item: f.sections().data[0] });
  assert.equal(section.props.section.type, "movie");
  await section.props.onOpen(f.list().data[1]);
  assert.equal(f.state.navigations[0].pathname, "/siri-search");
  assert.equal(f.state.navigations[0].params.contentId, "movie-2");
  assert.equal(f.state.navigations[0].params.play, undefined);
  assert.equal(f.state.confirmations.length, 0);
  f.unmount();
});

test("categorías explícitas conservan tema y permiten listar cursos sin texto", async () => {
  const f = fixture({ search: true });
  f.state.params.query = "fotografía";
  await f.mount();
  await f.press("Cursos");
  assert.equal(f.state.calls.at(-1).args.entity, "course");
  assert.equal(f.state.calls.at(-1).args.query, "fotografía");
  await f.press("Ver todos los cursos");
  assert.equal(f.state.calls.at(-1).args.entity, "course");
  assert.equal(f.state.calls.at(-1).args.query, "");
  f.unmount();
});

test("usuarios se consultan sin diálogo y se ignora confirmed en la ruta", async () => {
  const f = fixture({ search: true });
  f.state.params = { query: "Carlos", entityType: "user", confirmed: "true" };
  await f.mount();
  assert.equal(f.state.calls.length, 1);
  assert.equal(f.state.calls[0].args.entity, "user");
  assert.equal(f.state.calls[0].args.query, "Carlos");
  assert.equal(f.state.calls[0].args.confirmed, undefined);
  assert.equal(f.state.confirmations.length, 0);
  f.unmount();
});

test("login conserva consulta y no consulta MCP mientras falta sesión", async () => {
  const f = fixture({ search: true });
  f.state.userId = null;
  await f.mount();
  assert.equal(f.state.calls.length, 0);
  await f.press("Iniciar sesión");
  assert.match(f.text(), /Loguin/);
  await f.update({ userId: "fixture-owner" });
  assert.equal(f.state.calls.length, 1);
  assert.equal(f.state.calls[0].args.query, "Terminator");
  f.unmount();
});

test("descarta resultados tardíos tras logout, cambio de consulta o foco", async () => {
  for (const event of ["logout", "query", "focus", "unmount"]) {
    const f = fixture({ search: true });
    let done;
    f.state.execute = () => new Promise((resolve) => { done = resolve; });
    await f.mount();
    const late = done;
    if (event === "logout") await f.update({ userId: null });
    if (event === "query") await f.update({ params: { query: "Otro", entityType: "all" } });
    if (event === "focus") await f.update({ focused: false });
    if (event === "unmount") f.unmount();
    late(JSON.stringify({ success: true, results: [{ id: "late", title: "No mostrar" }] }));
    await f.flush();
    if (event !== "unmount") assert.equal(f.list().data.length, 0, event);
    f.unmount();
  }
});

test("búsqueda muestra errores de backend y permite reintento sin confundirlos con vacío", async () => {
  const f = fixture({ search: true });
  f.state.response = { success: false, error: { message: "Permiso denegado" } };
  await f.mount();
  assert.match(f.text(), /Permiso denegado/);
  f.state.response = { success: true, results: [] };
  await f.press("Reintentar");
  assert.match(f.text(), /No encontré resultados/);
  f.unmount();
});

test("política de búsqueda rechaza scopes inventados y límites sin reinterpretar el texto", () => {
  for (const query of ["Terminator", "búscame los cursos", "Carlos", "C++ & Swift"]) {
    assert.equal(inAppSearch.makeInAppSearchArguments({ query, entityType: "all" }).query, query);
  }
  for (const input of [
    { query: "a", entityType: "movies" }, { query: "", entityType: "user" },
    { query: "a".repeat(121), entityType: "all" }, { query: "a\u0000b", entityType: "all" },
    { query: "a", entityType: "all", offset: 201 }, { query: "a", entityType: "movie", offset: -1 },
  ]) assert.throws(() => inAppSearch.makeInAppSearchArguments(input));
  assert.equal(inAppSearch.makeInAppSearchArguments({ query: "", entityType: "course" }).query, "");
  assert.equal(inAppSearch.makeInAppSearchArguments({ query: "a", entityType: "all", confirmed: true }).confirmed, undefined);
  assert.equal(inAppSearch.makeInAppSearchArguments({ query: "Carlos", entityType: "user", confirmed: true }).confirmed, undefined);
});

test("cliente MCP liga la ejecución al owner y descarta cambios de cuenta durante discovery/ejecución", async () => {
  for (const changeAt of ["none", "discover", "execute", "old-binary"]) {
    const f = fixture();
    const calls = [];
    f.native.discoverTools = async () => {
      if (changeAt === "discover") f.state.userId = "other-owner";
      return [{ name: "search_entities", readOnly: true, inputSchema: { properties: { entity: {}, query: {}, confirmed: {} } } }];
    };
    if (changeAt === "old-binary") delete f.native.executeToolForSession;
    else f.native.executeToolForSession = async (tool, args, owner) => {
      calls.push({ tool, args, owner });
      if (changeAt === "execute") f.state.userId = "other-owner";
      return '{"success":true,"results":[]}';
    };
    const run = async () => f.client.executeMCPTool("search_entities", { entity: "user", query: "Carlos", confirmed: true }, await f.client.getMCPQuerySession());
    if (changeAt === "none") {
      assert.equal(JSON.parse(await run()).success, true);
      assert.equal(calls[0].owner, "fixture-owner");
      assert.equal(calls[0].args.confirmed, undefined);
    } else {
      await assert.rejects(run(), /sesión MCP cambió|Actualiza el binario/);
      if (changeAt !== "execute") assert.equal(calls.length, 0);
    }
    assert.equal(f.state.network, 0);
  }
});

test("same owner: rotar revisión durante discovery o resultado invalida la consulta sin pedir confirmación", async () => {
  for (const phase of ["discover", "result"]) {
    const f = fixture({ search: true });
    f.state.params = { query: "Carlos", entityType: "user" };
    const rotate = () => { f.state.revision = "8cebedbd-865d-4e3a-9136-08e663bf5f34"; };
    if (phase === "discover") f.state.discover = rotate;
    if (phase === "result") f.state.execute = () => {
      rotate();
      return JSON.stringify({ success: true, results: [{ id: "private", title: "No mostrar" }] });
    };
    await f.mount();
    assert.equal(f.state.calls.length, phase === "result" ? 1 : 0, phase);
    assert.equal(f.list().data.length, 0, phase);
    assert.match(f.text(), /sesión MCP cambió/, phase);
    assert.equal(f.state.confirmations.length, 0, "las consultas no muestran diálogo de confirmación");
    f.unmount();
  }
});

test("cold start Siri espera conexión y resume antes de login o consulta, conservando criteria", async () => {
  for (const resumed of [true, false]) {
    const f = fixture({ search: true });
    const path = f.redirectSystemPath({ path: "vidkar://search?q=Terminator&entity=movie", initial: true });
    f.state.params = Object.fromEntries(new URL(path, "https://fixture.invalid").searchParams);
    Object.assign(f.state, { userId: null, connected: false, restoring: true });
    await f.mount();
    assert.equal(f.state.connections, 1);
    assert.equal(f.state.calls.length, 0);
    assert.doesNotMatch(f.text(), /Iniciar sesión|Inicia sesión/);
    await f.update({ connected: true });
    assert.equal(f.state.calls.length, 0);
    assert.doesNotMatch(f.text(), /Iniciar sesión|Inicia sesión/);
    await f.update({ restoring: false, userId: resumed ? "fixture-owner" : null });
    if (resumed) {
      assert.equal(f.state.calls.length, 1);
      assert.equal(f.state.calls[0].args.query, "Terminator");
      assert.equal(f.state.calls[0].args.entity, "movie");
    } else {
      await f.press("Iniciar sesión");
      assert.match(f.text(), /Loguin/);
      assert.match(f.text(), /deferSessionRedirect/);
      await f.update({ userId: "fixture-owner" });
      assert.equal(f.state.calls[0].args.query, "Terminator");
    }
    assert.equal(f.state.connections, 1);
    assert.equal(f.sessionListeners.size, 0);
    f.unmount();
  }
});

test("abrir la coincidencia 21 usa resolver real e ID exacto, no primera página del título", async () => {
  const f = fixture({ search: true });
  f.state.params = { query: "Terminator", entityType: "movie" };
  const movies = Array.from({ length: 21 }, (_, i) => ({
    _id: `movie-${i + 1}`, nombrePeli: "Terminator", mostrar: true,
    createdAt: new Date(2026, 0, 21 - i),
  }));
  // Handler y generación de deep links reales; solo la colección se sustituye.
  const matches = (row, selector) => Object.entries(selector).every(([key, value]) => {
    if (key === "$or") return value.some((part) => matches(row, part));
    if (value?.test) return value.test(row[key] || "");
    if (value?.$in) return value.$in.includes(row[key]);
    return row[key] === value;
  });
  const dependencies = {
    "./db.mjs": { collection: async (name) => {
      assert.equal(name, "pelisRegister");
      return {
        find: (selector, options) => ({ toArray: async () => movies.filter((movie) => matches(movie, selector))
          .sort((a, b) => (a.createdAt - b.createdAt) * options.sort.createdAt)
          .slice(options.skip, options.skip + options.limit) }),
        countDocuments: async (selector) => movies.filter((movie) => matches(movie, selector)).length,
      };
    } },
    "./auth.mjs": {}, "./analytics.mjs": {}, "./config.mjs": { config: { maxLimit: 50 } },
  };
  const backend = {};
  vm.runInNewContext(sources[5], { exports: backend, URL, Date,
    require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  f.state.execute = async (_, args) => JSON.stringify({ success: true,
    ...await backend.searchEntities(args, { user: { _id: "fixture-owner" } }),
  });
  await f.mount();
  assert.equal(f.list().data.length, 20);
  await f.press("Cargar más resultados");
  assert.equal(f.list().data.length, 21);
  const section = f.sections().renderItem({ item: f.sections().data[0] });
  await section.props.onOpen(f.list().data[20]);
  const target = f.state.navigations.at(-1);
  assert.equal(target.pathname, "/siri-search");
  movies[20].nombrePeli = "Título actualizado";
  await f.update({ params: target.params });
  assert.equal(f.state.calls.at(-1).args.id, "movie-21");
  assert.equal(f.state.calls.at(-1).args.query, undefined);
  assert.equal(f.state.calls.at(-1).args.offset, 0);
  assert.equal(f.list().data.length, 1);
  assert.equal(f.list().data[0].id, "movie-21");
  assert.equal(f.list().data[0].title, "Título actualizado", "un título viejo no puede ocultar la identidad seleccionada");
  movies[20].mostrar = false;
  await f.refresh();
  assert.equal(f.list().data.length, 0, "la consulta exacta conserva visibilidad backend");
  assert.equal(f.state.confirmations.length, 0);
  f.unmount();
});

test("Siri fría/caliente: login real, restore tardío y logout nunca reemplazan por menú", async () => {
  for (const initial of [true, false]) {
    for (const snapshot of [false, true]) {
      const f = fixture({ search: !snapshot });
      const url = snapshot ? `vidkar://search?resultId=${RESULT_ID}` : "vidkar://search?q=Terminator&entity=movie";
      const destination = new URL(f.redirectSystemPath({ path: url, initial }), "https://fixture.invalid");
      assert.equal(destination.pathname, "/siri-search");
      const params = Object.fromEntries(destination.searchParams);
      Object.assign(f.state, { userId: null, connected: false, restoring: true, params });
      // En caliente puede seguir montado el login de una ruta anterior.
      const previousLogin = loginHarness(f.state);
      previousLogin.render({ isFocused: false });
      await f.mount();
      await f.update({ connected: true });
      assert.equal(f.state.calls.length, 0);
      assert.equal(f.state.reads, 0);
      await f.update({ restoring: false });
      await f.press("Iniciar sesión");
      assert.match(f.text(), /deferSessionRedirect/);
      const inlineLogin = loginHarness(f.state);
      inlineLogin.render({ deferSessionRedirect: true });
      await inlineLogin.submit();
      previousLogin.render({ isFocused: false });
      inlineLogin.render({ deferSessionRedirect: true });
      await f.update({ userId: f.state.userId });
      await f.update({ loginReady: true });
      previousLogin.render({ isFocused: false });
      inlineLogin.render({ deferSessionRedirect: true });
      assert.deepEqual(f.state.params, params);
      assert.equal(snapshot ? f.state.reads : f.state.calls.length, 1);
      await f.update({ userId: null });
      previousLogin.render({ isFocused: false });
      assert.deepEqual(f.state.params, params);
      assert.deepEqual(f.state.navigations, []);
      assert.doesNotMatch(f.text(), /Resumen privado/);
      previousLogin.unmount();
      inlineLogin.unmount();
      f.unmount();
    }
  }
});

test("login normal solo resuelve sesión al recuperar foco y completar suscripción", () => {
  const state = { userId: "fixture-owner", loginReady: false, navigations: [] };
  const login = loginHarness(state);
  login.render();
  assert.deepEqual(state.navigations, []);
  state.loginReady = true;
  login.render({ isFocused: false });
  assert.deepEqual(state.navigations, []);
  login.render();
  assert.deepEqual(state.navigations, ["/(normal)/Main"]);
  login.unmount();
});