const { scaffoldModule } = require("./scaffold-module");

const DEFAULT_SUBTLE_METHODS = [
  "digest",
  "generateKey",
  "importKey",
  "exportKey",
  "sign",
  "verify",
  "encrypt",
  "decrypt",
];

function toFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeCryptoSeed(seed = {}) {
  const cryptoSeed = seed.crypto && typeof seed.crypto === "object" ? seed.crypto : seed;
  return {
    exposeCrypto: cryptoSeed.exposeCrypto !== false,
    installMsCrypto: cryptoSeed.installMsCrypto !== false,
    maxGetRandomValuesLength: toFiniteNumber(cryptoSeed.maxGetRandomValuesLength, 65536),
    hasSubtle: cryptoSeed.hasSubtle !== false,
    subtleMethods: Array.isArray(cryptoSeed.subtleMethods) && cryptoSeed.subtleMethods.length
      ? cryptoSeed.subtleMethods.slice()
      : DEFAULT_SUBTLE_METHODS.slice(),
    randomValues: Array.isArray(cryptoSeed.randomValues)
      ? cryptoSeed.randomValues.map((item) => Number(item) & 255)
      : [],
  };
}

function renderCryptoPatch(seed) {
  const serializedSeed = JSON.stringify(seed, null, 2);
  return `(
function installCryptoModule(globalObject) {
  const seed = ${serializedSeed};
  const protector = globalObject.__envNativeProtector || null;
  const integerArrayTags = new Set([
    "[object Int8Array]",
    "[object Uint8Array]",
    "[object Uint8ClampedArray]",
    "[object Int16Array]",
    "[object Uint16Array]",
    "[object Int32Array]",
    "[object Uint32Array]"
  ]);
  const randomPool = Array.isArray(seed.randomValues) ? seed.randomValues.slice() : [];

  function defineValue(target, key, value) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: value
    });
  }

  function createQuotaError(message) {
    if (typeof DOMException === "function") {
      return new DOMException(message, "QuotaExceededError");
    }
    const error = new Error(message);
    error.name = "QuotaExceededError";
    return error;
  }

  function assertIntegerTypedArray(view) {
    const tag = Object.prototype.toString.call(view);
    if (!integerArrayTags.has(tag)) {
      throw new TypeError("Failed to execute 'getRandomValues' on 'Crypto': parameter 1 is not an integer array view.");
    }
    if (view.byteLength > seed.maxGetRandomValuesLength) {
      throw createQuotaError("Failed to execute 'getRandomValues' on 'Crypto': The ArrayBufferView's byte length exceeds the number of bytes of entropy available via this API.");
    }
    return view;
  }

  function nextByte(index) {
    if (randomPool.length) {
      return randomPool[index % randomPool.length] & 255;
    }
    return (index * 73 + 19) & 255;
  }

  function getRandomValues(view) {
    assertIntegerTypedArray(view);
    for (let index = 0; index < view.length; index += 1) {
      view[index] = nextByte(index);
    }
    return view;
  }

  const subtle = {};
  for (const methodName of seed.subtleMethods) {
    subtle[methodName] = function subtlePlaceholder() {
      return Promise.reject(new Error("SubtleCrypto method not implemented: " + methodName));
    };
    if (protector && protector.repairFunctionMeta) {
      protector.repairFunctionMeta(subtle[methodName], { name: methodName, length: 0 });
    }
    if (protector && protector.protectFunction) {
      protector.protectFunction(subtle[methodName], methodName);
    }
  }

  const cryptoObject = {};
  defineValue(cryptoObject, "getRandomValues", getRandomValues);
  if (seed.hasSubtle) {
    defineValue(cryptoObject, "subtle", subtle);
  }

  if (protector && protector.repairFunctionMeta) {
    protector.repairFunctionMeta(getRandomValues, { name: "getRandomValues", length: 1 });
  }
  if (protector && protector.protectFunction) {
    protector.protectFunction(getRandomValues, "getRandomValues");
  }

  if (seed.exposeCrypto) {
    Object.defineProperty(globalObject, "crypto", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: cryptoObject
    });
  }

  if (seed.installMsCrypto) {
    Object.defineProperty(globalObject, "msCrypto", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: cryptoObject
    });
  }

  return cryptoObject;
})(typeof globalThis !== "undefined" ? globalThis : window);
`;
}

function buildCryptoModule(seed = {}, options = {}) {
  const module = scaffoldModule("crypto-module");
  const normalizedSeed = normalizeCryptoSeed(seed);

  module.patchPlan = [
    "挂载 window.crypto 与可选的 window.msCrypto。",
    "按种子构建 getRandomValues，并复刻整数 TypedArray 校验和长度上限。",
    "按模块契约补出 subtle 对象的基础方法占位，并接入 native 保护接口。",
  ];

  module.patchCode = renderCryptoPatch(normalizedSeed, options);
  module.runtimeState = {
    crypto: normalizedSeed,
  };
  module.validation = [
    "调用 crypto.getRandomValues(new Uint8Array(16))，确认返回原数组实例。",
    "调用 crypto.getRandomValues(new Uint16Array(8)) 与 new Uint32Array(4)。",
    "传入 Float32Array 时应抛出 TypeError。",
    "传入超出 maxGetRandomValuesLength 的视图时应抛出 QuotaExceededError。",
    "检查 crypto.getRandomValues.toString() 与 crypto.getRandomValues.name/length。",
  ];
  module.residualRisk = [
    "subtle 仍为占位实现，只适合绕过存在性检测，不适合真实密码流程。",
    "如果目标站点会比对 DOMException message/code，仍需依据真实浏览器日志继续收敛。",
  ];

  if (options.includeLegacyAlias === false) {
    module.runtimeState.crypto.installMsCrypto = false;
  }

  return module;
}

module.exports = {
  buildCryptoModule,
  normalizeCryptoSeed,
};
