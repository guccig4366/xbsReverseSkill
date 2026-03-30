# 模块输入输出契约

这份文档定义 future skill 每个核心模块的输入 / 输出边界，避免后续脚本和文档互相耦合。

## 1. 通用约定

所有模块尽量遵循同一套输入 / 输出字段。

### 输入

- `target`
  - 当前要补的对象名或模块名
- `seed`
  - 真实浏览器采集到的种子数据
- `runtime`
  - 当前 Node / jsdom / vm 里的运行时对象
- `diagnostics`
  - Proxy 吐环境日志、异常日志、堆栈、缺口清单
- `options`
  - 开关项，如 `protectNative`、`strictDescriptor`、`logOpen`

### 输出

- `patchPlan`
  - 本模块准备补哪些点
- `patchCode`
  - 可执行补丁代码或代码片段
- `runtimeState`
  - 补丁后应写入的运行态
- `validation`
  - 本模块对应的检查点
- `residualRisk`
  - 当前模块仍无法完全脚本化处理的风险

## 2. `prototype-builder`

### 输入

- `target`
- `prototypeChainSnapshot`
- `instanceShapeSnapshot`
- `constructorMeta`

### 输出

- `patchPlan`
  - 构造函数
  - 原型链
  - 实例创建
  - 全局挂载
- `patchCode`
  - 构造函数定义代码
  - `Object.setPrototypeOf` / `defineProperty` 代码
- `validation`
  - `instanceof`
  - `Object.getPrototypeOf`
  - `constructor === Xxx`

## 3. `native-protector`

### 输入

- `functions`
- `getters`
- `setters`
- `expectedNativeStrings`
- `metaOverrides`

### 输出

- `patchPlan`
  - 哪些函数要保护
  - 哪些 getter / setter 要保护
  - 是否启用 `toString.toString` 防护
- `patchCode`
  - `Function.prototype.toString` 接管代码
  - 每个函数的 native 保护代码
- `validation`
  - `fn.toString()`
  - `fn.toString.toString()`
  - `fn.name`
  - `fn.length`

## 4. `descriptor-guard`

### 输入

- `target`
- `propertyDescriptors`
- `symbolTags`
- `constructorStrategy`

### 输出

- `patchPlan`
  - 哪些属性用数据描述符
  - 哪些属性用访问器描述符
- `patchCode`
  - `defineProperty` / `defineProperties`
- `validation`
  - `getOwnPropertyDescriptor`
  - `propertyIsEnumerable`
  - `ownKeys`

## 5. `navigator-module`

### 输入

- `seed.navigator`
- `seed.plugins`
- `seed.mimeTypes`
- `seed.userAgentData`
- `diagnostics.navigator`

### 输出

- `patchPlan`
  - basic
  - plugin graph
  - async capability
  - automation flags
- `patchCode`
  - `Navigator.prototype` getter / method
  - `plugins/mimeTypes` 图结构构建
- `runtimeState`
  - `navigator` 实例值
- `validation`
  - `webdriver`
  - `plugins.length`
  - `mimeTypes.length`
  - `getBattery`
  - `userAgentData`

## 6. `document-module`

### 输入

- `seed.document`
- `seed.cookie`
- `diagnostics.document`
- `specialCases.documentAll`

### 输出

- `patchPlan`
  - basic document
  - cookie accessor
  - query API
  - special object
- `patchCode`
  - `Document.prototype` / `HTMLDocument.prototype`
  - `document.cookie` getter / setter
- `validation`
  - `document.URL`
  - `document.readyState`
  - `document.cookie`
  - `document.all`
- `residualRisk`
  - 若无底层支持，明确标记 `document.all` 为特殊风险

## 7. `storage-module`

### 输入

- `seed.localStorage`
- `seed.sessionStorage`
- `seed.cookies`
- `diagnostics.storage`

### 输出

- `patchPlan`
  - shape
  - state
  - cookie linkage
- `patchCode`
  - `Storage.prototype`
  - state merge logic
- `runtimeState`
  - 预置 key/value
- `validation`
  - `length`
  - `getItem`
  - `setItem`
  - `removeItem`
  - `clear`

## 8. `fingerprint-module`

### 输入

- `seed.fingerprint`
- `seed.screen`
- `seed.navigator`
- `diagnostics.fingerprint`

### 输出

- `patchPlan`
  - canvas
  - webgl
  - battery
  - screen
- `patchCode`
  - `toDataURL`
  - `getContext`
  - `getParameter`
  - `getBattery`
