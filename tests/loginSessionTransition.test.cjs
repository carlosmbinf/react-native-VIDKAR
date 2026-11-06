/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const file = "components/loguin/Loguin.native.js";
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
  {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  },
).outputText;

// Ejecuta Loguin real; los hijos son nodos observables, no vistas nativas.
function sessionHarness(t, {
  platform = "ios",
  socialEnabled = false,
  dimensions = { width: 390, height: 844 },
  ...initialProps
} = {}) {
  const hooks = [];
  const listeners = new Map();
  const frames = new Map();
  const replacements = [];
  const resolutions = [];
  const completions = [];
  const subscriptions = [];
  const route = "/session-test-destination";
  const theme = { dark: true, colors: { primary: "test-color" } };
  let session = { userId: null, user: null, loginRouteReady: false };
  let props = { onLaunchComplete: (...args) => completions.push(args), ...initialProps };
  let cursor = 0;
  let pendingEffects = [];
  let nextFrame = 0;
  let dismissals = 0;
  let launchCount = 0;
  let wasLaunching = false;
  let tree;

  function slot(kind, initialize) {
    const index = cursor++;
    if (!hooks[index]) hooks[index] = { kind, ...initialize() };
    assert.equal(hooks[index].kind, kind, "El orden de hooks debe permanecer estable");
    return hooks[index];
  }

  function sameDeps(previous, next) {
    return previous !== undefined && next !== undefined &&
      previous.length === next.length &&
      previous.every((value, index) => Object.is(value, next[index]));
  }

  function memo(kind, factory, deps) {
    const hook = slot(kind, () => ({}));
    if (!sameDeps(hook.deps, deps)) {
      hook.value = factory();
      hook.deps = deps;
    }
    return hook.value;
  }

  const React = {
    createElement: (type, elementProps, ...children) => ({
      type, props: { ...elementProps, children },
    }),
    useState(initial) {
      const hook = slot("state", () => ({
        value: typeof initial === "function" ? initial() : initial,
      }));
      if (!hook.set) {
        hook.set = (next) => {
          hook.value = typeof next === "function" ? next(hook.value) : next;
        };
      }
      return [hook.value, hook.set];
    },
    useRef(initial) {
      return slot("ref", () => ({ value: { current: initial } })).value;
    },
    useMemo: (factory, deps) => memo("memo", factory, deps),
    useCallback: (callback, deps) => memo("callback", () => callback, deps),
    useEffect(effect, deps) {
      const hook = slot("effect", () => ({}));
      if (!sameDeps(hook.deps, deps)) pendingEffects.push(hook);
      hook.effect = effect;
      hook.deps = deps;
    },
  };

  const unexpected = () => assert.fail("No debe invocarse ningún servicio externo");
  const Meteor = {
    useTracker: (callback) => callback(),
    userId: () => session.userId,
    user: () => session.user,
    status: () => ({ connected: true }),
    subscribe(name, ...args) {
      subscriptions.push({ name, args });
      return { ready: () => session.loginRouteReady };
    },
    call: unexpected,
    loginWithPassword: unexpected,
    loginWithToken: unexpected,
    disconnect: unexpected,
  };
  const dependencies = {
    react: { __esModule: true, default: React, ...React },
    "@expo/vector-icons/FontAwesome5": "FontAwesome5",
    "@meteorrn/core": Meteor,
    "expo-apple-authentication": {
      isAvailableAsync: async () => socialEnabled,
      addRevokeListener: () => ({ remove() {} }),
    },
    "expo-blur": { BlurView: "BlurView" },
    "expo-web-browser": { openBrowserAsync: unexpected },
    "expo-router": { router: { replace: (target) => replacements.push(target) } },
    "expo-router/react-navigation": { useIsFocused: () => true },
    "react-native": {
      Alert: { alert: unexpected },
      Animated: {},
      Easing: {},
      ImageBackground: "ImageBackground",
      Keyboard: {
        dismiss: () => { dismissals += 1; },
        addListener(event, callback) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event).add(callback);
          return { remove: () => listeners.get(event).delete(callback) };
        },
      },
      KeyboardAvoidingView: "KeyboardAvoidingView",
      NativeModules: {},
      Platform: { OS: platform },
      ScrollView: "ScrollView",
      StyleSheet: { create: (styles) => styles },
      useWindowDimensions: () => dimensions,
      View: "View",
    },
    "react-native-paper": {
      Button: "Button", Text: "Text", TextInput: "TextInput", useTheme: () => theme,
    },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "../../services/meteor/client": {
      connectToMeteor: unexpected,
      ensureMeteorConnection: unexpected,
      getMeteorUrl: () => "wss://meteor.invalid/websocket",
    },
    "../../services/appUrls": {
      buildManualMeteorUrl: unexpected,
      getMeteorHost: () => "meteor.invalid",
      getPrivacyPolicyUrl: unexpected,
    },
    "../../services/notifications/PushMessaging.native": {
      registerPushTokenForActiveSession: unexpected,
    },
    "../../services/watch/watchDashboard": { WATCH_ROOT_USER_FIELDS: { _id: 1 } },
    "../collections/collections": {
      ConfigCollection: { findOne: () => socialEnabled ? { valor: "true" } : null },
    },
    "../navigator/sessionRoute": {
      resolveSessionRoute(userId, user) {
        resolutions.push({ userId, user });
        return route;
      },
    },
    "../../hooks/useSystemReducedMotion": () => false,
    "./LoginAtmosphere.native": "LoginAtmosphere",
    "./Loguin.styles": { getLoginPalette: () => ({}), loginScreenStyles: {} },
    "./LoginRocketFlight.native": "LoginRocketFlight",
    "../files/space-bg-shadowcodex.jpg": "test-background",
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
    requestAnimationFrame(callback) {
      const id = ++nextFrame;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  }, { filename: file });

  function findFlights(node) {
    if (Array.isArray(node)) return node.flatMap(findFlights);
    if (!node || typeof node !== "object") return [];
    if (node.type === "LoginRocketFlight") return [node];
    return findFlights(node.props?.children);
  }

  function flight() {
    const flights = findFlights(tree);
    assert.equal(flights.length, 1, "Loguin debe renderizar un único LoginRocketFlight");
    return flights[0].props;
  }

  t.after(() => {
    hooks.filter((hook) => hook.kind === "effect").forEach((hook) => hook.cleanup?.());
    assert.equal(frames.size, 0, "El desmontaje debe cancelar los frames pendientes");
    assert.ok([...listeners.values()].every((callbacks) => callbacks.size === 0));
  });

  return {
    replacements, resolutions, completions, subscriptions, route, flight,
    get pendingFrames() { return frames.size; },
    get dismissals() { return dismissals; },
    get launchCount() { return launchCount; },
    setSession(next) { session = { ...session, ...next }; },
    render(nextProps = {}) {
      props = { ...props, ...nextProps };
      cursor = 0;
      pendingEffects = [];
      tree = exports.default(props);
      pendingEffects.forEach((hook) => {
        hook.cleanup?.();
        hook.cleanup = undefined;
      });
      pendingEffects.forEach((hook) => { hook.cleanup = hook.effect(); });
      const launching = flight().isLaunching;
      if (launching && !wasLaunching) launchCount += 1;
      wasLaunching = launching;
      return tree;
    },
    keyboard(event) {
      for (const callback of listeners.get(event) || []) callback();
    },
    flushFrame() {
      // Solo entrega la tanda actual: un RAF anidado espera al siguiente frame.
      const batch = [...frames];
      batch.forEach(([id]) => frames.delete(id));
      batch.forEach(([, callback]) => callback());
    },
  };
}

