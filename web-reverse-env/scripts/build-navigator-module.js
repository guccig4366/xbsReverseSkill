const { scaffoldModule } = require("./scaffold-module");
const { buildPluginGraph } = require("./build-plugin-graph");

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeNavigatorSeed(seed = {}) {
  const navigatorSeed = seed.navigator && typeof seed.navigator === "object" ? seed.navigator : seed;
  const plugins = Array.isArray(seed.plugins) ? clone(seed.plugins) : [];
  const mimeTypes = Array.isArray(seed.mimeTypes) ? clone(seed.mimeTypes) : [];

  return {
    navigator: {
      userAgent: navigatorSeed.userAgent || "",
      platform: navigatorSeed.platform || "",
      vendor: navigatorSeed.vendor || "",
      language: navigatorSeed.language || "",
      languages: Array.isArray(navigatorSeed.languages) ? navigatorSeed.languages.slice() : [],
      webdriver: typeof navigatorSeed.webdriver === "boolean" ? navigatorSeed.webdriver : false,
      hardwareConcurrency: Number.isFinite(navigatorSeed.hardwareConcurrency)
        ? navigatorSeed.hardwareConcurrency
        : 8,
      deviceMemory: Number.isFinite(navigatorSeed.deviceMemory) ? navigatorSeed.deviceMemory : 8,
      maxTouchPoints: Number.isFinite(navigatorSeed.maxTouchPoints) ? navigatorSeed.maxTouchPoints : 0,
      cookieEnabled: navigatorSeed.cookieEnabled !== false,
      pdfViewerEnabled: navigatorSeed.pdfViewerEnabled !== false,
      appCodeName: navigatorSeed.appCodeName || "Mozilla",
      appName: navigatorSeed.appName || "Netscape",
      appVersion: navigatorSeed.appVersion || navigatorSeed.userAgent || "",
      userAgentData: clone(seed.userAgentData || navigatorSeed.userAgentData || null),
      connection: clone(seed.connection || navigatorSeed.connection || null),
    },
    plugins,
    mimeTypes,
    battery: clone(seed.battery || null),
  };
}

