import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = (file) => readFileSync(path.join(root, file), "utf8");
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});

test("el contexto web excluye rutas de dispositivo, API y entradas especiales", () => {
  let captured;
  vm.runInNewContext(
    source("services/navigation/routerContext.web.js").replace("export const ctx =", "globalThis.ctx ="),
    {
      process: { env: { EXPO_ROUTER_IMPORT_MODE: "sync" } },
      require: {
        context: (...args) => { captured = args; return {}; },
      },
    },
  );
  assert.equal(captured[0], "../../app");
  assert.equal(captured[1], true);
  assert.equal(captured[3], "sync");
  for (const file of ["./index.tsx", "./(normal)/Series.tsx", "./(empresa)/PaginasWeb.tsx", "./Cinema/_layout.tsx"]) {
    assert.equal(captured[2].test(file), true, file);
  }
  for (const file of [
    "./index.native.tsx", "./(normal)/Series.native.tsx", "./Screen.ios.jsx",
    "./Screen.android.js", "./Cinema/_layout.native.tsx", "./api/create+api.ts",
    "./+html.tsx", "./+middleware.ts", "./+native-intent.tsx",
  ]) {
    assert.equal(captured[2].test(file), false, file);
  }
});

test("Metro cambia solamente el contexto Router en web y conserva la resolución nativa", () => {
  const module = { exports: {} };
  const requireMock = Object.assign((name) => {
    if (name === "node:path") return path;
    assert.equal(name, "expo/metro-config");
    return { getDefaultConfig: () => ({ resolver: {} }) };
  }, {
    resolve: (name) => path.join(root, "node_modules", name),
  });
  vm.runInNewContext(source("metro.config.js"), { module, require: requireMock, __dirname: root });
  const resolve = module.exports.resolver.resolveRequest;
  const routerFiles = ["expo-router/_ctx.js", "expo-router/_ctx.web.js"];
  for (const file of routerFiles) {
    const resolved = { type: "sourceFile", filePath: requireMock.resolve(file) };
    const context = { resolveRequest: () => resolved };
    const web = resolve(context, "./_ctx", "web");
    assert.equal(web.filePath, path.join(root, "services/navigation/routerContext.web.js"));
    for (const platform of ["ios", "android", undefined]) {
      assert.equal(resolve(context, "./_ctx", platform), resolved);
    }
  }
  const native = { type: "sourceFile", filePath: path.join(root, "components/series/SeriesCatalog.native.jsx") };
  assert.equal(resolve({ resolveRequest: () => native }, "./SeriesCatalog.native", "web"), native);
  assert.throws(() => resolve({
    resolveRequest: () => { throw new Error("Missing module"); },
  }, "./missing", "web"), /Missing module/);
});

test("las rutas comunes no fuerzan imports nativos y Cinema conserva NativeTabs en mobile", () => {
  for (const native of walk(path.join(root, "app")).filter((file) => file.endsWith(".native.tsx"))) {
    const portable = readFileSync(native.replace(".native.tsx", ".tsx"), "utf8");
    assert.doesNotMatch(portable, /(?:from|import)\s*["'][^"']*\.native(?:\.[jt]sx?)?["']/);
  }
  assert.match(source("app/(normal)/Cinema/_layout.native.tsx"), /unstable-native-tabs/);
  assert.doesNotMatch(source("app/(normal)/Cinema/_layout.tsx"), /unstable-native-tabs/);
  assert.match(source("app/(normal)/Series.native.tsx"), /SeriesCatalog\.native/);
  assert.match(source("app/(normal)/User.native.tsx"), /deferSessionRedirect/);
});

test("el entry inicializa Meteor antes del Router y deja los servicios de dispositivo en native", () => {
  const entry = source("index.js");
  assert.ok(entry.indexOf('import "./services/app/bootstrap"') < entry.indexOf('import "expo-router/entry"'));
  const native = source("services/app/bootstrap.native.js");
  const services = ["cadeteBackgroundLocation.native", "PushMessaging.native", "watchSyncService.native"];
  let previous = -1;
  for (const service of services) {
    const offset = native.indexOf(service);
    assert.ok(offset > previous, service);
    previous = offset;
    assert.doesNotMatch(source("services/app/bootstrap.js"), new RegExp(service.replaceAll(".", "\\.")));
  }
});

test("los timers web pasan argumentos, permiten cancelar y no sustituyen timers existentes", () => {
  const scheduled = new Map();
  let id = 0;
  const context = {
    setTimeout: (callback, delay, ...args) => {
      assert.equal(delay, 0);
      scheduled.set(++id, () => callback(...args));
      return id;
    },
    clearTimeout: (handle) => scheduled.delete(handle),
  };
  vm.runInNewContext(source("services/app/bootstrap.js"), context);
  let received;
  const handle = context.setImmediate((...args) => { received = args; }, "test", 42);
  scheduled.get(handle)();
  assert.deepEqual(received, ["test", 42]);
  const cancelled = context.setImmediate(() => assert.fail("Callback cancelado"));
  context.clearImmediate(cancelled);
  assert.equal(scheduled.has(cancelled), false);
  const existing = { setImmediate: () => 1, clearImmediate: () => {} };
  const originals = { ...existing };
  vm.runInNewContext(source("services/app/bootstrap.js"), existing);
  assert.equal(existing.setImmediate, originals.setImmediate);
  assert.equal(existing.clearImmediate, originals.clearImmediate);
});
