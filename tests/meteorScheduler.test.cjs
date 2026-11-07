/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const babel = require("@babel/core");
const { patchMeteorScheduler } = require("../scripts/patch-meteorrn-scheduler");

const binding = path.resolve(__dirname, "../node_modules/@meteorrn/core/helpers/reactNativeBindings.js");

test("Meteor usa batching publico y scheduler idle cancelable sin InteractionManager", () => {
  const source = fs.readFileSync(binding, "utf8");
  assert.doesNotMatch(source, /InteractionManager|Libraries\/Renderer/);
  const tasks = new Map();
  let nextId = 0;
  const native = {
    unstable_batchedUpdates: (fn) => fn(),
    get InteractionManager() { assert.fail("API eliminada"); },
  };
  const requireNative = (name) => {
    assert.equal(name, "react-native");
    return native;
  };
  requireNative.resolve = () => "react-native";
  const exports = {};
  const context = {
    exports,
    require: requireNative,
    requestIdleCallback: (fn, options) => {
      assert.equal(options.timeout, 50);
      tasks.set(++nextId, fn);
      return nextId;
    },
    cancelIdleCallback: (id) => tasks.delete(id),
    setTimeout: () => assert.fail("No debe usar timers si hay idle callback"),
  };
  vm.runInNewContext(babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  }).code, context);
  let calls = 0;
  exports.batchedUpdates(() => calls++);
  const task = exports.runAfterInteractions(() => calls++);
  assert.equal(calls, 1);
  task.cancel();
  assert.equal(tasks.size, 0);
  exports.runAfterInteractions(() => calls++);
  tasks.get(nextId)();
  assert.equal(calls, 2);
});

test("parche reproducible e idempotente; falla sin sobrescribir bindings desconocidos", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vidkar-meteor-scheduler-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const target = path.join(directory, "bindings.js");
  fs.writeFileSync(target, fs.readFileSync(binding));
  const original = fs.readFileSync(target, "utf8");
  patchMeteorScheduler(target);
  assert.equal(fs.readFileSync(target, "utf8"), original);
  fs.writeFileSync(target, "unknown");
  assert.throws(() => patchMeteorScheduler(target), /no reconocidos/);
  assert.equal(fs.readFileSync(target, "utf8"), "unknown");
});
