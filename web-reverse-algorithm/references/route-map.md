# 路由图

## 适用目的

在开始逆向之前，用这份文档快速判断题型、阻塞点和优先路线。

## 一、先做题型判断

把目标先放进下面 6 类之一：

### 1. 标准签名题

特征：

- 输出长度规整
- 常见 `md5/sha1/hmac`
- 原始串可以明确恢复
- 目标通常是 `sign/header/query`

典型问题：

- 原始串拼接顺序不对
- token / cookie 漏喂
- JSON 序列化格式和浏览器不一致

### 2. 混合加密题

特征：

- 同时存在对称加密和非对称包装
- 常见 `params + encSecKey`
- 目标字段可能不止一个

典型问题：

- 把业务密文和密钥包装混在一起看
- 只抄最终值，不拆中间明文

### 3. JSVMP / VMP 题

特征：

- 大数组
- `for(;;) + switch`
- 寄存器或状态机
- 位运算和分段构造很多

典型问题：

- 从文件头开始硬读
- 没有采中间数组
- 把静态噪音和运行时逻辑混在一起

### 4. Wasm / 协议题

特征：

- `WebAssembly.instantiate`
- protobuf / WebSocket / 二进制帧
- 校验逻辑不完全在 JS 明文层

典型问题：

- 没先证明输入输出边界
- 还没数清包段就开始反编译

### 5. Cookie / Header 题

特征：

- 最终结果写进 `document.cookie`
- 或写进 header / request options
- 常伴随会话态、UA、时间戳

典型问题：

- 没区分初始化值和业务值
- 只看最终值，不看 writer 上游

### 6. 验证码题

特征：

- 至少两段请求
- 同时存在图片线、参数线、环境线
- 常见 `collect/w/fs/pow_answer/Signature`

典型问题：

- 图像线和参数线混写
- 没拆 challenge 和 verify
- 只关注 sign，不关注协议顺序

## 二、再判断当前阻塞点

### A. 入口没找对

信号：

- 代码看了很多，还是说不清 writer 是谁
- 本地报错位置很外层
- 明显抄的是 wrapper，不是 builder

优先动作：

1. 回到最终请求或最终写出点
2. 重做 `writer <- builder <- entry <- source`
3. 暂停进一步补环境

### B. 原始串没对齐

信号：

- 最终长度对，但值不对
- 浏览器和本地的 hash 输入不同
- JSON / query / header 顺序对不上

优先动作：

1. 打印原始串
2. 固定时间戳和随机数
3. 检查 token、cookie、UA、storage

### C. 中间态没采到

信号：

- JSVMP 题完全看不清状态变化
- 只知道最终输出，不知道怎么构造
- AST 做完后仍然没法下手

优先动作：

1. 对数组写入点插桩
2. 对关键 builder 做输入输出 hook
3. 用 logpoint 替代高频断点

### D. 运行时依赖没补齐

信号：

- 报 `window/document/navigator` 未定义
- 本地和浏览器中间态差异明显
- 目标字段显著依赖 `cookie/storage/ua/fingerprint`

优先动作：

1. 收缩到最小入口
2. 记录真实访问属性
3. 只补进入 builder 所需的对象

## 三、推荐工作流

### 标准签名 / 混合加密

```text
抓最终请求
-> 找最后赋值点
-> 还原原始串或原始对象
-> 判断标准算法或加密层次
-> 本地复现
```

### JSVMP / VMP

```text
找最终输出
-> 找中间数组/中间对象
-> 插桩
-> 先恢复中间明文结构
-> 再恢复最终编码
```

### Wasm / 协议

```text
识别边界
-> 找导出函数或包段
-> 验证输入输出
-> 再决定是否反编译或移植
```

### 验证码

```text
拆 challenge / verify
-> 分离图像线、参数线、环境线
-> 锁定最终 verify builder
-> 对齐中间态
-> 再做 solver 落地
```

## 四、常用标签

后续整理案例时，优先使用下面这组标签，避免只按站点名归档：

- `header-sign`
- `cookie-sign`
- `response-decrypt`
- `captcha`
- `vmp`
- `jsvmp`
- `wasm`
- `protobuf`
- `websocket`
- `env`
- `fingerprint`
- `ast`
- `solver`
- `service`

## 五、结论

稳定的路线不是“先读大文件”，而是：

```text
题型判断
-> 最终写出点
-> builder
-> 中间检查点
-> 最小本地复现
```