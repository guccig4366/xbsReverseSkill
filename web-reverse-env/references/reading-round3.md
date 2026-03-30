# 第三轮补环境阅读笔记

这轮继续扩读后，新增信息已经开始从“模块提醒”进入“具体实现与策略分流”。

本轮重点补到的不是基础 Proxy，而是：

- `crypto.getRandomValues`
- `performance`
- `WebRTC`
- 代理反检测
- `JsRpc/WebSocket` 作为补环境替代路线

## 1. 本轮最重要的新增结论

### 1.1 `crypto-module` 已经可以正式立项

这一轮多篇文章都重复出现了同一个点：

- `window.crypto.getRandomValues`

而且不是只说“需要补”，而是给到了很具体的行为细节：

- 支持 `Uint8Array`
- 支持 `Uint16Array`
- 支持 `Uint32Array`
- 长度超过 `65536` 时要抛 `QuotaExceededError`

这说明它已经不是“边角料补丁”，而是可以成为 future skill 的独立模块。

参考来源：

- [JS 安全随机数 window.crypto 如何逆向实现](https://www.cnblogs.com/hotdog418/articles/14005518.html)
- [某验全家桶细节避坑总结](https://www.cnblogs.com/ikdl/p/17382407.html)
- [验证码识别与处理细节总结](https://www.cnblogs.com/ocr12/p/18664716)

## 2. `performance` 的重要性被再次确认

这一轮阅读后，`performance` 至少有两层价值：

- 作为默认 Proxy 监控对象
- 作为独立补环境对象

现在可以明确：

- `performance.now` 不够
- `performance.timing` 也经常被直接读
- 时间字段之间的一致性关系也需要考虑

其中一个很直接的提醒来自：

- [js补环境代码](https://www.cnblogs.com/c-x-a/p/18702240)

这篇文章的监控列表示例里已经把 `performance` 和 `top/self/document` 一起当成默认观察对象。

## 3. `WebRTC` 已经不只是“指纹提醒”，而是行为链

这一轮最大的变化，是 `WebRTC` 不再只是被当成一个抽象指纹点，而是能看到实际调用链：

- `RTCPeerConnection`
- `createDataChannel`
- `createOffer`
- `onicecandidate`

这意味着 future skill 的 `webrtc-module` 不能只补“对象存在”，还得至少考虑：

- 构造函数存在性
- 方法存在性
- Promise 或事件链行为
- 本地 candidate / IP 暴露路径

参考来源：

- [修改浏览器指纹之 webrtc 指纹修改](https://www.cnblogs.com/68xi/p/13344520.html)
- [hCaptcha无感逆向分析-补环境](https://cn-sec.com/archives/4909845.html)

## 4. 代理反检测值得单独做策略说明

本轮一个很值得注意的新点，是有文章明确讲了“代理本身会被检测”。

这会带来两个分支：

1. 把代理去掉，靠更完整的环境直跑
2. 使用更完善的代理，不暴露明显破绽

这和我们之前从 `qxVm` 学到的结论是完全一致的：

- 入门代理很适合吐环境
- 但生产代理必须考虑 `getPrototypeOf`、`setPrototypeOf`、`ownKeys`、`isExtensible` 等更细 trap

参考来源：

- [携某 testab 参数补环境详解](https://www.cnblogs.com/ikdl/p/18380671)

## 5. `JsRpc/WebSocket` 应该被标记为“替代路线”

这一轮虽然不是直接补环境文章，但有两篇非常值得保留，因为它们点出了另一条现实路径：

- 不一定非要在 Node 里补到极致
- 也可以让浏览器真实执行，再通过 `WebSocket` / RPC 回传结果

这条路线对 future skill 的意义不是替代补环境，而是：

- 当补环境成本过高时，skill 应知道还有 `JsRpc` 这种 fallback
- 对某些站点，`WebSocket + 浏览器内执行` 可能比硬补 `Worker/WebRTC/AudioContext` 更划算

参考来源：

- [Python网络爬虫之js逆向之远程调用(rpc)免去抠代码补环境简介](https://www.cnblogs.com/dcpeng/p/16003260.html)
- [js逆向之jsRpc](https://www.cnblogs.com/xingxia/p/18388396/js_rpc)

## 6. `Worker` 方向的新增认识

这一轮虽然没找到太多“直接讲补环境 Worker”的逆向文，但通过通用 Worker / SharedWorker 文章，已经足够补出一层接口认识：

- `Worker` 和 `SharedWorker` 的构造与通信方式不同
- `SharedWorker` 通过 `port` 通信
- `onconnect`、`port.start()`、`postMessage()` 这些行为都可能被检测

这意味着 future skill 的 `worker-module` 最起码要先区分：

- `Worker`
- `SharedWorker`
- `MessagePort`
- `postMessage/onmessage`

参考来源：

- [WebWorker SharedWorker ServiceWorker](https://www.cnblogs.com/cart55free99/p/4627094.html)
- [sharedWorker 实现多页面通信](https://www.cnblogs.com/imgss/p/14634577.html)
- [SharedWorker使用总结](https://www.cnblogs.com/zoexu/p/16790215.html)

## 7. 这轮阅读对 future skill 最直接的推进

现在可以把新增模块的重要性排序进一步收紧为：

1. `crypto-module`
2. `performance-module`
3. `webrtc-module`
4. `worker-module`
5. `audio-fingerprint-module`
6. 代理反检测策略
7. `JsRpc/WebSocket` 替代路线

## 8. 当前最稳的判断

这第三轮阅读说明，future skill 后续已经不该只是“补对象清单”了，而应该同时具备三种视角：

- 正面补环境
- 反检测补环境
- 无法高性价比补时的替代路线

也就是说，补环境 skill 最后不应只是一个对象模板库，而应更像：

- 模块库
- 检测诊断器
- 路线选择器
