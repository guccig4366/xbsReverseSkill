---
name: web-reverse-env
description: 面向 Web/JS 逆向中的浏览器补环境技能，覆盖 Proxy 吐环境、原型链修复、native toString 保护、描述符保护、navigator/document/storage/canvas/WebGL/crypto/performance/WebRTC/Worker 等模块化补环境分析与构建。用户明确提到“补环境”“浏览器环境模拟”“Proxy吐环境”“document.all”“webdriver”“plugins/mimeTypes”“指纹”“jsdom/vm/node 补环境”“补环境 skill”“验证码/风控环境修补”时使用。
---

# Web逆向补环境

## 概览

使用这个技能时，不要把“补环境”理解成给 `window/document/navigator` 随便补几个值。

先把任务视为四类问题之一：

1. 缺对象或缺属性，代码直接报 `undefined`
2. 对象存在，但原型链、描述符、getter/setter、`toString` 暴露
3. 基础对象能跑，但被指纹、栈、异步对象、通信对象继续检测
4. 补环境成本过高，应切换到浏览器内执行或 `JsRpc/WebSocket` 替代路线

默认优先走“诊断驱动”的补环境路线，而不是一次性补全浏览器。

## 快速分流

根据任务特点，优先读取对应参考文档：

- 用户要先理解整体流程或不知道从哪里下手：读 [01-workflow.md](references/01-workflow.md)
- 用户要模块化设计、生成补丁或定义模块边界：读 [02-module-contracts.md](references/02-module-contracts.md)
- 用户卡在 `document.all`、native `toString`、堆栈、反检测、`WebRTC/AudioContext/Worker`：读 [03-special-cases.md](references/03-special-cases.md)
- 用户想知道当前草稿还缺什么：读 [04-missing-points.md](references/04-missing-points.md)
- 用户要继续扩展外部阅读池或找更多非大站来源：读 [05-diversified-reading.md](references/05-diversified-reading.md)
- 用户要做回归验证、模块验收或判断补丁是否够稳：读 [06-validation.md](references/06-validation.md)
- 用户要了解现有 GitHub 框架、来源映射和代码级模式：读 [07-source-map.md](references/07-source-map.md)

## 标准工作流

### 1. 先判断目标路线

优先判断当前任务属于哪一类：

- 只需要最小补丁让样本跑通
- 需要做成可复用模块
- 需要沉淀为 skill / 框架
- 需要高强度检测点补齐
- 需要切换到浏览器内执行或 `JsRpc`

如果是最后一种，不要硬补到底。

### 2. 先采集，再诊断

如果用户还没有真实浏览器样本：

- 优先使用 [collect-browser-env.js](scripts/collect-browser-env.js)
- 采集 `navigator`、`document`、`location`、`history`、`screen`
- 采集 `cookie`、`localStorage`、`sessionStorage`
- 采集基础 `canvas/webgl` 指纹

如果用户已经有运行日志或报错：

- 优先使用 [observe-runtime.js](scripts/observe-runtime.js)
- 让缺失路径、描述符探测、原型链探测、调用错误先浮出来

不要在没有诊断信息的前提下大面积硬补对象。

### 3. 按模块补，而不是按页面乱补

补环境时，优先按模块推进：

1. `prototype-builder`
2. `descriptor-guard`
3. `native-protector`
4. 浏览器对象模块
5. `performance-module`
6. `crypto-module`
7. `fingerprint-module`
8. `audio-fingerprint-module`
9. `webrtc-module`
10. `worker-module`
11. `proxy-observer`
12. `math-precision-module`
13. `stack-clean-module`
14. `document-all-module`

如果站点一开始就死在 `document.all`，把特殊对象优先级前置。

### 4. 先补“能继续执行”的缺口

补丁优先级默认如下：

1. `undefined` 或缺对象导致主流程中断
2. getter / setter / 方法的 `Illegal invocation`
3. 原型链和描述符不一致
4. native `toString` 暴露
5. 指纹异常
6. 异步对象、通信对象、高强度检测点

### 5. 把高强度检测点单独看

遇到下面这些对象时，不要按“普通 BOM/DOM 补值”处理：

- `document.all`
- `window.crypto.getRandomValues`
- `performance.timing`
- `RTCPeerConnection`
- `AudioContext` / `OfflineAudioContext`
- `Worker` / `SharedWorker`
- `Math` 精度差异

