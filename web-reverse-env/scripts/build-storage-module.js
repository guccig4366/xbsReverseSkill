const { scaffoldModule } = require("./scaffold-module");
const { mergeStorageState } = require("./merge-storage-state");

function normalizeStorageSeed(seed = {}) {
  const merged = mergeStorageState(seed);
  return {
    cookie: seed.cookie || "",
    cookies: merged.cookies,
    localStorage: merged.localStorage,
    sessionStorage: merged.sessionStorage,
  };
}

function renderStoragePatch(seed) {
  const serializedSeed = JSON.stringify(seed, null, 2);
  return `(
function installStorageModule(globalObject) {
  const seed = ${serializedSeed};
  const protector = globalObject.__envNativeProtector || null;

  function defineValue(target, key, value) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: value
    });
  }

  function Storage() {}

  defineValue(Storage.prototype, "key", function key(index) {
    const keys = Object.keys(this.__store__);
    return typeof keys[index] === "string" ? keys[index] : null;
  });
  defineValue(Storage.prototype, "getItem", function getItem(name) {
    const key = String(name);
    return Object.prototype.hasOwnProperty.call(this.__store__, key) ? this.__store__[key] : null;
  });
  defineValue(Storage.prototype, "setItem", function setItem(name, value) {
    this.__store__[String(name)] = String(value);
    this.length = Object.keys(this.__store__).length;
  });
  defineValue(Storage.prototype, "removeItem", function removeItem(name) {
    delete this.__store__[String(name)];
    this.length = Object.keys(this.__store__).length;
  });
  defineValue(Storage.prototype, "clear", function clear() {
    this.__store__ = Object.create(null);
    this.length = 0;
  });

  function createStorage(initialState) {
    const storage = Object.create(Storage.prototype);
    defineValue(storage, "__store__", Object.assign(Object.create(null), initialState || {}));
    defineValue(storage, "length", Object.keys(storage.__store__).length);
    Object.keys(storage.__store__).forEach(function defineEntry(key) {
      Object.defineProperty(storage, key, {
        configurable: true,
        enumerable: true,
        get: function getEntry() {
          return storage.getItem(key);
        },
        set: function setEntry(value) {
          storage.setItem(key, value);
        }
      });
    });
    return storage;
  }

  if (protector && protector.repairFunctionMeta) {
    protector.repairFunctionMeta(Storage, { name: "Storage", length: 0 });
    protector.repairFunctionMeta(Storage.prototype.key, { name: "key", length: 1 });
    protector.repairFunctionMeta(Storage.prototype.getItem, { name: "getItem", length: 1 });
    protector.repairFunctionMeta(Storage.prototype.setItem, { name: "setItem", length: 2 });
    protector.repairFunctionMeta(Storage.prototype.removeItem, { name: "removeItem", length: 1 });
    protector.repairFunctionMeta(Storage.prototype.clear, { name: "clear", length: 0 });
  }
  if (protector && protector.protectFunction) {
    protector.protectFunction(Storage, "Storage");
    protector.protectFunction(Storage.prototype.key, "key");
    protector.protectFunction(Storage.prototype.getItem, "getItem");
    protector.protectFunction(Storage.prototype.setItem, "setItem");
    protector.protectFunction(Storage.prototype.removeItem, "removeItem");
    protector.protectFunction(Storage.prototype.clear, "clear");
  }

  const localStorage = createStorage(seed.localStorage || {});
  const sessionStorage = createStorage(seed.sessionStorage || {});

  Object.defineProperty(globalObject, "Storage", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: Storage
  });
  Object.defineProperty(globalObject, "localStorage", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: localStorage
  });
  Object.defineProperty(globalObject, "sessionStorage", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: sessionStorage
  });

  if (globalObject.document && typeof globalObject.document.cookie === "string" && seed.cookie) {
    globalObject.document.cookie = seed.cookie;
  }

  return {
    localStorage: localStorage,
    sessionStorage: sessionStorage
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
`;
}

function buildStorageModule(seed = {}) {
  const module = scaffoldModule("storage-module");
  const normalizedSeed = normalizeStorageSeed(seed);

  module.patchPlan = [
    "构建 Storage 构造器与原型方法。",
    "按真实种子预置 localStorage / sessionStorage 的 key/value 运行态。",
    "把 cookie 字符串与 document.cookie 入口联动，而不是把 storage 状态和 cookie 割裂开。",
  ];
  module.patchCode = renderStoragePatch(normalizedSeed);
  module.runtimeState = normalizedSeed;
  module.validation = [
    "检查 localStorage.length / sessionStorage.length。",
    "检查 getItem/setItem/removeItem/clear/key 的返回值。",
    "检查 localStorage.device_id 这类同名属性访问是否与 getItem 一致。",
    "检查 document 已存在时 cookie 字符串能否同步注入。",
  ];
  module.residualRisk = [
    "未实现配额异常、跨 tab 事件同步与 storage event。",
    "如果站点依赖历史态的更新时间、写入顺序或事件广播，仍需继续扩展。",
  ];

  return module;
}

module.exports = {
  buildStorageModule,
  normalizeStorageSeed,
};
