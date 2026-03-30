# 第二轮补环境阅读笔记

这份文档记录本轮继续扩读后，新补进来的信息点。

这一轮的目标不是重复收集 Proxy 入门文，而是专门补当前草稿缺的方向：

- `window` / 原型链关系
- `window.crypto` / `performance`
- `WebRTC`
- `AudioContext` / `OfflineAudioContext`
- `Worker`
- 更复杂的国外风控 / 验证码环境检测

## 1. 本轮阅读后最明显的变化

如果把这批文章和前面的 GitHub 框架一起看，会发现一个很重要的分层：

### 第一层：基础补环境

- `window = globalThis`
- `document = {}`
- `navigator = {}`
- `location = {}`
- `history = {}`
- `screen = {}`
- `Proxy` 吐环境

这类内容很多，足够入门，但对 future skill 的增量已经有限。

### 第二层：工程化补环境

- 原型链
- `Symbol.toStringTag`
- native `toString`
- getter / setter / 描述符
- `plugins/mimeTypes`
- `document.all`

这类内容是现有 `codex` 草稿的核心骨架。

### 第三层：高强度检测

- `window.crypto.getRandomValues`
- `performance.timing`
- `RTCPeerConnection`
- `RTCRtpSender` / `RTCRtpReceiver`
- `OfflineAudioContext`
- `Worker` / `SharedWorker`
- 字体指纹
- `Math` 精度差异
- wasm + Promise 异步链

这一层才是后续最值得重点扩读和沉淀的方向。

## 2. 本轮最有价值的文章与新增信息

### 2.1 博客园：JS逆向之浏览器补环境详解