function findNodes(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => findNodes(child, predicate));
  if (!node || typeof node !== "object") return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...findNodes(node.props?.children, predicate),
  ];
}

test("el login horizontal conserva los accesos sociales y desplaza las credenciales con teclado", async (t) => {
  const harness = sessionHarness(t, {
    socialEnabled: true,
    dimensions: { width: 844, height: 390 },
  });
  harness.render();
  await new Promise((resolve) => setImmediate(resolve));
  let tree = harness.render();
  const buttons = () => findNodes(tree, (node) => node.type === "Button")
    .map((node) => node.props.children.join(""));
  assert.ok(buttons().includes("Entrar con Google"));
  assert.ok(buttons().includes("Entrar con Apple"));

  const scroll = findNodes(tree, (node) => node.type === "ScrollView")[0];
  const credentials = findNodes(tree, (node) =>
    node.type === "View" && node.props.ref && findNodes(node, (child) =>
      child.type === "Button" && child.props.children.includes("Iniciar sesión")).length > 0,
  )[0];
  const username = findNodes(tree, (node) => node.type === "TextInput" && node.props.label === "Usuario")[0];
  const usernameContainer = findNodes(credentials, (node) =>
    node.type === "View" && node.props.ref && node.props.children.includes(username),
  )[0];
  const offsets = [];
  scroll.props.ref.current = {
    measureInWindow: (callback) => callback(0, 0, 390, 240),
    scrollTo: ({ y }) => offsets.push(y),
  };
  credentials.props.ref.current = { measureInWindow: (callback) => callback(0, 200, 320, 180) };
  usernameContainer.props.ref.current = { measureInWindow: (callback) => callback(0, 200, 320, 52) };
  username.props.onFocus();
  harness.keyboard("keyboardWillShow");
  assert.equal(offsets.at(-1), 148);
  tree = harness.render();
  assert.ok(buttons().includes("Iniciar sesión"));
  assert.ok(buttons().includes("Entrar con Google"));
  assert.ok(buttons().includes("Entrar con Apple"));
  const password = findNodes(tree, (node) => node.type === "TextInput" && node.props.label === "Contraseña")[0];
  const passwordContainer = findNodes(tree, (node) =>
    node.type === "View" && node.props.ref && node.props.children.includes(password),
  )[0];
  passwordContainer.props.ref.current = { measureInWindow: (callback) => callback(0, 300, 320, 52) };
  scroll.props.ref.current.measureInWindow = (callback) => callback(0, 0, 390, 100);
  password.props.onFocus();
  assert.equal(offsets.at(-1), 260);
});

