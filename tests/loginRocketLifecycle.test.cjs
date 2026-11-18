/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const file = "components/loguin/LoginRocketFlight.native.jsx";
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

// Política JS de ciclo de vida; no constituye una prueba visual nativa.
function flightHarness() {
  const hooks = [];
  const timings = [];
  const values = [];
  const writes = [];
  const cancelled = [];
  const rnQueue = [];
  let cursor = 0;
  let pendingEffects = [];
  let dimensions = { width: 390, height: 844 };
  let props = { showRocket: false };
  let mounted = false;
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

  const React = {
    // No montamos RocketIllustration: aislamos el ciclo de vida del contenedor.
    createElement: (type, elementProps, ...children) => ({
      type, props: { ...elementProps, children },
    }),
    useRef(initial) {
      return slot("ref", () => ({ value: { current: initial } })).value;
    },
    useCallback(callback, deps) {
      const hook = slot("callback", () => ({}));
      if (!sameDeps(hook.deps, deps)) {
        hook.value = callback;
        hook.deps = deps;
      }
      return hook.value;
    },
    useEffect(effect, deps) {
      const hook = slot("effect", () => ({}));
      if (!sameDeps(hook.deps, deps)) pendingEffects.push(hook);
      hook.effect = effect;
      hook.deps = deps;
    },
  };

  function attachOwner(animation, owner) {
    if (animation?.kind === "timing") animation.owner = owner;
    if (animation?.kind === "sequence") {
      animation.steps.forEach((step) => attachOwner(step, owner));
    }
  }

  const reanimated = {
    __esModule: true,
    default: { View: "AnimatedView" },
    Easing: {
      bezier: () => "bezier",
      out: () => "out",
      in: (easing) => easing,
      quad: (value) => value * value,
      cubic: "cubic",
      linear: "linear",
    },
    ReduceMotion: { Never: "never" },
    useSharedValue(initial) {
      return slot("shared", () => {
        const value = {
          value: initial,
          animation: null,
          get() { return this.value; },
          set(next) {
            const resolved = typeof next === "function" ? next(this.value) : next;
            writes.push({ owner: this, value: resolved });
            if (resolved && typeof resolved === "object" && resolved.kind) {
              this.animation = resolved;
              attachOwner(resolved, this);
            } else {
              this.value = resolved;
              this.animation = null;
            }
          },
        };
        values.push(value);
        return { value };
      }).value;
    },
    useAnimatedStyle(updater) {
      slot("animatedStyle", () => ({}));
      return updater;
    },
    withTiming(toValue, config, callback) {
      const animation = { kind: "timing", toValue, config, callback };
      timings.push(animation);
      return animation;
    },
    withSequence: (...steps) => ({ kind: "sequence", steps }),
    cancelAnimation(value) {
      cancelled.push(value);
      value.animation = null;
    },
  };
  const dependencies = {
    react: { __esModule: true, default: React, ...React },
    "react-native": {
      View: "View",
      StyleSheet: { create: (styles) => styles },
      useWindowDimensions: () => dimensions,
    },
    "react-native-svg": {
      __esModule: true, default: "Svg", Circle: "Circle", G: "G", Path: "Path",
    },
    "react-native-reanimated": reanimated,
    "react-native-worklets": {
      scheduleOnRN: (callback, ...args) => rnQueue.push(() => callback(...args)),
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Dependencia no simulada: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });

  function cleanupEffects(effects) {
    effects.forEach((hook) => {
      const cleanup = hook.cleanup;
      hook.cleanup = undefined;
      cleanup?.();
    });
  }

  function setupEffects(effects) {
    effects.forEach((hook) => { hook.cleanup = hook.effect(); });
  }

  return {
    timings, values, writes, cancelled, rnQueue,
    render(nextProps = {}, nextDimensions = {}) {
      props = { ...props, ...nextProps };
      dimensions = { ...dimensions, ...nextDimensions };
      cursor = 0;
      pendingEffects = [];
      tree = exports.default(props);
      cleanupEffects(pendingEffects);
      setupEffects(pendingEffects);
      mounted = true;
      return tree;
    },
    unmount() {
      assert.equal(mounted, true);
      cleanupEffects(hooks.filter((hook) => hook.kind === "effect"));
      mounted = false;
    },
    replayEffects() {
      assert.equal(mounted, true);
      // StrictMode: cleanup/setup conservando refs, callbacks y shared values.
      const effects = hooks.filter((hook) => hook.kind === "effect");
      cleanupEffects(effects);
      setupEffects(effects);
    },
    completions: () => timings.filter((animation) => typeof animation.callback === "function"),
    finish(animation, finished) {
      assert.ok(timings.includes(animation));
      assert.equal(typeof animation.callback, "function");
      if (finished) animation.owner.value = animation.toValue;
      // Permite entregas tardías incluso tras cancelar para probar la protección JS.
      animation.callback(finished);
    },
    flushNextRN() {
      assert.ok(rnQueue.length > 0);
      rnQueue.shift()();
    },
    flushRN() {
      while (rnQueue.length) rnQueue.shift()();
    },
    flightStyle: () => tree.props.style[1](),
    cardStyle: () => tree.props.children[1].props.style[1](),
  };
}

