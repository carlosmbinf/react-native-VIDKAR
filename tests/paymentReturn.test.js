import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await fs.readFile(new URL("../components/payments/PaymentReturnScreen.native.tsx", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

function fixture(openBrowserAsync) {
  const effects = [];
  const updates = [];
  const errors = [];
  const url = "https://www.vidkar.com/capture-order?token=FIXTURE";
  const React = {
    createElement() { return null; },
    useEffect(effect) { effects.push(effect); },
    useRef(value) { return { current: value }; },
    useState(value) { return [value, (next) => updates.push(next)]; },
  };
  const modules = {
    react: React,
    "react-native": { StyleSheet: { create: (styles) => styles }, View: () => null },
    "react-native-paper": { useTheme: () => ({ colors: {} }) },
    "react-native-safe-area-context": {},
    "expo-router": { useLocalSearchParams: () => ({ url }), useRouter: () => ({}) },
    "expo-web-browser": { openBrowserAsync, WebBrowserResultType: { LOCKED: "locked" } },
    "../../services/navigation/universalLinks": { getPaymentReturnUrl: (url) => url },
    "../../services/appUrls": { getVidkarBaseUrl: () => "https://www.vidkar.com" },
  };
  const exports = {};
  vm.runInNewContext(javascript, {
    exports,
    require(name) {
      assert.ok(name in modules, `Import inesperado: ${name}`);
      return modules[name];
    },
    console: { error: (message) => errors.push(message) },
  });
  return { render: exports.default, effects, updates, errors, url };
}

test("abre el endpoint en Safari integrado una sola vez aunque la pantalla se monte de nuevo", async () => {
  const opened = [];
  let finish;
  const f = fixture((url) => {
    opened.push(url);
    return new Promise((resolve) => { finish = resolve; });
  });
  f.render();
  f.effects.shift()();
  f.render();
  f.effects.shift()();
  assert.deepEqual(opened, [f.url]);
  finish({ type: "dismiss" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.errors.length, 0);
  assert.equal(f.updates.at(-1), false);
});

test("notifica un navegador bloqueado sin reabrir ni repetir el pago", async () => {
  const f = fixture(async () => ({ type: "locked" }));
  f.render();
  f.effects.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.errors.length, 1);
  assert.ok(f.updates.includes(true));
  assert.equal(f.updates.at(-1), false);
  assert.doesNotMatch(f.errors[0], /FIXTURE|token=/);
});