function authenticate(harness, loginRouteReady = true) {
  const user = { _id: "session-user-test" };
  harness.setSession({ userId: user._id, user, loginRouteReady });
  harness.render();
  return user;
}

function launch(harness) {
  assert.equal(harness.pendingFrames, 1);
  harness.flushFrame();
  harness.render();
  assert.equal(harness.flight().isLaunching, false, "Un frame aún no autoriza el vuelo");
  assert.equal(harness.pendingFrames, 1);
  harness.flushFrame();
  harness.render();
  assert.equal(harness.flight().isLaunching, true);
  assert.equal(harness.launchCount, 1);
  assert.equal(harness.pendingFrames, 0);
  assert.deepEqual(harness.replacements, []);
  assert.deepEqual(harness.resolutions, []);
  assert.deepEqual(harness.completions, []);
}

test("sin userId no programa vuelo, resolución de ruta ni navegación", (t) => {
  const harness = sessionHarness(t);
  harness.render();
  harness.flushFrame();
  harness.flushFrame();
  harness.render();
  assert.equal(harness.flight().isLaunching, false);
  assert.equal(harness.launchCount, 0);
  assert.equal(harness.pendingFrames, 0);
  assert.equal(harness.dismissals, 0);
  assert.deepEqual(harness.replacements, []);
  assert.deepEqual(harness.resolutions, []);
  harness.flight().onLaunchComplete();
  harness.render();
  assert.deepEqual(harness.completions, []);
  assert.deepEqual(harness.replacements, []);
});

test("userId con loginRouteReady=false espera la publicación antes del vuelo", (t) => {
  const harness = sessionHarness(t);
  const user = authenticate(harness, false);
  harness.flushFrame();
  harness.flushFrame();
  harness.render();
  assert.equal(harness.flight().isLaunching, false);
  assert.equal(harness.pendingFrames, 0);
  assert.deepEqual(harness.replacements, []);
  assert.deepEqual(harness.resolutions, []);
  const subscription = harness.subscriptions.find(({ name }) => name === "user");
  assert.ok(subscription, "Se ejecuta el callback real de Meteor.useTracker");
  assert.equal(subscription.args[0]._id, user._id);
  harness.setSession({ loginRouteReady: true });
  harness.render();
  launch(harness);
});

