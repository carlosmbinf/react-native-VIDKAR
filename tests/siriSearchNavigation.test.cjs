/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const compile = (file) => ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const resolver = {};
vm.runInNewContext(compile("services/navigation/universalLinks.ts"), { exports: resolver, URL });
const source = compile("components/mcp/SiriSearchNavigation.native.tsx");

function fixture() {
  const state = { key: null, active: "background", pathname: "/", params: {}, pending: null, navigations: [], warnings: [] };
  const slots = [];
  let cursor;
  let effects;
  let onIntent;
  let onAppState;
  const React = {
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: initial };
      return [slots[index].value, (value) => { slots[index].value = value; }];
    },
    useReducer(reducer, initial) {
      const index = cursor++;
      slots[index] ??= { value: initial };
      return [slots[index].value, () => { slots[index].value = reducer(slots[index].value); }];
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
        effects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { deps, cleanup: fn() };
        });
      }
    },
  };
  const router = { replace: (target) => state.navigations.push(target) };
  const dependencies = {
    react: React,
    "expo-router": {
      useRouter: () => router, useRootNavigationState: () => ({ key: state.key }),
      usePathname: () => state.pathname, useGlobalSearchParams: () => state.params,
    },
    "react-native": { AppState: {
      get currentState() { return state.active; },
      addEventListener: (_, fn) => { onAppState = fn; return { remove() { onAppState = null; } }; },
    } },
    "../../modules/vidkar-mcp/src": { VidkarMCP: {
      getPendingInAppSearch: () => state.pending,
      acknowledgeInAppSearch: (id) => { if (state.pending?.id === id) state.pending = null; },
      addListener: (_, fn) => { onIntent = fn; return { remove() { onIntent = null; } }; },
    } },
    "../../services/navigation/universalLinks": resolver,
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, console: { warn: (message) => state.warnings.push(message) },
    require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; },
  });
  return {
    state,
    render() { cursor = 0; effects = []; exports.default(); effects.forEach((effect) => effect()); },
    enqueue(url, id = "request-1") { state.pending = { id, url }; onIntent?.(); },
    activate() { state.active = "active"; onAppState?.("active"); },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

test("Siri: entrega previa al bridge espera navegador y foreground, sin perderse en login", () => {
  const f = fixture();
  f.enqueue("https://www.vidkar.com/search?q=C%2B%2B%20%26%20Swift&entity=all");
  f.render();
  f.state.key = "root";
  f.render();
  assert.equal(f.state.navigations.length, 0);
  assert.ok(f.state.pending);
  f.activate();
  f.state.pathname = "/Loguin";
  f.render();
  assert.equal(f.state.navigations.length, 1);
  const target = f.state.navigations[0];
  assert.equal(target.pathname, "/siri-search");
  assert.equal(target.params.query, "C++ & Swift");
  assert.equal(target.params.entityType, "all");
  assert.equal(f.state.pending, null);
  f.render();
  assert.equal(f.state.navigations.length, 1);
  f.unmount();
});

test("Siri caliente: evento entrega búsquedas nuevas y no duplica la URL ya resuelta", () => {
  const f = fixture();
  f.state.key = "root";
  f.state.active = "active";
  f.state.pathname = "/siri-search";
  f.state.params = { query: "Avatar", entityType: "all" };
  f.render();
  f.enqueue("vidkar://search?q=Avatar&entity=all");
  f.render();
  assert.equal(f.state.navigations.length, 0);
  assert.equal(f.state.pending, null);
  f.enqueue("vidkar://search?q=Terminator&entity=movie", "request-2");
  f.render();
  assert.equal(f.state.navigations.length, 1);
  assert.equal(f.state.navigations[0].params.query, "Terminator");
  f.unmount();
});

test("rechaza destinos ajenos y no permite convertir la búsqueda en reproducción", () => {
  for (const url of ["https://untrusted.example/search?q=Avatar", "vidkar://movie/id?play=true"]) {
    const f = fixture();
    f.state.key = "root";
    f.state.active = "active";
    f.enqueue(url);
    f.render();
    assert.equal(f.state.navigations.length, 0);
    assert.equal(f.state.warnings.length, 1);
    assert.equal(f.state.pending, null);
    f.unmount();
  }
});

test("una ficha anterior no oculta una búsqueda nueva con el mismo texto", () => {
  const f = fixture();
  f.state.key = "root";
  f.state.active = "active";
  f.state.pathname = "/siri-search";
  f.state.params = { query: "Avatar", entityType: "all", resultId: "previous-snapshot" };
  f.render();
  f.enqueue("vidkar://search?q=Avatar&entity=all");
  f.render();
  assert.equal(f.state.navigations.length, 1);
  assert.equal(f.state.navigations[0].params.resultId, undefined);
  f.unmount();
});

test("el navegador de entrega está montado en el layout nativo raíz", () => {
  const layout = fs.readFileSync(path.join(__dirname, "../app/_layout.native.tsx"), "utf8");
  assert.match(layout, /import SiriSearchNavigation from "\.\.\/components\/mcp\/SiriSearchNavigation\.native"/);
  assert.match(layout, /<SiriSearchNavigation \/>/);
});
