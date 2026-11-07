/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const jsx = (type, props) => ({ type, props });
function loadRoute(file, dependencies) {
  const result = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  assert.deepEqual(result.diagnostics, []);
  const exports = {};
  vm.runInNewContext(result.outputText, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no esperada en ${file}: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

function normalLayout() {
  const Stack = Object.assign(() => {}, { Screen: "Screen" });
  return loadRoute("app/(normal)/_layout.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "expo-router": { Stack },
    "../../hooks/useSystemReducedMotion": { __esModule: true, default: () => false },
  });
}

test("la entrada nativa redirige al inicio del Stack normal sin montar otro menu", () => {
  const { default: Index } = loadRoute("app/index.native.tsx", {
    "react/jsx-runtime": { jsx },
    "expo-router": { Redirect: "Redirect" },
  });
  const entry = Index();
  assert.equal(entry.type, "Redirect");
  assert.equal(entry.props.href, "/(normal)/Main");
  assert.equal(normalLayout().unstable_settings.initialRouteName, "Main");
});

// Reducers reales del SDK instalado; el barrel nativo se sustituye por sus
// mismos exports puros para no cargar vistas React Native dentro de Node.
function installedStackRouter() {
  const filename = path.join(root, "node_modules/expo-router/build/layouts/stack-router.js");
  const localRequire = createRequire(filename);
  const exports = {};
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    exports,
    require(name) {
      if (name === "../react-navigation/native") {
        return {
          ...localRequire("../react-navigation/routers/StackRouter"),
          ...localRequire("../react-navigation/routers/extendRouter"),
          ...localRequire("../react-navigation/routers/types"),
        };
      }
      return localRequire(name);
    },
  });
  return exports.StackRouter;
}

test("Inicio y Productos Cubacel conservan origen, destino del zoom y regreso en el mismo Stack", () => {
  const { default: Layout, unstable_settings } = normalLayout();
  const routeNames = Layout().props.children.map((screen) => screen.props.name);
  const StackRouter = installedStackRouter();
  const {
    INTERNAL_EXPO_ROUTER_ZOOM_TRANSITION_SOURCE_ID_PARAM_NAME: sourceId,
    INTERNAL_EXPO_ROUTER_ZOOM_TRANSITION_SCREEN_ID_PARAM_NAME: screenId,
  } = require("../node_modules/expo-router/build/navigationParams");
  const config = { routeGetIdList: {} };

  for (const origin of ["Main", "ProductosCubacelCards"]) {
    for (const zoomEnabled of [true, false]) {
      const router = StackRouter(unstable_settings);
      const initial = {
        stale: false, type: "stack", key: "navigator:root", routeKeySeq: 1,
        index: 0, routeNames, routes: [{ name: origin, key: `${origin}:0` }],
      };
      const params = {
        productId: "fixture-offer",
        ...(zoomEnabled ? { [sourceId]: "fixture-image" } : {}),
      };
      const opened = router.getStateForAction(initial, {
        type: "PUSH", payload: { name: "CubacelOferta", params },
      }, config).state;
      assert.equal(opened.index, 1);
      assert.equal(opened.routes[0], initial.routes[0], "El origen debe permanecer montado");
      const destination = opened.routes[1];
      assert.equal(destination.name, "CubacelOferta");
      assert.equal(destination.params.productId, params.productId);
      assert.equal(destination.params[sourceId], params[sourceId]);
      assert.equal(destination.params[screenId], zoomEnabled ? destination.key : undefined);
      const closed = router.getStateForAction(opened, {
        type: "POP", payload: { count: 1 },
      }, config).state;
      assert.equal(closed.index, 0);
      assert.equal(closed.routes.length, 1);
      assert.equal(closed.routes[0], initial.routes[0]);
    }
  }
});
