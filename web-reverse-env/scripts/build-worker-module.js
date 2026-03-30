const { scaffoldModule } = require("./scaffold-module");

function normalizeWorkerSeed(seed = {}) {
  const workerSeed = seed.worker && typeof seed.worker === "object" ? seed.worker : seed;
  return {
    scriptBaseUrl: workerSeed.scriptBaseUrl || "https://example.invalid/assets/",
    inlineScripts: Object.assign({}, workerSeed.inlineScripts || {}),
    sharedWorkerName: workerSeed.sharedWorkerName || "env-shared-worker",
    broadcastChannels: Array.isArray(workerSeed.broadcastChannels)
      ? workerSeed.broadcastChannels.slice()
      : ["env-sync"],
  };
}

function renderWorkerPatch(seed) {
  const serializedSeed = JSON.stringify(seed, null, 2);
  return `(
function installWorkerModule(globalObject) {
  const seed = ${serializedSeed};
  const protector = globalObject.__envNativeProtector || null;
  const sharedChannels = Object.create(null);

  function applyEventTarget(target) {
    target._listeners = Object.create(null);
    target.addEventListener = function addEventListener(type, listener) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(listener);
    };
    target.removeEventListener = function removeEventListener(type, listener) {
      const list = this._listeners[type] || [];
      this._listeners[type] = list.filter(function filterItem(item) {
        return item !== listener;
      });
    };
    target.dispatchEvent = function dispatchEvent(event) {
      const list = (this._listeners[event.type] || []).slice();
      for (const listener of list) listener.call(this, event);
      const handler = this["on" + event.type];
      if (typeof handler === "function") handler.call(this, event);
      return true;
    };
  }

  function createMessageEvent(data) {
    return { type: "message", data: data };
  }

  function MessagePort() {
    applyEventTarget(this);
    this._entangledPort = null;
    this._started = false;
  }

  MessagePort.prototype.postMessage = function postMessage(data) {
    if (this._entangledPort) this._entangledPort.dispatchEvent(createMessageEvent(data));
  };
  MessagePort.prototype.start = function start() {
    this._started = true;
  };
  MessagePort.prototype.close = function close() {
    this._entangledPort = null;
    this._started = false;
  };

  function createMessageChannel() {
    const port1 = new MessagePort();
    const port2 = new MessagePort();
    port1._entangledPort = port2;
    port2._entangledPort = port1;
    return { port1: port1, port2: port2 };
  }

  function Worker(scriptUrl) {
    applyEventTarget(this);
    this.scriptURL = scriptUrl || "";
    this.baseUrl = seed.scriptBaseUrl;
    this.inlineSource = seed.inlineScripts[scriptUrl] || "";
  }

  Worker.prototype.postMessage = function postMessage(data) {
    this.dispatchEvent(createMessageEvent(data));
  };
  Worker.prototype.terminate = function terminate() {
    this._terminated = true;
  };

  function SharedWorker(scriptUrl, name) {
    applyEventTarget(this);
    this.scriptURL = scriptUrl || "";
    this.name = name || seed.sharedWorkerName;
    const channel = createMessageChannel();
    this.port = channel.port1;
    this._workerPort = channel.port2;
  }

  function BroadcastChannel(name) {
    applyEventTarget(this);
    this.name = name || "";
    if (!sharedChannels[this.name]) sharedChannels[this.name] = [];
    sharedChannels[this.name].push(this);
  }

  BroadcastChannel.prototype.postMessage = function postMessage(data) {
    const peers = sharedChannels[this.name] || [];
    for (const peer of peers) {
      if (peer !== this) peer.dispatchEvent(createMessageEvent(data));
    }
  };
  BroadcastChannel.prototype.close = function close() {
    const peers = sharedChannels[this.name] || [];
    sharedChannels[this.name] = peers.filter(function filterPeer(item) {
      return item !== this;
    }, this);
  };

  if (protector && protector.repairFunctionMeta) {
    protector.repairFunctionMeta(MessagePort, { name: "MessagePort", length: 0 });
    protector.repairFunctionMeta(Worker, { name: "Worker", length: 1 });
    protector.repairFunctionMeta(SharedWorker, { name: "SharedWorker", length: 2 });
    protector.repairFunctionMeta(BroadcastChannel, { name: "BroadcastChannel", length: 1 });
  }
  if (protector && protector.protectFunction) {
    protector.protectFunction(MessagePort, "MessagePort");
    protector.protectFunction(Worker, "Worker");
    protector.protectFunction(SharedWorker, "SharedWorker");
    protector.protectFunction(BroadcastChannel, "BroadcastChannel");
  }

  Object.defineProperty(globalObject, "MessagePort", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: MessagePort
  });
  Object.defineProperty(globalObject, "MessageChannel", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function MessageChannel() {
      return createMessageChannel();
    }
  });
  Object.defineProperty(globalObject, "Worker", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: Worker
  });
  Object.defineProperty(globalObject, "SharedWorker", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: SharedWorker
  });
  Object.defineProperty(globalObject, "BroadcastChannel", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: BroadcastChannel
  });

  return { Worker: Worker, SharedWorker: SharedWorker, BroadcastChannel: BroadcastChannel };
})(typeof globalThis !== "undefined" ? globalThis : window);
`;
}

function buildWorkerModule(seed = {}) {
  const module = scaffoldModule("worker-module");
  const normalizedSeed = normalizeWorkerSeed(seed);

  module.patchPlan = [
    "补出 Worker/SharedWorker/MessagePort/MessageChannel/BroadcastChannel 构造器。",
    "用最小事件系统模拟 postMessage/onmessage 通路。",
    "把 worker 脚本路径、inline source、广播频道名称外置为种子，而不是写死在补丁里。",
  ];
  module.patchCode = renderWorkerPatch(normalizedSeed);
  module.runtimeState = { worker: normalizedSeed };
  module.validation = [
    "检查 typeof Worker/SharedWorker/BroadcastChannel === 'function'。",
    "执行 new Worker('/worker.js').postMessage({ping:1})，确认 message 事件能被触发。",
    "执行 new SharedWorker('/shared.js').port.postMessage('x')，确认端口存在。",
    "执行两个同名 BroadcastChannel 互发消息，确认消息广播通路正常。",
  ];
  module.residualRisk = [
    "这里只模拟消息通路，不提供真实线程、importScripts、URL.createObjectURL 等完整能力。",
    "若目标站点依赖 Worker 全局作用域、自定义事件循环或二进制消息通路，仍需继续扩展。",
  ];

  return module;
}

module.exports = {
  buildWorkerModule,
  normalizeWorkerSeed,
};