test("el vuelo acelera continuamente sin reiniciar la velocidad a mitad", () => {
  const harness = flightHarness();
  harness.render({ isLaunching: true });
  const [, , x, y, rotation, scale] = harness.values;
  for (const [shared, target] of [
    [x, 390 * 0.42],
    [y, -844 * 1.25],
    [rotation, 8],
    [scale, 0.72],
  ]) {
    const animation = shared.animation;
    assert.equal(animation.kind, "timing");
    assert.equal(animation.toValue, target);
    assert.equal(animation.config.duration, 740);
    const easing = animation.config.easing;
    assert.equal(easing(0), 0);
    assert.equal(easing(1), 1);
    let previousDelta = 0;
    for (let step = 1; step <= 20; step += 1) {
      const delta = easing(step / 20) - easing((step - 1) / 20);
      assert.ok(delta > previousDelta, `La velocidad debe crecer en el tramo ${step}`);
      previousDelta = delta;
    }
  }
  harness.unmount();
});

function onlyCompletion(harness) {
  const completions = harness.completions();
  assert.equal(completions.length, 1, "Un vuelo debe tener una única finalización");
  return completions[0];
}

for (const reducedMotion of [false, true]) {
  const mode = reducedMotion ? "reducido" : "normal";

  test(`reposo ${mode}: no notifica ni programa una finalización`, () => {
    const harness = flightHarness();
    let completed = 0;
    harness.render({ reducedMotion, onLaunchComplete: () => { completed += 1; } });
    harness.render({});
    harness.flushRN();
    assert.equal(harness.completions().length, 0);
    assert.equal(harness.rnQueue.length, 0);
    assert.equal(completed, 0);
    harness.unmount();
  });

  test(`vuelo ${mode}: espera finished=true y la cola RN; notifica una sola vez`, () => {
    const harness = flightHarness();
    let completed = 0;
    harness.render({ reducedMotion, onLaunchComplete: () => { completed += 1; } });
    harness.render({ isLaunching: true });
    const completion = onlyCompletion(harness);
    assert.equal(completed, 0);
    assert.equal(harness.rnQueue.length, 0);
    harness.flushRN();
    assert.equal(completed, 0);

    harness.finish(completion, true);
    assert.equal(completed, 0, "El worklet no debe ejecutar directamente el callback RN");
    assert.equal(harness.rnQueue.length, 1);
    harness.flushRN();
    assert.equal(completed, 1);
    harness.finish(completion, true);
    harness.flushRN();
    assert.equal(completed, 1, "Una entrega duplicada no debe volver a completar el vuelo");
    harness.unmount();
  });

  test(`vuelo ${mode}: finished=false no notifica ni encola trabajo RN`, () => {
    const harness = flightHarness();
    let completed = 0;
    harness.render({ isLaunching: true, reducedMotion, onLaunchComplete: () => { completed += 1; } });
    harness.finish(onlyCompletion(harness), false);
    assert.equal(harness.rnQueue.length, 0);
    harness.flushRN();
    assert.equal(completed, 0);
    harness.unmount();
  });

  test(`vuelo ${mode}: desmontar descarta la finalización ya encolada y entregas tardías`, () => {
    const harness = flightHarness();
    let completed = 0;
    harness.render({ isLaunching: true, reducedMotion, onLaunchComplete: () => { completed += 1; } });
    const completion = onlyCompletion(harness);
    harness.finish(completion, true);
    assert.equal(harness.rnQueue.length, 1);
    const cancelledBefore = harness.cancelled.length;
    harness.unmount();
    assert.ok(harness.cancelled.slice(cancelledBefore).includes(completion.owner));
    harness.flushRN();
    assert.equal(completed, 0);
    harness.finish(completion, true);
    harness.flushRN();
    assert.equal(completed, 0);
  });

  test(`StrictMode ${mode}: cleanup invalida la cola vieja sin bloquear el vuelo nuevo`, () => {
    const harness = flightHarness();
    let completed = 0;
    const props = { isLaunching: true, reducedMotion, onLaunchComplete: () => { completed += 1; } };
    harness.render(props);
    const oldCompletion = onlyCompletion(harness);
    const sharedValues = [...harness.values];
    harness.finish(oldCompletion, true);
    const cancelledBefore = harness.cancelled.length;
    harness.replayEffects();
    assert.ok(harness.cancelled.slice(cancelledBefore).includes(oldCompletion.owner));
    assert.deepEqual(harness.values, sharedValues, "StrictMode debe conservar los shared values");
    const completions = harness.completions();
    assert.equal(completions.length, 2);
    const newCompletion = completions[1];
    assert.notEqual(newCompletion, oldCompletion);
    harness.render(props);
    assert.equal(harness.completions().length, 2, "Un render estable no reinicia efectos");
    harness.finish(newCompletion, true);
    assert.equal(harness.rnQueue.length, 2);
    harness.flushNextRN();
    assert.equal(completed, 0, "La cola del primer setup debe quedar invalidada");
    harness.flushNextRN();
    assert.equal(completed, 1, "La cola vieja no debe invalidar el nuevo setup");
    harness.unmount();
  });
}