- `runtimeState`
  - 指纹种子池
- `validation`
  - canvas 输出
  - WebGL vendor / renderer
  - battery 值
  - screen / window 尺寸一致性

## 9. `performance-module`

### 输入

- `seed.performance`
- `seed.windowMetrics`
- `diagnostics.performance`

### 输出

- `patchPlan`
  - `performance.now`
  - `performance.timeOrigin`
  - `performance.timing`
  - 时间一致性修正
- `patchCode`
  - `performance` 对象与 timing 结构
- `validation`
  - `performance.now()`
  - `performance.timeOrigin`
  - `performance.timing.navigationStart`
  - 各 timing 字段前后顺序关系

## 10. `crypto-module`

### 输入

- `seed.crypto`
- `diagnostics.crypto`
- `typedArraySupport`

### 输出

- `patchPlan`
  - `window.crypto`
  - `window.msCrypto`
  - `getRandomValues`
  - `subtle`
- `patchCode`
  - `getRandomValues` 实现
  - typed array 校验与异常逻辑
- `validation`
  - `Uint8Array`
  - `Uint16Array`
  - `Uint32Array`
  - 长度超限异常

## 11. `webrtc-module`

### 输入

- `seed.webrtc`
- `diagnostics.webrtc`
- `networkPolicy`

### 输出

- `patchPlan`
  - `RTCPeerConnection`
  - `RTCRtpSender`
  - `RTCRtpReceiver`
  - `RTCDataChannel`
  - ICE candidate 路径
- `patchCode`
  - 构造函数与方法补丁
  - `createOffer`
  - `createDataChannel`
  - `onicecandidate`
- `validation`
  - 构造函数存在性
  - `createOffer()`
  - `createDataChannel()`
  - 是否泄露本地候选信息

## 12. `audio-fingerprint-module`

### 输入

- `seed.audio`
- `diagnostics.audio`

### 输出

- `patchPlan`
  - `AudioContext`
  - `OfflineAudioContext`
  - `AudioBuffer`
  - `getChannelData`
- `patchCode`
  - 构造函数
  - 音频缓冲返回值
  - 常见指纹链路模拟
- `validation`
  - `new AudioContext()`
  - `new OfflineAudioContext()`
  - `getChannelData()`
  - 是否满足基础音频指纹调用流程

## 13. `worker-module`

### 输入

- `seed.worker`
- `diagnostics.worker`
- `messagePolicy`

### 输出

- `patchPlan`
  - `Worker`
  - `SharedWorker`
  - `postMessage`
  - `MessagePort`
  - `BroadcastChannel`
- `patchCode`
  - 构造函数
  - 端口通信对象
  - message 事件
- `validation`
  - `new Worker()`
  - `new SharedWorker()`
  - `postMessage`
  - `onmessage`

## 14. `math-precision-module`

### 输入

- `seed.math`
- `diagnostics.math`
- `baselineResults`

### 输出

- `patchPlan`
  - 高风险数学函数差异校验
  - 浏览器 / Node 结果对照
- `patchCode`
  - 精度修正策略
  - 或风险标注代码
- `validation`
  - 与基线结果比对
  - 是否命中已知高风险函数

## 15. `proxy-observer`

### 输入

- `targets`
- `logConfig`
- `skipRules`
- `maxDepth`

### 输出

- `patchCode`
  - Proxy 包装代码
- `diagnostics`
  - `missingPaths`
  - `descriptorAccess`
  - `prototypeAccess`
  - `invocationErrors`
- `validation`
  - 是否成功捕获 `get/set/has/apply/construct`

## 16. `stack-clean-module`

### 输入

- `runtimeError`
- `stackRules`
- `scriptName`

### 输出

- `patchCode`
  - 栈清洗函数
- `validation`
  - 清洗前后栈帧差异
- `residualRisk`
  - 说明是否需要底层 runtime 配合

## 17. `document-all-module`

### 输入

- `mode`
  - `native-addon`
  - `v8-api`
  - `fallback`
- `diagnostics.documentAll`

### 输出

- `patchPlan`
  - 选择的实现路线
- `patchCode`
  - 若有底层支持，输出接线代码
  - 若无底层支持，输出降级兼容代码
- `validation`
  - `== undefined`
  - `=== undefined`
  - `typeof`
  - 调用行为
- `residualRisk`
  - 清楚声明纯 JS 限制

## 18. 模块依赖关系

执行顺序建议：

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

如果站点在早期就卡死在 `document.all`，可以把最后一步提前。