链接：
[https://www.cnblogs.com/spiderman6/p/16969391.html](https://www.cnblogs.com/spiderman6/p/16969391.html)

这篇文章的最大价值不是某个单独代码片段，而是把补环境明确拆成两条路线：

- 递归 Proxy 监控路线
- 纯 JS 原型链框架路线

对 future skill 最有价值的新增点：

- 明确提出“工程化项目结构”比单脚本更重要
- 明确提到事件处理是框架必须考虑的点
- 强调每个 BOM / DOM 对象应单文件组织
- 强调补环境框架要按原型链顺序拼接

这对我们前面已经写出的 `future-skill-blueprint` 是很强的佐证。

### 2.2 博客园：js补环境代码

链接：
[https://www.cnblogs.com/c-x-a/p/18702240](https://www.cnblogs.com/c-x-a/p/18702240)

这篇文章虽然代码不复杂，但有一个很实用的点：

- 它把 `performance`、`top`、`self`、`document` 一起纳入了 Proxy 监控清单

它提醒我们：

- `performance` 不应该只放在指纹模块里，也应该纳入 Proxy 观察默认目标
- `top/self` 这类 `window` 关系也应该是默认监控项

### 2.3 博客园：window.crypto.getRandomValues 模拟

链接：
[https://www.cnblogs.com/hotdog418/articles/14005518.html](https://www.cnblogs.com/hotdog418/articles/14005518.html)

这篇文章的价值在于给了一个很具体的 `getRandomValues` 模拟思路，并且点到了真实行为细节：

- 需要处理 `Uint8Array`
- 需要处理 `Uint16Array`
- 需要处理 `Uint32Array`
- 需要处理长度超过阈值时的异常

这对 future skill 的意义是：

- `crypto.getRandomValues` 不能只返回随机数
- 还要尽量模拟参数类型和错误行为

也就是说，`crypto-module` 已经值得单独立项。

### 2.4 验证码细节总结：补环境中可能用到的方法

链接：
[https://www.cnblogs.com/ocr12/p/18664716](https://www.cnblogs.com/ocr12/p/18664716)

这篇文章虽然主题更偏验证码，但里面有两个对补环境很重要的点：

- `window.crypto.getRandomValues`
- `window.performance.timing`

尤其是 `performance.timing`，说明我们前面的遗漏判断是对的：

- performance 不能只补 `performance.now`
- 很多场景会直接读 timing 结构

所以 future skill 至少应单独补：

- `performance.now`
- `performance.timeOrigin`
- `performance.timing`
- 时间序列一致性

### 2.5 博客园：修改浏览器指纹之 webrtc 指纹修改

链接：
[https://www.cnblogs.com/68xi/p/13344520.html](https://www.cnblogs.com/68xi/p/13344520.html)

这篇文章不是逆向框架文，但对 `WebRTC` 的价值很高：

- 明确给出了 `RTCPeerConnection` 探测本机 IP 的典型流程
- 涉及 `createDataChannel`
- 涉及 `createOffer`
- 涉及 `onicecandidate`

这说明 future skill 中的 `webrtc-module` 至少要考虑：

- 构造函数存在性
- `createDataChannel`
- `createOffer`
- ICE candidate 行为
- IP 泄漏与候选收集路径

### 2.6 CN-SEC：hCaptcha 无感逆向分析-补环境

链接：
[https://cn-sec.com/archives/4909845.html](https://cn-sec.com/archives/4909845.html)

这是这一轮最关键的文章。

它几乎直接把我们草稿里“高强度检测层”的缺口点出来了：

- `RTCPeerConnection`
- `RTCRtpSender`
- `RTCRtpReceiver`
- `OfflineAudioContext`
- `WebGL2RenderingContext`
- 描述符检测
- `AudioBuffer.prototype.getChannelData`
- `Math` 精度差异
- 字体指纹
- canvas 指纹
- `Worker`
- `SharedWorker`
- Promise / wasm 异步调用链

这篇文章对 future skill 的最大推动有三点：

1. 说明补环境已经不能只看 BOM / DOM
2. 说明“异步链 + wasm 交互 + 指纹一致性”是高阶核心
3. 说明验证模块必须能和浏览器日志对照

## 3. 本轮阅读后，future skill 应新增的模块

结合这一轮资料，最应该补进 blueprint 的新增模块有：

### 3.1 `crypto-module`

至少包含：

- `window.crypto`
- `window.msCrypto`
- `getRandomValues`
- `subtle`

### 3.2 `performance-module`

至少包含：

- `performance.now`
- `performance.timeOrigin`
- `performance.timing`
- 时间一致性

### 3.3 `webrtc-module`

至少包含：

- `RTCPeerConnection`
- `RTCRtpSender`
- `RTCRtpReceiver`
- ICE candidate 行为

### 3.4 `audio-fingerprint-module`

至少包含：

- `AudioContext`
- `OfflineAudioContext`
- `AudioBuffer`
- `getChannelData`

### 3.5 `worker-module`

至少包含：

- `Worker`
- `SharedWorker`
- `postMessage`
- `MessageEvent`

### 3.6 `math-precision-module`

至少包含：

- 精度差异检查
- 高风险数学函数差异记录
- 浏览器 / Node 结果对照能力

## 4. 对当前 codex 草稿最直接的修正建议

这一轮阅读后，我认为前面的遗漏优先级需要进一步收敛成：

1. `crypto-module`
2. `performance-module`
3. `webrtc-module`
4. `audio-fingerprint-module`
5. `worker-module`
6. `window` 关系一致性
7. 完整 Event / DOM 系统

原因很简单：

- 这些模块在高强度风控里更容易真正卡死流程
- 而且它们比基础 BOM/DOM 更难靠“临时补值”解决

## 5. 当前最稳的结论

这第二轮阅读已经说明：

- 我们现在不是资料不够多
- 而是资料分布不均

真正该继续扩读的，不是更多重复的 Proxy 入门文，而是：

- `crypto`
- `performance`
- `WebRTC`
- `AudioContext`
- `Worker`
- `Math` 精度
- wasm 交互与异步调用链

这会直接决定 future skill 后续有没有能力从“常规补环境”走向“国外高强度盾补环境”。
