const { scaffoldModule } = require("./scaffold-module");

function normalizeRtcCandidate(candidate = {}) {
  return {
    candidate: candidate.candidate || "candidate:842163049 1 udp 1677729535 0.0.0.0 9 typ host generation 0 ufrag env network-id 1",
    sdpMid: candidate.sdpMid || "0",
    sdpMLineIndex: Number.isFinite(candidate.sdpMLineIndex) ? candidate.sdpMLineIndex : 0,
    usernameFragment: candidate.usernameFragment || "env",
  };
}

function normalizeWebrtcSeed(seed = {}) {
  const webrtcSeed = seed.webrtc && typeof seed.webrtc === "object" ? seed.webrtc : seed;
  return {
    allowCandidateLeak: webrtcSeed.allowCandidateLeak === true,
    iceTransportPolicy: webrtcSeed.iceTransportPolicy || "all",
    bundlePolicy: webrtcSeed.bundlePolicy || "balanced",
    rtcpMuxPolicy: webrtcSeed.rtcpMuxPolicy || "require",
    defaultOfferSdp: webrtcSeed.defaultOfferSdp || "v=0\\r\\no=- 0 0 IN IP4 127.0.0.1\\r\\ns=env-codex-offer\\r\\nt=0 0\\r\\n",
    defaultAnswerSdp: webrtcSeed.defaultAnswerSdp || "v=0\\r\\no=- 0 0 IN IP4 127.0.0.1\\r\\ns=env-codex-answer\\r\\nt=0 0\\r\\n",
    iceCandidates: Array.isArray(webrtcSeed.iceCandidates) && webrtcSeed.iceCandidates.length
      ? webrtcSeed.iceCandidates.map(normalizeRtcCandidate)
      : [normalizeRtcCandidate()],
  };
}

function renderWebrtcPatch(seed) {
  const serializedSeed = JSON.stringify(seed, null, 2);
  return `(
function installWebrtcModule(globalObject) {
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

  function RTCSessionDescription(init) {
    init = init || {};
    this.type = init.type || "offer";
    this.sdp = init.sdp || "";
  }

  function RTCIceCandidate(init) {
    init = init || {};
    this.candidate = init.candidate || "";
    this.sdpMid = init.sdpMid || null;
    this.sdpMLineIndex = typeof init.sdpMLineIndex === "number" ? init.sdpMLineIndex : null;
    this.usernameFragment = init.usernameFragment || null;
  }

  function RTCDataChannel(label, dataChannelDict) {
    applyEventTarget(this);
    this.label = label || "";
    this.ordered = !dataChannelDict || dataChannelDict.ordered !== false;
    this.readyState = "open";
  }

  RTCDataChannel.prototype.send = function send(data) {
    this.lastPayload = data;
  };
  RTCDataChannel.prototype.close = function close() {
    this.readyState = "closed";
  };

  function RTCPeerConnection(configuration) {
    applyEventTarget(this);
    this.configuration = Object.assign({
      iceTransportPolicy: seed.iceTransportPolicy,
      bundlePolicy: seed.bundlePolicy,
      rtcpMuxPolicy: seed.rtcpMuxPolicy
    }, configuration || {});
    this.localDescription = null;
    this.remoteDescription = null;
    this.connectionState = "new";
    this.iceConnectionState = "new";
    this.signalingState = "stable";
  }

  RTCPeerConnection.prototype.createOffer = function createOffer() {
    return Promise.resolve(new RTCSessionDescription({ type: "offer", sdp: seed.defaultOfferSdp }));
  };
  RTCPeerConnection.prototype.createAnswer = function createAnswer() {
    return Promise.resolve(new RTCSessionDescription({ type: "answer", sdp: seed.defaultAnswerSdp }));
  };
  RTCPeerConnection.prototype.setLocalDescription = function setLocalDescription(description) {
    this.localDescription = description || null;
    this.signalingState = "have-local-offer";
    if (seed.allowCandidateLeak) {
      for (const candidateSeed of seed.iceCandidates) {
        this.dispatchEvent({ type: "icecandidate", candidate: new RTCIceCandidate(candidateSeed) });
      }
    }
    return Promise.resolve();
  };
  RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription(description) {
    this.remoteDescription = description || null;
    this.signalingState = "stable";
    return Promise.resolve();
  };
  RTCPeerConnection.prototype.addIceCandidate = function addIceCandidate(candidate) {
    this.lastIceCandidate = candidate || null;
    return Promise.resolve();
  };
  RTCPeerConnection.prototype.createDataChannel = function createDataChannel(label, dataChannelDict) {
    return new RTCDataChannel(label, dataChannelDict);
  };
  RTCPeerConnection.prototype.close = function close() {
    this.connectionState = "closed";
    this.iceConnectionState = "closed";
  };

  if (protector && protector.repairFunctionMeta) {
    protector.repairFunctionMeta(RTCSessionDescription, { name: "RTCSessionDescription", length: 1 });
    protector.repairFunctionMeta(RTCIceCandidate, { name: "RTCIceCandidate", length: 1 });
    protector.repairFunctionMeta(RTCPeerConnection, { name: "RTCPeerConnection", length: 1 });
    protector.repairFunctionMeta(RTCDataChannel, { name: "RTCDataChannel", length: 2 });
  }
  if (protector && protector.protectFunction) {
    protector.protectFunction(RTCSessionDescription, "RTCSessionDescription");
    protector.protectFunction(RTCIceCandidate, "RTCIceCandidate");
    protector.protectFunction(RTCPeerConnection, "RTCPeerConnection");
    protector.protectFunction(RTCDataChannel, "RTCDataChannel");
  }

  defineValue(globalObject, "RTCSessionDescription", RTCSessionDescription);
  defineValue(globalObject, "RTCIceCandidate", RTCIceCandidate);
  defineValue(globalObject, "RTCPeerConnection", RTCPeerConnection);
  defineValue(globalObject, "webkitRTCPeerConnection", RTCPeerConnection);
  defineValue(globalObject, "RTCDataChannel", RTCDataChannel);

  return { RTCPeerConnection: RTCPeerConnection, RTCDataChannel: RTCDataChannel };
})(typeof globalThis !== "undefined" ? globalThis : window);
`;
}

function buildWebrtcModule(seed = {}) {
  const module = scaffoldModule("webrtc-module");
  const normalizedSeed = normalizeWebrtcSeed(seed);

  module.patchPlan = [
    "补出 RTCPeerConnection / RTCSessionDescription / RTCIceCandidate / RTCDataChannel 构造器。",
    "为 createOffer/createAnswer/setLocalDescription/addIceCandidate/createDataChannel 提供 Promise 型基础实现。",
    "将 ICE candidate 是否泄露做成显式策略，而不是默认暴露本地网络信息。",
  ];
  module.patchCode = renderWebrtcPatch(normalizedSeed);
  module.runtimeState = { webrtc: normalizedSeed };
  module.validation = [
    "检查 typeof RTCPeerConnection === 'function'。",
    "执行 new RTCPeerConnection().createOffer()，确认返回 Promise。",
    "执行 createDataChannel('env')，确认返回对象且包含 send/close。",
    "在 allowCandidateLeak=false 时确认不会主动抛出真实候选信息。",
  ];
  module.residualRisk = [
    "这里只覆盖存在性检测和轻量行为检测，不提供真实音视频协商能力。",
    "若目标站点会校验 stats/transceiver/sender/receiver/track，仍需按真实浏览器继续扩展。",
  ];

  return module;
}

module.exports = {
  buildWebrtcModule,
  normalizeWebrtcSeed,
};
