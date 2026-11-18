/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const babel = require("@babel/core");

const filename = path.join(__dirname, "../components/loguin/LoginAtmosphere.native.jsx");
const compiled = babel.transformSync(fs.readFileSync(filename, "utf8"), {
  filename,
  configFile: false,
  babelrc: false,
  presets: ["babel-preset-expo"],
  caller: { name: "metro", platform: "ios", engine: "hermes", isDev: true, supportsStaticESM: false },
}).code;

test("el reloj de las nubes se detiene al desactivar, reducir movimiento o desmontar", () => {
  let cursor;
  let advance;
  const effects = [];
  const values = [];
  const frame = { isActive: false, setActive(active) { this.isActive = active; } };
  const React = {
    memo: (component) => component,
    useCallback: (callback) => callback,
    useEffect: (callback) => effects.push(callback),
  };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: { __esModule: true, default: React, ...React },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", StyleSheet: { create: (styles) => styles }, useWindowDimensions: () => ({ width: 390 }) },
    "react-native-svg": {},
    "react-native-reanimated": {
      __esModule: true, default: { View: "AnimatedView" },
      ReduceMotion: { Never: "never" },
      useSharedValue(initial) {
        return values[cursor++] ??= { value: initial, get() { return this.value; }, set(value) { this.value = value; } };
      },
      useFrameCallback(callback) {
        assert.ok(callback.__workletHash, "Expo transforma el reloj en un worklet");
        advance = callback;
        return frame;
      },
      cancelAnimation() {},
      withTiming: (value) => value,
    },
  };
  const exports = {};
  const context = {
    exports, __DEV__: false,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      return require(name);
    },
  };
  context.global = context;
  vm.runInNewContext(compiled, context, { filename });
  let cleanups = [];
  const render = (props) => {
    cleanups.forEach((cleanup) => cleanup?.());
    effects.length = 0;
    cursor = 0;
    exports.default(props);
    cleanups = effects.map((effect) => effect());
  };
  const tick = () => { if (frame.isActive) advance({ timeSincePreviousFrame: 16 }); };

  render({ enabled: true });
  tick();
  const idleAdvance = values[0].get();
  render({ enabled: true, authenticating: true });
  tick();
  assert.ok(values[0].get() - idleAdvance < idleAdvance);
  render({ enabled: true, confirmed: true });
  tick();
  assert.ok(values[0].get() > idleAdvance * 4);
  const position = values[0].get();
  for (const props of [{ enabled: false }, { enabled: true, reducedMotion: true }]) {
    render(props);
    tick();
    assert.equal(values[0].get(), position);
  }
  render({ enabled: true });
  assert.equal(frame.isActive, true);
  cleanups.forEach((cleanup) => cleanup?.());
  assert.equal(frame.isActive, false);
});
