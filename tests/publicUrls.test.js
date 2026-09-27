import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const publicUrlConfig = require("../config/publicUrls.js");
const { buildMeteorUrlForHost, getMeteorHost, getMeteorHttpOrigin, normalizeMeteorUrl, resolvePublicUrls } = publicUrlConfig;
const compileCommonJs = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

test("la URL base HTTPS deriva DDP seguro, MCP y conserva HLS separado", () => {
  assert.deepEqual(resolvePublicUrls({ EXPO_PUBLIC_VIDKAR_BASE_URL: "https://staging.example.test/" }), {
    vidkarBaseUrl: "https://staging.example.test",
    meteorUrl: "wss://staging.example.test/websocket",
    mcpServerUrl: "https://staging.example.test/mcp",
    hlsServerUrl: "https://hls.vidkar.com",
  });
});

test("una base HTTP local deriva DDP ws y no habilita MCP inseguro", () => {
  assert.deepEqual(resolvePublicUrls({ EXPO_PUBLIC_VIDKAR_BASE_URL: "http://192.168.1.20:3000" }), {
    vidkarBaseUrl: "http://192.168.1.20:3000",
    meteorUrl: "ws://192.168.1.20:3000/websocket",
    mcpServerUrl: null,
    hlsServerUrl: "https://hls.vidkar.com",
  });
});

test("acepta overrides explícitos y descarta protocolos o URLs MCP inseguros", () => {
  const urls = resolvePublicUrls({
    EXPO_PUBLIC_VIDKAR_BASE_URL: "https://staging.example.test",
    EXPO_PUBLIC_METEOR_URL: "wss://ddp.example.test/socket",
    EXPO_PUBLIC_MCP_URL: "http://mcp.example.test/mcp",
    EXPO_PUBLIC_HLS_SERVER_URL: "https://media.example.test/",
  });
  assert.equal(urls.meteorUrl, "wss://ddp.example.test/socket");
  assert.equal(urls.mcpServerUrl, "https://staging.example.test/mcp");
  assert.equal(urls.hlsServerUrl, "https://media.example.test");
});

test("mantiene compatibilidad con extras de manifests anteriores", () => {
  assert.deepEqual(resolvePublicUrls({}, {
    meteorUrl: "wss://legacy.example.test/websocket",
    mcpServerUrl: "https://legacy.example.test/mcp",
    hlsServerUrl: "https://legacy-hls.example.test",
  }), {
    vidkarBaseUrl: "https://www.vidkar.com",
    meteorUrl: "wss://legacy.example.test/websocket",
    mcpServerUrl: "https://legacy.example.test/mcp",
    hlsServerUrl: "https://legacy-hls.example.test",
  });
});

test("el campo manual acepta endpoint completo o host y reutiliza el endpoint configurado", () => {
  assert.equal(
    buildMeteorUrlForHost("www.vidkar.com", "wss://www.vidkar.com/websocket"),
    "wss://www.vidkar.com/websocket",
  );
  assert.equal(
    buildMeteorUrlForHost("192.168.1.20", "wss://www.vidkar.com/websocket"),
    "ws://192.168.1.20:3000/websocket",
  );
  assert.equal(
    buildMeteorUrlForHost("https://preview.example.test", "wss://www.vidkar.com/websocket"),
    "wss://preview.example.test/websocket",
  );
});

test("el normalizador DDP y el host manual no dependen del global URL del runtime", () => {
  assert.equal(normalizeMeteorUrl("https://preview.example.test"), "wss://preview.example.test/websocket");
  assert.equal(normalizeMeteorUrl("http://192.168.1.20:3000"), "ws://192.168.1.20:3000/websocket");
  assert.equal(getMeteorHost("wss://preview.example.test/websocket"), "preview.example.test");
  assert.equal(getMeteorHttpOrigin("wss://preview.example.test/websocket"), "https://preview.example.test");
});

test("la fachada appUrls exporta el normalizador que llama client.native", async () => {
  const source = await fs.readFile(new URL("../services/appUrls.js", import.meta.url), "utf8");
  const compiled = compileCommonJs(source);
  const exports = {};
  const dependencies = {
    "expo-constants": { __esModule: true, default: { expoConfig: { extra: { vidkarBaseUrl: "https://preview.example.test" } } } },
    "../config/publicUrls": publicUrlConfig,
  };
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, name);
      return dependencies[name];
    },
    process: { env: {} },
  });
  assert.equal(typeof exports.normalizeMeteorUrl, "function");
  assert.equal(exports.getMeteorUrl(), "wss://preview.example.test/websocket");
});

test("ensureMeteorConnection consume el endpoint central sin depender del global URL", async () => {
  const appUrlsSource = await fs.readFile(new URL("../services/appUrls.js", import.meta.url), "utf8");
  const appUrlsExports = {};
  vm.runInNewContext(compileCommonJs(appUrlsSource), {
    exports: appUrlsExports,
    require: (name) => name === "expo-constants"
      ? { __esModule: true, default: { expoConfig: { extra: { vidkarBaseUrl: "https://preview.example.test" } } } }
      : name === "../config/publicUrls"
        ? publicUrlConfig
        : assert.fail(`Módulo inesperado: ${name}`),
    process: { env: {} },
  });

  const connections = [];
  const meteor = {
    connect: async (endpoint) => { connections.push(endpoint); },
    status: () => ({ connected: false }),
  };
  const clientSource = await fs.readFile(new URL("../services/meteor/client.native.js", import.meta.url), "utf8");
  const clientExports = {};
  vm.runInNewContext(compileCommonJs(clientSource), {
    exports: clientExports,
    require: (name) => name === "@meteorrn/core"
      ? meteor
      : name === "expo-secure-store"
        ? { getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {} }
        : name === "../appUrls"
          ? appUrlsExports
          : assert.fail(`Módulo inesperado: ${name}`),
    process: { env: {} },
  });

  await clientExports.ensureMeteorConnection();
  assert.deepEqual(connections, ["wss://preview.example.test/websocket"]);
});

test("app.config publica el mismo endpoint y dominio usados por el bundle nativo", () => {
  const previousBaseUrl = process.env.EXPO_PUBLIC_VIDKAR_BASE_URL;
  process.env.EXPO_PUBLIC_VIDKAR_BASE_URL = "https://preview.example.test";
  try {
    const appConfig = require("../app.config.js")();
    assert.equal(appConfig.extra.vidkarBaseUrl, "https://preview.example.test");
    assert.equal(appConfig.extra.meteorUrl, "wss://preview.example.test/websocket");
    assert.equal(appConfig.extra.mcpServerUrl, "https://preview.example.test/mcp");
    assert.equal(appConfig.ios.infoPlist.VIDKAR_BASE_URL, "https://preview.example.test");
    assert.ok(appConfig.ios.associatedDomains.includes("applinks:preview.example.test"));
  } finally {
    if (previousBaseUrl === undefined) delete process.env.EXPO_PUBLIC_VIDKAR_BASE_URL;
    else process.env.EXPO_PUBLIC_VIDKAR_BASE_URL = previousBaseUrl;
  }
});
