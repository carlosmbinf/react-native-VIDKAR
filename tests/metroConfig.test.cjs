/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const config = require("../metro.config");
const { getRoutes } = require("expo-router/build/getRoutesCore");

test("Expo Router construye las rutas reales y selecciona el detalle por plataforma", () => {
  const root = path.resolve(__dirname, "../app");
  const keys = fs.readdirSync(root, { recursive: true })
    .filter((file) => /\.[jt]sx?$/.test(file))
    .map((file) => `./${file.split(path.sep).join("/")}`);
  const context = () => ({ default: () => null });
  context.keys = () => keys;
  const options = {
    platformRoutes: true,
    ignoreEntryPoints: true,
    importMode: "lazy",
    skipGenerated: true,
  };
  const findDetail = (route) => route.contextKey.includes("/PeliculaDetalle.")
    ? route
    : route.children.map(findDetail).find(Boolean);
  assert.throws(() => getRoutes(
    Object.assign(context.bind(null), {
      keys: () => keys.filter((key) => key !== "./(normal)/PeliculaDetalle.tsx"),
    }),
    { ...options, platform: "ios" },
  ), /PeliculaDetalle\.native\.tsx does not have a fallback sibling/);
  for (const platform of ["ios", "android", "web"]) {
    const routes = getRoutes(context, { ...options, platform });
    const detail = findDetail(routes);
    assert.equal(detail.contextKey, platform === "web"
      ? "./(normal)/PeliculaDetalle.tsx"
      : "./(normal)/PeliculaDetalle.native.tsx");
  }
});

test("Metro resuelve el registro de assets del React Native instalado", () => {
  const registry = require.resolve(config.transformer.assetRegistryPath);
  assert.equal(registry, require.resolve("react-native/asset-registry"));
  assert.ok(require.resolve("expo-router/assets/logotype.png"));
});

test("Metro filtra el contexto web sin cambiar resoluciones nativas ni otros modulos", () => {
  const routerContext = require.resolve("expo-router/_ctx");
  const webContext = path.join(path.dirname(routerContext), "_ctx.web.js");
  const replacement = path.resolve(__dirname, "../services/navigation/routerContext.web.js");
  for (const filePath of [routerContext, webContext]) {
    const resolved = { type: "sourceFile", filePath };
    const context = {
      resolveRequest: (_context, moduleName, platform) => {
        assert.equal(moduleName, "expo-router/_ctx");
        assert.ok(["ios", "android", "web"].includes(platform));
        return resolved;
      },
    };
    for (const platform of ["ios", "android"]) {
      assert.equal(config.resolver.resolveRequest(context, "expo-router/_ctx", platform), resolved);
    }
    assert.deepEqual(config.resolver.resolveRequest(context, "expo-router/_ctx", "web"), {
      type: "sourceFile",
      filePath: replacement,
    });
  }
  for (const resolved of [
    { type: "sourceFile", filePath: require.resolve("expo-router") },
    { type: "assetFiles", filePaths: [require.resolve("expo-router/assets/logotype.png")] },
  ]) {
    const context = { resolveRequest: () => resolved };
    assert.equal(config.resolver.resolveRequest(context, "other-module", "web"), resolved);
  }
});
