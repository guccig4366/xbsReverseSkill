# 当前补环境草稿的遗漏点

这份文档不是重新讲补环境，而是专门检查当前 `H:\CodeSpace\AiReverse\Web\env\codex` 这套草稿资源还缺什么。

结论先说：

- 现在已经有“原型链 / native / 描述符 / navigator / document / storage / 指纹 / Proxy”的主骨架
- 但如果目标是未来真的做成可复用 skill，仍然缺一批高频检测点、配套脚本和验证资源
- 这些遗漏里，最关键的不是再补几个字段，而是补“跨对象关系、异步对象、网络对象、时序与指纹一致性”

## 1. 当前草稿已经覆盖到的重点

现有文档和脚本已经比较明确地覆盖了：

- 原型链分层
- native `toString`
- getter / setter / 描述符保护
- `navigator`
- `document`
- `localStorage` / `sessionStorage`
- `canvas` / `WebGL`
- Proxy 吐环境
- `document.all`
- 堆栈清洗的设计入口

这部分作为 future skill 的第一层基础已经够用了。

## 2. 目前最重要的遗漏点

### 2.1 `window` 图关系还不完整

当前草稿里虽然提到了 `window/globalThis/self/top`，但还没有把下面这些关系单独模块化：

- `window.window === window`
- `self === window`
- `top / parent / frames`
- `frameElement`
- `opener`
- `document.defaultView`

这类点一旦补错，经常不是直接报错，而是通过一致性检测暴露。

### 2.2 事件系统还是空白区

现在还缺：

- `EventTarget`
- `Event`
- `UIEvent`
- `MouseEvent`
- `KeyboardEvent`
- `PointerEvent`
- `TouchEvent`
- `CustomEvent`
- `MessageEvent`

更重要的是缺这些行为细节：

- `isTrusted`
- `timeStamp`
- `target/currentTarget/srcElement`
- `addEventListener/removeEventListener/dispatchEvent`

很多风控和验证码环境，不是直接查 `navigator`，而是顺着事件系统走。

### 2.3 网络与通信对象几乎还没进草稿

当前最明显的遗漏之一就是：

- `XMLHttpRequest`
- `fetch`
- `Headers`
- `Request`
- `Response`
- `sendBeacon`
- `WebSocket`
- `EventSource`

你前面已经明确提过 `WebSocket`，但目前这套草稿里还没有把它真正升格成模块。

这会影响：

- 某些 cookie / token 写入链
- 某些 socket 协议站点
- 某些通过 `fetch/xhr` 挂钩的风控

### 2.4 Worker 只被提到了，但没形成模块

现在还缺完整设计：

- `Worker`
- `SharedWorker`
- `ServiceWorker`
- `postMessage`
- `MessageChannel`
- `BroadcastChannel`
- `structuredClone`

尤其是国外盾和新型验证码，越来越喜欢把检测逻辑拆进 Worker。

## 3. 指纹层面的明显遗漏

### 3.1 音频指纹还没单列

当前草稿重点放在 `canvas/WebGL`，但缺：

- `AudioContext`
- `OfflineAudioContext`
- `AudioBuffer`
- 常见音频指纹链路

这点在新型验证码和国外风控里非常常见。

### 3.2 字体指纹还没单列

当前文档里虽然提到“字体”，但还没有形成独立模块。

应该至少考虑：

- 浏览器侧字体枚举导出
- 文本测量差异
- `canvas` 字体渲染一致性

### 3.3 WebRTC 还没进入模块清单

目前还缺：

- `RTCPeerConnection`
- `RTCRtpSender`
- `RTCRtpReceiver`
- 相关候选、能力和属性检测

这类点不一定每个站都用，但一旦碰到就是高优先级。

### 3.4 `Math` / 引擎精度差异没有单独建模

现在草稿里还没有明确：

- 浏览器与 Node 的 `Math` 精度差异
- 不同引擎浮点实现差异

这点在高级风控和 wasm/验证码里会被拿来做环境分辨。

## 4. 浏览器能力对象的遗漏

下面这批对象在当前草稿里还比较弱或者没展开：