test("cambiar width/height en vuelo no crea finalizaciones ni reinicia animaciones", () => {
  const harness = flightHarness();
  let completed = 0;
  harness.render({ onLaunchComplete: () => { completed += 1; } });
  harness.render({ isLaunching: true });
  const completion = onlyCompletion(harness);
  const before = {
    timings: harness.timings.length,
    writes: harness.writes.length,
    cancelled: harness.cancelled.length,
    values: [...harness.values],
    animations: harness.values.map((value) => value.animation),
  };
  for (const dimensions of [{ width: 844 }, { height: 390 }, { width: 430, height: 932 }]) {
    harness.render({}, dimensions);
    assert.equal(onlyCompletion(harness), completion);
    assert.equal(harness.timings.length, before.timings);
    assert.equal(harness.writes.length, before.writes);
    assert.equal(harness.cancelled.length, before.cancelled);
    assert.deepEqual(harness.values, before.values);
    assert.deepEqual(harness.values.map((value) => value.animation), before.animations);
    assert.equal(completed, 0);
  }
  harness.finish(completion, true);
  harness.flushRN();
  assert.equal(completed, 1);
  harness.unmount();
});

test("usa el callback actualizado incluso con una finalización pendiente en RN, sin reiniciar", () => {
  const harness = flightHarness();
  const calls = [];
  harness.render({ isLaunching: true, onLaunchComplete: () => calls.push("original") });
  const completion = onlyCompletion(harness);
  const timingCount = harness.timings.length;
  const writeCount = harness.writes.length;
  const cancelCount = harness.cancelled.length;
  harness.render({ onLaunchComplete: () => calls.push("actualizado") });
  assert.equal(onlyCompletion(harness), completion);
  assert.equal(harness.timings.length, timingCount);
  assert.equal(harness.writes.length, writeCount);
  assert.equal(harness.cancelled.length, cancelCount);
  harness.finish(completion, true);
  harness.render({ onLaunchComplete: () => calls.push("más reciente") });
  assert.equal(onlyCompletion(harness), completion);
  assert.equal(harness.timings.length, timingCount);
  assert.equal(harness.writes.length, writeCount);
  assert.equal(harness.cancelled.length, cancelCount);
  assert.deepEqual(calls, []);
  harness.flushRN();
  assert.deepEqual(calls, ["más reciente"]);
  harness.unmount();
});

test("movimiento reducido completa con el callback de opacidad de 180 ms sin desplazamiento", () => {
  const harness = flightHarness();
  let completed = 0;
  harness.render({ reducedMotion: true, onLaunchComplete: () => { completed += 1; } });
  const writesBefore = harness.writes.length;
  const timingsBefore = harness.timings.length;
  harness.render({ isLaunching: true });
  const completion = onlyCompletion(harness);
  assert.equal(harness.timings.length - timingsBefore, 1, "Solo se anima la opacidad del vuelo");
  assert.equal(completion.config.duration, 180);
  assert.equal(completion.toValue, 0);
  assert.equal(completion.owner.animation, completion);
  assert.ok(harness.writes.slice(writesBefore).every((write) => write.owner === completion.owner));

  function assertNoDisplacement() {
    const flight = harness.flightStyle();
    assert.equal(flight.transform[0].translateX, 0);
    assert.equal(flight.transform[1].translateY, 0);
    assert.equal(flight.transform[2].rotate, "0deg");
    assert.equal(flight.transform[3].scale, 1);
    const card = harness.cardStyle();
    assert.equal(card.transform[0].translateY, 0);
    assert.equal(card.transform[1].scale, 1);
  }

  assertNoDisplacement();
  assert.equal(harness.flightStyle().opacity, 1);
  assert.equal(completed, 0);
  harness.finish(completion, true);
  assert.equal(harness.flightStyle().opacity, 0);
  assertNoDisplacement();
  assert.equal(completed, 0);
  assert.equal(harness.rnQueue.length, 1);
  harness.flushRN();
  assert.equal(completed, 1);
  harness.unmount();
});

test("cancelar mediante props descarta la cola anterior y permite otro lanzamiento", () => {
  const harness = flightHarness();
  let completed = 0;
  harness.render({ isLaunching: true, onLaunchComplete: () => { completed += 1; } });
  const oldCompletion = onlyCompletion(harness);
  harness.finish(oldCompletion, true);
  harness.render({ isLaunching: false });
  harness.flushRN();
  assert.equal(completed, 0);
  harness.render({ isLaunching: true });
  assert.equal(harness.completions().length, 2);
  harness.finish(harness.completions()[1], true);
  harness.flushRN();
  assert.equal(completed, 1);
  harness.unmount();
});