import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const files = [
  "../node_modules/@meteorrn/core/src/Data.js",
  "../node_modules/@meteorrn/core/src/Meteor.js",
  "../node_modules/@meteorrn/core/src/user/User.js",
  "../services/meteor/client.native.js",
];
const sources = await Promise.all(files.map(async (file) => ts.transpileModule(
  await fs.readFile(new URL(file, import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } },
).outputText));

function sessionFixture() {
  const timers = new Map();
  let timerId = 0;
  let storedToken;
  const storageRead = new Promise((resolve) => { storedToken = resolve; });
  const calls = [];
  const connections = [];
  class DB extends EventEmitter {
    constructor() {
      super();
      this.collections = { users: true };
      this.users = {
        row: null,
        remove: () => { this.users.row = null; },
        upsert: (row) => { this.users.row = row; this.emit("change"); },
      };
    }
  }
  class DDP extends EventEmitter {
    constructor() { super(); this.status = "connecting"; connections.push(this); }
    connect() { this.status = "connecting"; }
  }
  class ReactiveDict {
    values = {};
    get(key) { return this.values[key]; }
    set(key, value) { this.values[key] = value; }
  }
  const dependencies = {
    "@meteorrn/minimongo": DB,
    "./Tracker.js": {},
    "../helpers/reactNativeBindings.js": {},
    ejson: {}, "../lib/ddp.js": DDP, "../lib/Random.js": {},
    "./Collection.js": { localCollections: [], getObservers: () => [] },
    "./Call.js": (name, ...args) => { calls.push({ name, args }); },
    "./components/withTracker.js": {}, "./components/useTracker.js": {},
    "./ReactiveDict.js": ReactiveDict, "../ReactiveDict": ReactiveDict,
    "../../lib/utils": { hashPassword: () => { throw new Error("No se permite login con credenciales"); } },
    "@react-native-community/netinfo": { addEventListener() {} },
    "expo-constants": { expoConfig: { extra: { meteorUrl: "wss://fixture.invalid/websocket" } } },
    "expo-secure-store": { getItemAsync: () => storageRead, setItemAsync: async () => {}, deleteItemAsync: async () => {} },
  };
  const execute = (source) => {
    const exports = {};
    const context = {
      exports, require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; },
      setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
      clearTimeout: (id) => timers.delete(id), setImmediate,
      process: { env: {} }, WebSocket: class { constructor() { throw new Error("Red prohibida"); } },
    };
    context.global = context;
    vm.runInNewContext(source, context);
    return exports;
  };
  const data = execute(sources[0]).default;
  dependencies["./Data.js"] = dependencies["../Data"] = data;
  dependencies["./Mongo.js"] = dependencies["../Mongo"] = {
    Collection: class { findOne(id) { return data.db.users.row?._id === id ? data.db.users.row : null; } },
  };
  const Meteor = execute(sources[1]).default;
  dependencies["../Meteor.js"] = Meteor;
  Object.assign(Meteor, execute(sources[2]).default);
  dependencies["@meteorrn/core"] = Meteor;
  const client = execute(sources[3]);
  const flush = async () => {
    for (let i = 0; i < 30; i += 1) {
      await Promise.resolve();
      for (const [id, timer] of timers) if (timer.delay < 10) { timers.delete(id); timer.fn(); }
    }
  };
  return { client, Meteor, data, timers, calls, connections, storedToken, flush };
}

test("bootstrap ejecuta connect y resume reales de @meteorrn/core sin credenciales ni conexiones duplicadas", async () => {
  for (const token of [null, "fixture-persisted-resume"]) {
    const f = sessionFixture();
    let settled = false;
    const first = f.client.ensureMeteorSession();
    first.then(() => { settled = true; });
    assert.equal(f.client.ensureMeteorSession(), first);
    await f.flush();
    assert.equal(f.connections.length, 1);
    assert.equal(settled, false);
    const ddp = f.connections[0];
    ddp.status = "connected";
    ddp.emit("connected");
    await f.flush();
    assert.equal(f.Meteor.loggingIn(), true);
    assert.equal(settled, false, "no terminar durante lectura SecureStore");
    f.storedToken(token);
    await f.flush();
    if (token) {
      assert.equal(settled, false, "no terminar durante resume");
      assert.equal(f.calls.length, 1);
      assert.equal(f.calls[0].name, "login");
      assert.equal(JSON.stringify(f.calls[0].args[0]), JSON.stringify({ resume: token }));
      // DDP entrega el usuario antes del resultado del método login.
      ddp.emit("added", { collection: "users", id: "fixture-owner", fields: {} });
      f.calls[0].args[1](null, { id: "fixture-owner", token });
      await f.flush();
    } else assert.equal(f.calls.length, 0, "sin token no inventar autenticación");
    assert.equal(await first, token ? "fixture-owner" : null);
    assert.equal(f.data._cbs.length, 0);
    assert.equal(f.data.db.listenerCount("change"), 0);
    assert.equal(f.timers.size, 0);
    assert.equal(await f.client.ensureMeteorSession(), token ? "fixture-owner" : null);
    assert.equal(f.connections.length, 1);
  }
});

test("bootstrap offline vence, limpia listeners y permite reintento sin recrear DDP", async () => {
  const f = sessionFixture();
  const pending = f.client.ensureMeteorSession();
  const rejected = assert.rejects(pending, /Comprueba la conexión/);
  await f.flush();
  [...f.timers.values()].find((timer) => timer.delay === 15000).fn();
  await rejected;
  assert.equal(f.data._cbs.length, 0);
  assert.equal(f.data.db.listenerCount("change"), 0);
  const retry = f.client.ensureMeteorSession();
  const ddp = f.connections[0];
  ddp.status = "connected";
  ddp.emit("connected");
  f.storedToken(null);
  await f.flush();
  assert.equal(await retry, null);
  assert.equal(f.connections.length, 1);
  assert.equal(f.calls.length, 0);
});