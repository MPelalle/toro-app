import "fake-indexeddb/auto";

const windowShim = Object.assign(new EventTarget(), {
  clearInterval: globalThis.clearInterval.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  setInterval: globalThis.setInterval.bind(globalThis),
  setTimeout: globalThis.setTimeout.bind(globalThis),
  indexedDB: globalThis.indexedDB,
});

Object.defineProperty(globalThis, "window", { configurable: true, value: windowShim });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