- `permissions.query`
- `Notification.permission`
- `mediaDevices`
- `enumerateDevices`
- `getUserMedia`
- `clipboard`
- `geolocation`
- `Bluetooth`
- `USB`
- `HID`
- `serial`
- `xr`

原因不是它们每次都必须补，而是：

- 很多站点会把它们当“是否为真浏览器”的探针
- 很多国外站点喜欢同时读多个能力对象做一致性判断

## 5. 时间、地区、编码对象的遗漏

这一块目前也不够：

- `Intl`
- 时区
- `Date`
- `performance`
- `performance.now`
- `performance.timeOrigin`
- `navigation timing`
- `TextEncoder`
- `TextDecoder`
- `atob`
- `btoa`
- `URL`
- `URLSearchParams`
- `crypto.getRandomValues`
- `crypto.subtle`

如果 future skill 以后要更稳，这些不能长期缺位。

## 6. DOM 结构与样式系统的遗漏

当前 `document` 方向有骨架，但还缺完整 DOM 系统设计：

- `Node`
- `Element`
- `HTMLElement`
- `HTMLDivElement`
- `HTMLCanvasElement`
- `DOMParser`
- `XMLSerializer`
- `MutationObserver`
- `CSSStyleDeclaration`
- `classList`
- `dataset`
- `style`
- `getAttribute/setAttribute`

很多补环境失败并不是 BOM 对象缺，而是 DOM 返回值长得不像真浏览器。

## 7. 现有脚本本身的遗漏

### 7.1 `collect-browser-env.js` 采集面还不够

现在它能采集：

- `navigator`
- `document`
- `screen`
- `history`
- `location`
- `storage`
- 基础 `canvas/webgl`

但还没采：

- `plugins`
- `mimeTypes`
- `permissions`
- `Notification.permission`
- `mediaDevices`
- `battery`
- `AudioContext`
- 字体样本
- `performance`
- `Intl/timezone`
- `document.all` 特征

### 7.2 `observe-runtime.js` 还偏轻量

现在能做基础 Proxy 观察，但还不够：

- 缺路径频次统计
- 缺按对象分类的聚合结果
- 缺“读取返回 undefined”与“调用抛错”联动分析
- 缺输出到 JSON 的稳定格式
- 缺针对 `apply/construct` 的细化报告

### 7.3 `protect-native.js` 还只是底座雏形

现在能做：

- `Function.prototype.toString`
- getter / setter 基础保护
- `name` / `length` 修正

但还没做全：

- `prototype` 描述符修正
- `Symbol.toStringTag` 联动
- 针对 Proxy 包裹后函数的处理
- 多层包装后的 native 串一致性

## 8. blueprint 里提到但尚未补齐的资源

当前 blueprint 里已经提到，但实际文件还没有落地的有：

### 8.1 `references`

- `03-special-cases.md`
- `07-source-map.md`
- `06-validation.md`

### 8.2 `scripts`

- `build-plugin-graph.js`
- `merge-storage-state.js`
- `scaffold-module.js`

### 8.3 `assets`

- `navigator-sample.example.json`
- `plugin-graph.example.json`
- `storage-state.example.json`

这说明现在的草稿已经到了“该从设计走向半成品”的阶段。

## 9. 最该优先补的遗漏顺序

如果按未来 skill 的实用性排序，我建议优先级如下：

1. `window/self/top/parent/defaultView/opener` 一致性
2. `WebSocket` / `fetch` / `XMLHttpRequest`
3. `Worker` / `SharedWorker` / `postMessage`
4. `permissions` / `mediaDevices` / `Notification`
5. `AudioContext` / 字体指纹 / `WebRTC`
6. `Intl` / `performance` / `crypto`
7. 完整 DOM / Event 系统

## 10. 当前最稳的判断

现在这套 `codex` 目录已经不再是“零散笔记”，而是一套成型中的 skill 设计草稿。

但如果要迈过“能跑 Demo”到“能抗检测”的门槛，后续最应该补的不是更多 `navigator.xxx = ...`，而是：

- 跨对象关系
- 异步与通信对象
- 网络对象
- 时间与地区一致性
- 音频 / 字体 / WebRTC 等更深层指纹
- 验证与回归资源
