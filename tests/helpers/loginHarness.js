import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { resolveSessionRoute } from "../../components/navigator/sessionRoute.js";

const source = ts.transpileModule(await fs.readFile(new URL("../../components/loguin/Loguin.native.js", import.meta.url), "utf8"), {
  fileName: "Loguin.jsx",
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;

// Componente y efectos reales; únicamente plataforma, Meteor y hooks aislados.
export function loginHarness(state) {
  let focused = true;
  let cursor = 0;
  let pending = [];
  let tree;
  const slots = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      const slot = slots[index] ||= { value: typeof initial === "function" ? initial() : initial };
      return [slot.value, (value) => { slot.value = value; }];
    },
    useRef(initial) { return slots[cursor++] ||= { current: initial }; },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect(fn, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        pending.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; });
      }
    },
  };
  const dependencies = {
    react: React,
    "@expo/vector-icons/FontAwesome5": "Icon",
    "@meteorrn/core": {
      useTracker: (fn) => fn(), userId: () => state.userId,
      user: () => state.user || { _id: state.userId },
      status: () => ({ connected: true }),
      subscribe: () => ({ ready: () => state.loginReady !== false }),
      loginWithPassword: (_name, _password, callback) => {
        state.userId = "fixture-owner";
        state.loginReady = false;
        callback(null);
      },
    },
    "expo-router": { router: { replace: (target) => state.navigations.push(target) } },
    "expo-router/react-navigation": { useIsFocused: () => focused },
    "expo-apple-authentication": {}, "expo-blur": {}, "expo-web-browser": {},
    "react-native": {
      Platform: { OS: "android" }, NativeModules: {},
      useWindowDimensions: () => ({ width: 400, height: 800 }),
      View: "View", ImageBackground: "ImageBackground", ScrollView: "ScrollView",
      KeyboardAvoidingView: "KeyboardAvoidingView", Keyboard: { dismiss() {} },
      Alert: { alert: () => assert.fail("No se esperaba alerta de login") },
    },
    "react-native-paper": {
      useTheme: () => ({ colors: {} }), Button: "Button", Text: "Text", TextInput: "TextInput",
    },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "../../services/meteor/client": { getMeteorUrl: () => "ws://fixture.invalid/websocket" },
    "../../services/notifications/PushMessaging.native": { registerPushTokenForActiveSession: async () => {} },
    "../../services/watch/watchDashboard": { WATCH_ROOT_USER_FIELDS: {} },
    "../collections/collections": { ConfigCollection: { findOne: () => null } },
    "../navigator/sessionRoute": { resolveSessionRoute },
    "./Loguin.styles": { getLoginPalette: () => ({}), loginScreenStyles: {} },
    "../files/space-bg-shadowcodex.jpg": "fixture-image",
  };
  const exports = {};
  vm.runInNewContext(source, { exports, require: (name) => {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  } });
  return {
    render({ isFocused = true, deferSessionRedirect = false } = {}) {
      focused = isFocused;
      cursor = 0;
      pending = [];
      tree = exports.default({ deferSessionRedirect });
      pending.forEach((effect) => effect());
    },
    async submit() {
      const find = (node) => {
        if (!node || typeof node !== "object") return null;
        if (node.type === "Button" && node.props.children.includes("Iniciar sesión")) return node;
        return Object.values(node).flat().map(find).find(Boolean);
      };
      const button = find(tree);
      assert.ok(button, "botón del login real");
      await button.props.onPress();
    },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}