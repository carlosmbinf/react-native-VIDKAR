// Meteor necesita estos timers también cuando se ejecuta en el navegador.
if (typeof globalThis.setImmediate !== "function") {
  globalThis.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);
  globalThis.clearImmediate = clearTimeout;
}