for (const platform of ["ios", "android"]) {
  test(`${platform}: ready espera keyboardDidHide, no keyboardWillHide, y dos RAF`, (t) => {
    const harness = sessionHarness(t, { platform });
    harness.render();
    harness.keyboard(platform === "ios" ? "keyboardWillShow" : "keyboardDidShow");
    harness.render();
    authenticate(harness, false);
    harness.setSession({ loginRouteReady: true });
    harness.render();
    assert.ok(harness.dismissals > 0);
    assert.equal(harness.pendingFrames, 0);
    assert.equal(harness.flight().isLaunching, false);
    harness.keyboard("keyboardWillHide");
    harness.render();
    harness.flushFrame();
    harness.flushFrame();
    harness.render();
    assert.equal(harness.pendingFrames, 0);
    assert.equal(harness.flight().isLaunching, false);
    assert.deepEqual(harness.replacements, []);
    harness.keyboard("keyboardDidHide");
    harness.render();
    launch(harness);
  });
}

test("ruta auth: solo onLaunchComplete y el siguiente render permiten replace con resolveSessionRoute", (t) => {
  const harness = sessionHarness(t);
  const user = authenticate(harness);
  launch(harness);
  for (let index = 0; index < 3; index += 1) {
    harness.flushFrame();
    harness.render();
  }
  assert.deepEqual(harness.replacements, []);
  assert.deepEqual(harness.resolutions, []);
  harness.flight().onLaunchComplete();
  assert.deepEqual(harness.completions, [[user._id]]);
  assert.deepEqual(harness.replacements, [], "El callback no navega directamente");
  assert.deepEqual(harness.resolutions, []);
  harness.render();
  assert.deepEqual(harness.resolutions, [{ userId: user._id, user }]);
  assert.equal(harness.resolutions[0].user, user);
  assert.deepEqual(harness.replacements, [harness.route]);
});

test("deferSessionRedirect=true notifica onLaunchComplete(userId) sin resolver ni navegar", (t) => {
  const harness = sessionHarness(t, { deferSessionRedirect: true });
  const user = authenticate(harness);
  launch(harness);
  harness.flight().onLaunchComplete();
  assert.deepEqual(harness.completions, [[user._id]]);
  harness.render();
  harness.render();
  harness.flushFrame();
  assert.deepEqual(harness.resolutions, []);
  assert.deepEqual(harness.replacements, []);
  assert.equal(harness.launchCount, 1);
});

for (const renderLogout of [false, true]) {
  test(`logout antes del callback descarta la entrega ${renderLogout ? "tras render" : "antes de render"}`, (t) => {
    const harness = sessionHarness(t);
    authenticate(harness);
    launch(harness);
    const staleComplete = harness.flight().onLaunchComplete;
    harness.setSession({ userId: null, user: null, loginRouteReady: false });
    if (renderLogout) harness.render();
    staleComplete();
    harness.render();
    harness.render();
    harness.flushFrame();
    assert.equal(harness.flight().isLaunching, false);
    assert.equal(harness.pendingFrames, 0);
    assert.deepEqual(harness.completions, []);
    assert.deepEqual(harness.resolutions, []);
    assert.deepEqual(harness.replacements, []);
  });
}

test("rerender estable del mismo usuario no repite vuelo, callback ni navegación", (t) => {
  const harness = sessionHarness(t);
  const user = authenticate(harness);
  launch(harness);
  harness.flight().onLaunchComplete();
  harness.render();
  for (let index = 0; index < 4; index += 1) {
    harness.render();
    harness.flushFrame();
  }
  assert.equal(harness.launchCount, 1);
  assert.equal(harness.pendingFrames, 0);
  assert.deepEqual(harness.completions, [[user._id]]);
  assert.deepEqual(harness.resolutions, [{ userId: user._id, user }]);
  assert.deepEqual(harness.replacements, [harness.route]);
});

test("un snapshot nuevo del mismo usuario tampoco debe repetir vuelo ni navegación", (t) => {
  const harness = sessionHarness(t);
  const user = authenticate(harness);
  launch(harness);
  harness.flight().onLaunchComplete();
  harness.render();
  harness.setSession({ user: { ...user } });
  harness.render();
  harness.flushFrame();
  harness.render();
  assert.equal(harness.launchCount, 1);
  assert.equal(harness.pendingFrames, 0);
  assert.deepEqual(harness.completions, [[user._id]]);
  assert.deepEqual(harness.replacements, [harness.route]);
});