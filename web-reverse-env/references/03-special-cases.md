# 特殊检测点与高强度模块

优先用于这些场景：

- `document.all`
- native `toString`
- `toString.toString`
- 栈与异常检测
- `window.crypto.getRandomValues`
- `performance.timing`
- `RTCPeerConnection`
- `AudioContext` / `OfflineAudioContext`
- `Worker` / `SharedWorker`
- `Math` 精度差异

## 1. `document.all`

把它视为特殊对象，不要当普通属性补。

优先分成三条路线：

- `native-addon`
- `v8-api`
- `fallback`

验证至少包括：

- `== undefined`
- `=== undefined`
- `typeof`
- 调用行为

## 2. native `toString`

如果站点在这些点报错或暴露：

- `fn.toString()`
- `fn.toString.toString()`
- getter / setter `toString`

优先使用 [protect-native.js](../scripts/protect-native.js)。

## 3. 栈与异常检测

重点关注：

- `evalmachine.<anonymous>`
- Node 内部栈帧
- 包装函数名泄露
- 文件名不真实

如果只是“看起来像能跑”，但栈还露 Node 痕迹，不算补完。

## 4. `crypto-module`

至少考虑：

- `window.crypto`
- `window.msCrypto`
- `getRandomValues`
- typed array 类型校验
- 长度超限异常

## 5. `performance-module`

至少考虑：

- `performance.now`
- `performance.timeOrigin`
- `performance.timing`
- 字段时间顺序一致性

## 6. `webrtc-module`

至少考虑：

- `RTCPeerConnection`
- `RTCRtpSender`
- `RTCRtpReceiver`
- `createDataChannel`
- `createOffer`
- `onicecandidate`

## 7. `audio-fingerprint-module`

至少考虑：

- `AudioContext`
- `OfflineAudioContext`
- `AudioBuffer`
- `getChannelData`

## 8. `worker-module`

至少考虑：

- `Worker`
- `SharedWorker`
- `MessagePort`
- `postMessage`
- `onmessage`

## 9. `math-precision-module`

如果用户遇到 wasm、验证码或国外风控，额外警惕：

- 精度差异
- 浏览器 / Node 数值结果不一致

这类问题不是简单补对象能解决的。