function renderNavigatorPatch(seed) {
  const serializedSeed = JSON.stringify(seed, null, 2);
  return `(
function installNavigatorModule(globalObject) {
  const seed = ${serializedSeed};
  const protector = globalObject.__envNativeProtector || null;
  const pluginSeed = Array.isArray(seed.plugins) ? seed.plugins.slice() : [];
  const mimeSeed = Array.isArray(seed.mimeTypes) ? seed.mimeTypes.slice() : [];

  function defineValue(target, key, value) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: value
    });
  }

  function defineGetter(target, key, getter) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      get: getter
    });
    if (protector && protector.protectDescriptor) {
      protector.protectDescriptor(target, key);
    }
  }

  function createIndexedCollection(items, namedKey) {
    const collection = {};
    for (let index = 0; index < items.length; index += 1) {
      Object.defineProperty(collection, index, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: items[index]
      });
      if (items[index] && items[index][namedKey]) {
        Object.defineProperty(collection, items[index][namedKey], {
          configurable: true,
          enumerable: false,
          writable: false,
          value: items[index]
        });
      }
    }
    defineValue(collection, "length", items.length);
    defineValue(collection, "item", function item(index) {
      return items[index] || null;
    });
    defineValue(collection, "namedItem", function namedItem(name) {
      return items.find(function findItem(entry) {
        return entry && entry[namedKey] === name;
      }) || null;
    });
    defineValue(collection, "refresh", function refresh() {});
    return collection;
  }

  const pluginArray = pluginSeed.map(function mapPlugin(plugin) {
    return {
      name: plugin.name || "",
      filename: plugin.filename || "",
      description: plugin.description || "",
      length: 0
    };
  });

  const mimeTypeArray = mimeSeed.map(function mapMime(mime) {
    return {
      type: mime.type || "",
      suffixes: mime.suffixes || "",
      description: mime.description || "",
      enabledPlugin: null
    };
  });

  for (let index = 0; index < mimeSeed.length; index += 1) {
    const pluginName = mimeSeed[index].enabledPluginName || "";
    const plugin = pluginArray.find(function findPlugin(entry) {
      return entry.name === pluginName;
    }) || null;
    mimeTypeArray[index].enabledPlugin = plugin;
    if (plugin) {
      const itemIndex = plugin.length;
      Object.defineProperty(plugin, itemIndex, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: mimeTypeArray[index]
      });
      plugin.length += 1;
    }
  }

  const plugins = createIndexedCollection(pluginArray, "name");
  const mimeTypes = createIndexedCollection(mimeTypeArray, "type");

  function Navigator() {}
  const navigatorState = seed.navigator || {};
  const navigatorInstance = Object.create(Navigator.prototype);

  const scalarKeys = [
    "userAgent",
    "platform",
    "vendor",
    "language",
    "webdriver",
    "hardwareConcurrency",
    "deviceMemory",
    "maxTouchPoints",
    "cookieEnabled",
    "pdfViewerEnabled",
    "appCodeName",
    "appName",
    "appVersion"
  ];

  scalarKeys.forEach(function defineScalar(key) {
    defineGetter(Navigator.prototype, key, function getScalar() {
      return navigatorState[key];
    });
  });

  defineGetter(Navigator.prototype, "languages", function getLanguages() {
    return Array.isArray(navigatorState.languages) ? navigatorState.languages.slice() : [];
  });
  defineGetter(Navigator.prototype, "plugins", function getPlugins() {
    return plugins;
  });
  defineGetter(Navigator.prototype, "mimeTypes", function getMimeTypes() {
    return mimeTypes;
  });
  defineGetter(Navigator.prototype, "userAgentData", function getUserAgentData() {
    return navigatorState.userAgentData || null;
  });
  defineGetter(Navigator.prototype, "connection", function getConnection() {
    return navigatorState.connection || null;
  });

  defineValue(Navigator.prototype, "javaEnabled", function javaEnabled() {
    return false;
  });
  defineValue(Navigator.prototype, "getBattery", function getBattery() {
    return Promise.resolve(seed.battery || {
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1
    });
  });

  if (protector && protector.repairFunctionMeta) {
    protector.repairFunctionMeta(Navigator, { name: "Navigator", length: 0 });
    protector.repairFunctionMeta(Navigator.prototype.javaEnabled, { name: "javaEnabled", length: 0 });
    protector.repairFunctionMeta(Navigator.prototype.getBattery, { name: "getBattery", length: 0 });
  }
  if (protector && protector.protectFunction) {
    protector.protectFunction(Navigator, "Navigator");
    protector.protectFunction(Navigator.prototype.javaEnabled, "javaEnabled");
    protector.protectFunction(Navigator.prototype.getBattery, "getBattery");
  }

  defineValue(navigatorInstance, Symbol.toStringTag, "Navigator");
  Object.defineProperty(globalObject, "Navigator", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: Navigator
  });
  Object.defineProperty(globalObject, "navigator", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: navigatorInstance
  });

  return navigatorInstance;
})(typeof globalThis !== "undefined" ? globalThis : window);
`;
}

function buildNavigatorModule(seed = {}) {
  const module = scaffoldModule("navigator-module");
  const normalizedSeed = normalizeNavigatorSeed(seed);
  const pluginGraph = buildPluginGraph({
    plugins: normalizedSeed.plugins,
    mimeTypes: normalizedSeed.mimeTypes,
  });

  module.patchPlan = [
    "构建 Navigator 构造器、prototype 和 navigator 实例。",
    "把 userAgent/language/webdriver 等高频字段补成 prototype getter，而不是直接灌到实例上。",
    "把 plugins/mimeTypes 构造成类数组图结构，并补 getBattery/userAgentData 等高频检测点。",
  ];
  module.patchCode = renderNavigatorPatch(normalizedSeed);
  module.runtimeState = {
    navigator: normalizedSeed.navigator,
    plugins: pluginGraph.pluginArray,
    mimeTypes: pluginGraph.mimeTypeArray,
    battery: normalizedSeed.battery,
  };
  module.validation = [
    "检查 navigator.webdriver === false。",
    "检查 navigator.plugins.length 与 navigator.mimeTypes.length。",
    "检查 navigator.plugins.item(0) / namedItem(name) 与 mimeTypes.enabledPlugin 关系。",
    "检查 navigator.getBattery() 返回 Promise。",
    "检查 Navigator.prototype 上 getter 的描述符与 toString 保护是否生效。",
  ];
  module.residualRisk = [
    "这里只覆盖常见字段与图结构，未实现 permissions、mediaDevices、bluetooth 等更深层能力对象。",
    "如果目标脚本会校验 brands/mobile/platformVersion 等 userAgentData 细节，仍需真实浏览器种子。",
  ];

  return module;
}

module.exports = {
  buildNavigatorModule,
  normalizeNavigatorSeed,
};
