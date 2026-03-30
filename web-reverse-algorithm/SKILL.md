---
name: web-reverse-algorithm
description: 面向 Web/JS 逆向中的纯算、验证码纯算、复杂 header/cookie 签名、混合加密、JSVMP/VMP、Wasm、PoW、响应解密、指纹与 challenge 参数还原工作流。用于需要从最终请求、最终 cookie、最终 verify 或最终 WebSocket 帧倒推 writer、builder、entry、source，设计浏览器与本地对齐检查点，判断何时做 AST 解混、何时插桩、何时做最小补环境、何时拆图像线与参数线、以及如何把研究结果落成 solver、SDK、脚本或服务的场景。用户明确提到纯算、验证码纯算、滑块、点选、旋转、PoW、collect、w、x-s、a_bogus、encSecKey、captchaBody、X-Bogus、Wasm、国密、补环境、指纹、challenge、verify、header 签名、cookie 签名时使用。
---

# Web 逆向纯算

这项技能不是“给一个固定公式”，而是把资料库里的方法层、题型层、训练层、工程化层压成一套总入口。

先把任务压缩成这条闭环，再决定读哪份 references、走哪条路径、写哪种落地代码：

```text
最终请求 / 最终 cookie / 最终 verify / 最终 WS 帧
-> writer
-> builder
-> entry
-> source
```

## 核心原则

1. 先找最终写出点，不先读混淆大文件。
2. 先存中间值，不先猜算法名。
3. 先缩小执行范围，再补环境。
4. 先证明输入输出边界，再决定是否整体迁移。
5. 先把结果整理成可复用结构，再继续做版本适配。

## 使用顺序

### 1. 先判题型

把目标先归到下面之一：

- 标准签名 / 标准摘要题
- 混合加密 / 密钥包装题
- Cookie / Header / 多参数联动题
- JSVMP / VMP / 强混淆纯算题
- Wasm / Protobuf / WebSocket / 二进制协议题
- 验证码 / 风控 / challenge 题

如果还没分清，先读 [references/01-decision-tree.md](./references/01-decision-tree.md)。

### 2. 再判当前阻塞点

优先判断你卡在下面哪一类：

- 入口没找对
- 原始串或原始 payload 没对齐
- 中间数组 / 中间对象没采到
- 运行时依赖没补齐
- 图像线和参数线没拆开
- 协议边界没证明

遇到这一步拿不准时，优先读 [references/04-debug-env-playbook.md](./references/04-debug-env-playbook.md)。

### 3. 按题型选路线

#### 标准签名 / 混合加密 / Cookie / Header / 国密

适用信号：

- 输出长度规整
- `md5/sha1/hmac/aes/rsa/sm3/sm4`
- `token&t&appKey&data`
- `params + encSecKey`
- `document.cookie` 或 header 明显可追

优先读取 [references/02-algorithm-families.md](./references/02-algorithm-families.md)。

#### JSVMP / VMP / 小红书 / a_bogus / 多参数复杂纯算

适用信号：

- 大数组、解释器、`for(;;)+switch`
- 位运算密集、状态数组、寄存器式写法
- `window._webmsxyw`、`__TENCENT_CHAOS_VM`、`byted_acrawler` 一类入口

优先读取 [references/02-algorithm-families.md](./references/02-algorithm-families.md) 和 [references/04-debug-env-playbook.md](./references/04-debug-env-playbook.md)。

#### Wasm / Protobuf / WebSocket / challenge 协议

适用信号：

- `WebAssembly.instantiate`
- `application/x-protobuf`
- 二进制响应、导出函数、首包/验证包分段

优先读取 [references/02-algorithm-families.md](./references/02-algorithm-families.md) 和 [references/03-captcha-families.md](./references/03-captcha-families.md)。

#### 验证码 / 风控 / challenge / verify

永远先拆 5 条线：

1. 初始化 / challenge 线
2. 图像或题面识别线
3. 参数 builder 线
4. 环境 / 指纹 / collect 线
5. 最终 verify 线

优先读取 [references/03-captcha-families.md](./references/03-captcha-families.md)。

## 统一工作流

