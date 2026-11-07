/* global __dirname */
const fs = require("node:fs");
const path = require("node:path");

const target = path.join(__dirname, "../node_modules/@meteorrn/core/helpers/reactNativeBindings.js");
const patches = [
  [
    "require('react-native/Libraries/Renderer/shims/ReactNative').unstable_batchedUpdates",
    "require('react-native').unstable_batchedUpdates",
  ],
  [
    "require('react-native').InteractionManager.runAfterInteractions",
    `(fn) => {
      if (typeof requestIdleCallback !== 'function') {
        const timer = setTimeout(fn, 50);
        return { cancel: () => clearTimeout(timer) };
      }
      const task = requestIdleCallback(() => fn(), { timeout: 50 });
      return { cancel: () => cancelIdleCallback(task) };
    }`,
  ],
];

function patchMeteorScheduler(file = target) {
  const original = fs.readFileSync(file, "utf8");
  let next = original;
  for (const [needle, replacement] of patches) {
    if (next.includes(replacement)) continue;
    if (!next.includes(needle)) {
      throw new Error("[patch-meteorrn-scheduler] Bindings de Meteor no reconocidos; revisar compatibilidad.");
    }
    next = next.replace(needle, replacement);
  }
  if (next !== original) fs.writeFileSync(file, next, "utf8");
}

if (require.main === module) {
  patchMeteorScheduler();
  console.log("[patch-meteorrn-scheduler] Scheduler alineado con React Native 0.88.");
}

module.exports = { patchMeteorScheduler };
