const { scaffoldModule } = require("./scaffold-module");

function toFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function cloneRecord(value) {
  return Object.assign({}, value || {});
}

function normalizePerformanceSeed(seed = {}) {
  const performanceSeed = seed.performance && typeof seed.performance === "object" ? seed.performance : seed;
  const navigationStart = toFiniteNumber(performanceSeed.navigationStart, Date.now());
  const timeOrigin = toFiniteNumber(performanceSeed.timeOrigin, navigationStart);
  const nowOffset = toFiniteNumber(performanceSeed.nowOffset, 12.345);
  const timing = cloneRecord(performanceSeed.timing);

  if (!Number.isFinite(timing.navigationStart)) timing.navigationStart = navigationStart;
  if (!Number.isFinite(timing.fetchStart)) timing.fetchStart = timing.navigationStart;
  if (!Number.isFinite(timing.domainLookupStart)) timing.domainLookupStart = timing.fetchStart + 1;
  if (!Number.isFinite(timing.domainLookupEnd)) timing.domainLookupEnd = timing.domainLookupStart + 1;
  if (!Number.isFinite(timing.connectStart)) timing.connectStart = timing.domainLookupEnd;
  if (!Number.isFinite(timing.connectEnd)) timing.connectEnd = timing.connectStart + 2;
  if (!Number.isFinite(timing.requestStart)) timing.requestStart = timing.connectEnd + 1;
  if (!Number.isFinite(timing.responseStart)) timing.responseStart = timing.requestStart + 4;
  if (!Number.isFinite(timing.responseEnd)) timing.responseEnd = timing.responseStart + 4;
  if (!Number.isFinite(timing.domLoading)) timing.domLoading = timing.responseEnd + 2;
  if (!Number.isFinite(timing.domInteractive)) timing.domInteractive = timing.domLoading + 5;
  if (!Number.isFinite(timing.domContentLoadedEventStart)) timing.domContentLoadedEventStart = timing.domInteractive + 1;
  if (!Number.isFinite(timing.domContentLoadedEventEnd)) timing.domContentLoadedEventEnd = timing.domContentLoadedEventStart + 1;
  if (!Number.isFinite(timing.domComplete)) timing.domComplete = timing.domContentLoadedEventEnd + 5;
  if (!Number.isFinite(timing.loadEventStart)) timing.loadEventStart = timing.domComplete + 1;
  if (!Number.isFinite(timing.loadEventEnd)) timing.loadEventEnd = timing.loadEventStart + 1;

  return {
    timeOrigin,
    navigationStart,
    nowOffset,
    timing,
    memory: cloneRecord(performanceSeed.memory),
  };
}

function renderPerformancePatch(seed) {
  const serializedSeed = JSON.stringify(seed, null, 2);
  return `(
function installPerformanceModule(globalObject) {
  const seed = ${serializedSeed};
  const protector = globalObject.__envNativeProtector || null;
  const baseEpoch = Date.now();
  const monotonicStart = seed.nowOffset;
  let tick = 0;

  function nextNow() {
    tick += 1;
    return monotonicStart + (Date.now() - baseEpoch) + tick * 0.01;
  }

  function now() {
    return Number(nextNow().toFixed(3));
  }

  function clearMarks() {
    return undefined;
  }

  function clearMeasures() {
    return undefined;
  }

  function getEntries() {
    return [];
  }

  function getEntriesByType() {
    return [];
  }

  function getEntriesByName() {
    return [];
  }

  const performanceObject = {
    now: now,
    timeOrigin: seed.timeOrigin,
    timing: seed.timing,
    clearMarks: clearMarks,
    clearMeasures: clearMeasures,
    getEntries: getEntries,
    getEntriesByType: getEntriesByType,
    getEntriesByName: getEntriesByName,
    mark: function mark() {},
    measure: function measure() {}
  };

  if (seed.memory && Object.keys(seed.memory).length) {
    performanceObject.memory = seed.memory;
  }

  if (protector && protector.repairFunctionMeta) {
    protector.repairFunctionMeta(now, { name: "now", length: 0 });
    protector.repairFunctionMeta(clearMarks, { name: "clearMarks", length: 0 });
    protector.repairFunctionMeta(clearMeasures, { name: "clearMeasures", length: 0 });
    protector.repairFunctionMeta(getEntries, { name: "getEntries", length: 0 });
    protector.repairFunctionMeta(getEntriesByType, { name: "getEntriesByType", length: 1 });
    protector.repairFunctionMeta(getEntriesByName, { name: "getEntriesByName", length: 1 });
  }
  if (protector && protector.protectFunction) {
    protector.protectFunction(now, "now");
    protector.protectFunction(clearMarks, "clearMarks");
    protector.protectFunction(clearMeasures, "clearMeasures");
    protector.protectFunction(getEntries, "getEntries");
    protector.protectFunction(getEntriesByType, "getEntriesByType");
    protector.protectFunction(getEntriesByName, "getEntriesByName");
  }

  Object.defineProperty(globalObject, "performance", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: performanceObject
  });

  return performanceObject;
})(typeof globalThis !== "undefined" ? globalThis : window);
`;
}

function buildPerformanceModule(seed = {}) {
  const module = scaffoldModule("performance-module");
  const normalizedSeed = normalizePerformanceSeed(seed);

  module.patchPlan = [
    "构建 timeOrigin/navigationStart/timing 基础树。",
    "补出单调递增的 performance.now()。",
    "为 getEntries/getEntriesByType/getEntriesByName 等常见检测点提供稳定返回。",
  ];
  module.patchCode = renderPerformancePatch(normalizedSeed);
  module.runtimeState = {
    performance: normalizedSeed,
  };
  module.validation = [
    "连续两次调用 performance.now()，确认返回值递增。",
    "检查 performance.timeOrigin 与 performance.timing.navigationStart 的相对关系。",
    "检查 performance.getEntries()/getEntriesByType()/getEntriesByName() 返回数组。",
    "检查 performance.now.toString() 以及 name/length 元信息。",
  ];
  module.residualRisk = [
    "未实现 PerformanceObserver、resource timing、navigation entries 等复杂链路。",
    "如果目标脚本会校验 performance.memory 或多阶段时间戳分布，仍需采集真实浏览器种子。",
  ];

  return module;
}

module.exports = {
  buildPerformanceModule,
  normalizePerformanceSeed,
};