### 1. 锁定最终写出点

优先从这些位置切：

- `fetch`
- `XMLHttpRequest.send`
- `setRequestHeader`
- `document.cookie`
- `JSON.stringify`
- verify 提交点
- WebSocket 首包或验证包发送点

### 2. 记录 5 层检查点

至少保留：

1. writer 检查点：最终 URL / header / body / cookie / WS 帧
2. builder 输入：query、payload、token、challenge、distance、track、browser info
3. 原始串或原始 payload
4. 中间数组 / 中间对象 / 编码前字节流
5. 最终输出

### 3. 先恢复中间态，再恢复最终编码

这条规则在下面几类题里尤其重要：

- 小红书 `x-s / x-s-common`
- 抖音 `a_bogus / X-Bogus`
- 腾讯 `collect`
- 网易盾 `w`
- 各类 `payload -> encode` 的 header 家族

### 4. 只在必要时补环境

优先补到最小可运行边界：

1. `window/self/globalThis/document/navigator/location`
2. `cookie/storage/performance/Date/crypto`
3. `canvas/webgl/audio/plugins/mimeTypes/RTCPeerConnection`

如果目标已经被收缩成纯函数，就不要把任务升级成“大补环境题”。

### 5. 把结果收敛到工程接口

最终优先沉淀下面这些产物：

- 最小输入集合
- 中间检查点集合
- `build_context()` / `build_payload()` / `sign()` / `solve()` 这种分层接口
- 本地样本与浏览器样本对照
- 失败诊断点

## 你应该产出的结果

使用这项技能时，优先输出：

1. 题型判断
2. writer / builder / entry / source 分层
3. 当前阻塞点判断
4. 必要检查点列表
5. 是否需要 AST、插桩、补环境、图像识别或协议拆包
6. 推荐的落地结构：函数、solver、SDK、服务
7. 易错点与版本风险

## 资源导航

- [references/01-decision-tree.md](./references/01-decision-tree.md)
  用途：先做题型判断、阻塞点判断、请求链定位。
- [references/02-algorithm-families.md](./references/02-algorithm-families.md)
  用途：标准签名、混合加密、Cookie/Header、JSVMP、Wasm、国密、站点家族模式。
- [references/03-captcha-families.md](./references/03-captcha-families.md)
  用途：腾讯、极验、网易盾、百度旋转、阿里 v2、V5、拼多多、hCaptcha 等验证码/风控路线。
- [references/04-debug-env-playbook.md](./references/04-debug-env-playbook.md)
  用途：hook、logpoint、最小补环境、浏览器/本地对齐、反调试与证据管理。
- [references/05-training-routes.md](./references/05-training-routes.md)
  用途：学习顺序、训练阶段、案例如何带新人、视频资料怎么吸收。
- [references/06-engineering-maintenance.md](./references/06-engineering-maintenance.md)
  用途：GitHub 项目怎么吸收、接口如何设计、扩库时怎么记主落点/补充落点/标签。
- [scripts/new_case_scaffold.py](./scripts/new_case_scaffold.py)
  用途：新站点或新 challenge 建标准化案例目录。

## 案例脚手架

要在工作区里快速起一套“可复盘、可扩展”的案例骨架，运行：

```powershell
python "<skill-dir>\\scripts\\new_case_scaffold.py" `
  "case-name" `
  --type captcha `
  --family tencent `
  --tags captcha,collect,pow `
  --sources "https://example-a,https://example-b" `
  --language py `
  --output ".\\research"
```

脚手架会生成：

- `case-overview.md`
- `request-chain.md`
- `evidence-log.md`
- `checkpoints.json`
- `metadata.json`
- `solver_stub.js` 或 `solver_stub.py`
- `todo.md`

## 最后约束

始终偏向下面这些做法：

1. 从真实请求或真实 sink 进入。
2. 对浏览器值和本地值建立同构检查点。
3. 先拆算法层、环境层、协议层，再决定怎么迁移。
4. 同站点多文章时记录“思路差异”，不要只保留一个最终答案。
5. 每个案例都沉淀输入边界、检查点、代码骨架、易错点，而不是只留最终成品。