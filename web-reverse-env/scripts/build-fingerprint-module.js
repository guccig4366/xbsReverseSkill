const { scaffoldModule } = require("./scaffold-module");

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeFingerprintSeed(seed = {}) {
  return {
    fingerprint: clone(seed.fingerprint || {}),
    screen: clone(seed.screen || {}),
    windowMetrics: clone(seed.windowMetrics || {}),
    battery: clone(seed.battery || {}),
    navigator: clone(seed.navigator || {}),
  };
}

function renderFingerprintPatch(seed) {
  const serializedSeed = JSON.stringify(seed, null, 2);
  return `(
function installFingerprintModule(globalObject) {
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

  function Screen() {}
  const screenState = Object.assign({
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    colorDepth: 24,
    pixelDepth: 24
  }, seed.screen || {});
  const screenInstance = Object.create(Screen.prototype);

  ["width", "height", "availWidth", "availHeight", "colorDepth", "pixelDepth", "availLeft", "availTop"].forEach(function eachKey(key) {
    defineGetter(Screen.prototype, key, function getScreenValue() {
      return screenState[key];
    });
  });

  function createCanvas2DContext() {
    return {
      fillRect: function fillRect() {},
      clearRect: function clearRect() {},
      fillText: function fillText() {},
      measureText: function measureText(text) {
        return { width: String(text || "").length * 7.25 };
      }
    };
  }

  function WebGLRenderingContext() {}
  defineValue(WebGLRenderingContext.prototype, "getParameter", function getParameter(param) {
    if (param === 37445) {
      return seed.fingerprint.webglVendor || "Google Inc.";
    }
    if (param === 37446) {
      return seed.fingerprint.webglRenderer || "ANGLE";
    }
    return null;
  });

  function createWebGLContext() {
    return Object.create(WebGLRenderingContext.prototype);
  }

  function HTMLCanvasElement() {
    this.width = 300;
    this.height = 150;
    this.__lastContextType__ = "";
  }

  defineValue(HTMLCanvasElement.prototype, "getContext", function getContext(type) {
    this.__lastContextType__ = String(type || "");
    if (type === "2d") {
      return createCanvas2DContext();
    }
    if (type === "webgl" || type === "experimental-webgl") {
      return createWebGLContext();
    }
    return null;
  });
  defineValue(HTMLCanvasElement.prototype, "toDataURL", function toDataURL() {
    if (this.__lastContextType__ === "webgl" || this.__lastContextType__ === "experimental-webgl") {
      return seed.fingerprint.canvasWebglDataUrl || seed.fingerprint.canvas2dDataUrl || "data:image/png;base64,";
    }
    return seed.fingerprint.canvas2dDataUrl || "data:image/png;base64,";
  });
  defineValue(HTMLCanvasElement.prototype, "toBlob", function toBlob(callback) {
    if (typeof callback === "function") {
      callback({
        type: "image/png",
        size: (seed.fingerprint.canvas2dDataUrl || "").length
      });
    }
  });

  defineValue(globalObject, "__envCreateCanvasElement", function __envCreateCanvasElement() {
    return new HTMLCanvasElement();
  });

  if (globalObject.navigator) {
    const navigatorProto = Object.getPrototypeOf(globalObject.navigator);
    if (navigatorProto && !Object.getOwnPropertyDescriptor(navigatorProto, "getBattery")) {
      defineValue(navigatorProto, "getBattery", function getBattery() {
        return Promise.resolve(Object.assign({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1
        }, seed.battery || {}));
      });
      if (protector && protector.repairFunctionMeta) {
        protector.repairFunctionMeta(navigatorProto.getBattery, { name: "getBattery", length: 0 });
      }
      if (protector && protector.protectFunction) {
        protector.protectFunction(navigatorProto.getBattery, "getBattery");
      }
    }
  }

  Object.keys(seed.windowMetrics || {}).forEach(function eachMetric(key) {
    Object.defineProperty(globalObject, key, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: seed.windowMetrics[key]
    });
  });

  if (protector && protector.repairFunctionMeta) {
    protector.repairFunctionMeta(Screen, { name: "Screen", length: 0 });
    protector.repairFunctionMeta(WebGLRenderingContext, { name: "WebGLRenderingContext", length: 0 });
    protector.repairFunctionMeta(HTMLCanvasElement, { name: "HTMLCanvasElement", length: 0 });
    protector.repairFunctionMeta(HTMLCanvasElement.prototype.getContext, { name: "getContext", length: 1 });
    protector.repairFunctionMeta(HTMLCanvasElement.prototype.toDataURL, { name: "toDataURL", length: 0 });
  }
  if (protector && protector.protectFunction) {
    protector.protectFunction(Screen, "Screen");
    protector.protectFunction(WebGLRenderingContext, "WebGLRenderingContext");
    protector.protectFunction(HTMLCanvasElement, "HTMLCanvasElement");
    protector.protectFunction(HTMLCanvasElement.prototype.getContext, "getContext");
    protector.protectFunction(HTMLCanvasElement.prototype.toDataURL, "toDataURL");
  }

  Object.defineProperty(globalObject, "Screen", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: Screen
  });
  Object.defineProperty(globalObject, "screen", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: screenInstance
  });
  Object.defineProperty(globalObject, "WebGLRenderingContext", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: WebGLRenderingContext
  });
  Object.defineProperty(globalObject, "HTMLCanvasElement", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: HTMLCanvasElement
  });

  return {
    screen: screenInstance,
    HTMLCanvasElement: HTMLCanvasElement
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
`;
}

function buildFingerprintModule(seed = {}) {
  const module = scaffoldModule("fingerprint-module");
  const normalizedSeed = normalizeFingerprintSeed(seed);

  module.patchPlan = [
    "构建 Screen、HTMLCanvasElement、WebGLRenderingContext 等高频指纹对象壳。",
    "把 canvas 2d / webgl 的入口统一到 getContext/toDataURL/getParameter。",
    "把 screen 尺寸、windowMetrics 和 battery Promise 一起收敛到统一指纹种子。",
  ];
  module.patchCode = renderFingerprintPatch(normalizedSeed);
  module.runtimeState = normalizedSeed;
  module.validation = [
    "检查 screen.width / height / availWidth / availHeight。",
    "检查 document.createElement('canvas').getContext('2d') / getContext('webgl')。",
    "检查 canvas.toDataURL() 与 webgl getParameter(37445/37446)。",
    "检查 navigator.getBattery() 返回 Promise 且值来自种子。",
    "检查 devicePixelRatio / innerWidth / outerWidth 等窗口尺寸指标。",
  ];
  module.residualRisk = [
    "这里只覆盖常见 canvas/WebGL/battery/screen 检测点，未实现音频指纹、字体指纹和 OffscreenCanvas。",
    "如果目标站点会校验扩展列表、着色器精度或更复杂的渲染链，仍需继续收集真实浏览器结果。",
  ];

  return module;
}

module.exports = {
  buildFingerprintModule,
  normalizeFingerprintSeed,
};