这类对象优先参考：

- [03-special-cases.md](references/03-special-cases.md)
- [02-module-contracts.md](references/02-module-contracts.md)

## 资源使用规则

### scripts

优先使用现有脚本，而不是每次重写。

- [collect-browser-env.js](scripts/collect-browser-env.js)
  - 浏览器侧采集环境种子
- [observe-runtime.js](scripts/observe-runtime.js)
  - Proxy 吐环境与缺口聚合
- [protect-native.js](scripts/protect-native.js)
  - `Function.prototype.toString`、getter、setter 保护
- [build-plugin-graph.js](scripts/build-plugin-graph.js)
  - 构建 `plugins/mimeTypes/enabledPlugin` 图结构
- [build-navigator-module.js](scripts/build-navigator-module.js)
  - 生成 `Navigator/navigator/plugins/mimeTypes/getBattery` 模块补丁草稿
- [build-document-module.js](scripts/build-document-module.js)
  - 生成 `Document/HTMLDocument/document/cookie/query API` 模块补丁草稿
- [build-storage-module.js](scripts/build-storage-module.js)
  - 生成 `Storage/localStorage/sessionStorage` 模块补丁草稿
- [build-fingerprint-module.js](scripts/build-fingerprint-module.js)
  - 生成 `screen/canvas/WebGL/battery/windowMetrics` 模块补丁草稿
- [build-crypto-module.js](scripts/build-crypto-module.js)
  - 生成 `crypto/msCrypto/getRandomValues/subtle` 模块补丁草稿
- [build-performance-module.js](scripts/build-performance-module.js)
  - 生成 `performance.now/timeOrigin/timing` 模块补丁草稿
- [build-webrtc-module.js](scripts/build-webrtc-module.js)
  - 生成 `RTCPeerConnection/RTCDataChannel` 模块补丁草稿
- [build-worker-module.js](scripts/build-worker-module.js)
  - 生成 `Worker/SharedWorker/MessagePort/BroadcastChannel` 模块补丁草稿
- [analyze-gap-log.js](scripts/analyze-gap-log.js)
  - 把 Proxy 吐环境日志归并成模块优先级与下一步动作
- [merge-storage-state.js](scripts/merge-storage-state.js)
  - 合并 cookie / storage 运行态
- [scaffold-module.js](scripts/scaffold-module.js)
  - 生成模块骨架

### references

当任务复杂或需要解释时，再读细分文档，不要一次性把全部 references 都装进上下文。

优先只读与当前阶段直接相关的 1 到 2 份。

### assets

优先把运行期数据放进 `assets` 样例，而不是写死到脚本里。

已准备的样例：

- [fingerprint-seed.example.json](assets/fingerprint-seed.example.json)
- [navigator-sample.example.json](assets/navigator-sample.example.json)
- [document-sample.example.json](assets/document-sample.example.json)
- [plugin-graph.example.json](assets/plugin-graph.example.json)
- [storage-state.example.json](assets/storage-state.example.json)
- [crypto-sample.example.json](assets/crypto-sample.example.json)
- [performance-sample.example.json](assets/performance-sample.example.json)
- [webrtc-sample.example.json](assets/webrtc-sample.example.json)
- [worker-sample.example.json](assets/worker-sample.example.json)

## 产出要求

当这个技能被用于实际任务时，默认产出应尽量包含：

- 当前任务属于哪一种补环境问题
- 建议优先补哪些模块
- 需要读取哪些 references
- 需要运行哪些 scripts
- 如果用户要代码，给出模块化补丁，而不是一整份混乱脚本
- 如果风险较高，明确指出纯 JS 难以完整模拟的部分

## 特殊规则

### `document.all`

明确把 `document.all` 视为特殊对象。

不要轻易宣称纯 JS 可以完全等价模拟。

优先说明：

- 这是 `native-addon / V8 API / fallback` 三选一问题
- 如果只有纯 JS，必须明确 residual risk

### 代理反检测

不要默认认为“代理越多越好”。

如果用户目标站点会检测代理：

- 先用代理诊断
- 再决定是否去掉部分代理或换更完整 trap

### `JsRpc` / 浏览器内执行

当补环境成本明显过高时，可以建议：

- 真浏览器内执行
- `JsRpc`
- `WebSocket` 回传结果

这属于技能允许的替代路线，不是偏题。

