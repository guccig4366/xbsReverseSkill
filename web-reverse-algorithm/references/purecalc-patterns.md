# 纯算模式

## 适用目的

在确定目标不是纯验证码图片题之后，用这份文档选择更细的纯算路径。

## 一、标准签名题

### 核心结构

```text
request params
-> normalize / stringify / sort
-> inject token / timestamp / ua
-> hash / encrypt
-> final sign
```

### 高频模式

- `query_string -> sha1 -> md5`
- `token&t&appKey&data -> md5`
- `client + mysticTime + product + key -> md5`
- `params -> aes -> aes -> rsa`

### 必查点

1. 原始串字段顺序
2. URL 编码和 JSON 序列化格式
3. token、cookie、UA、时间戳来源
4. 是否还有响应解密链

## 二、Cookie / Header 题

### 核心结构

```text
source(cookie/storage/location)
-> builder
-> header/cookie writer
```

### 优先动作

1. Hook `document.cookie`
2. Hook `fetch` / `XMLHttpRequest.send`
3. 记录 header/body 最终长相
4. 回溯 writer 上游

### 常见坑

- 把初始化 cookie 当成业务 cookie
- 只记录最终值，不记录写入调用栈
- 漏掉页面状态和 location 参数

## 三、JSVMP / VMP 题

### 高危信号

- 数组很大
- 大量位运算
- switch 分发密集
- 值逐位拼接

### 推荐打法

1. 先找最终输出和中间数组
2. 先做低风险 AST：字符串表、常量折叠、死代码删除
3. 对数组写入点、对象取值点、位运算点做 logpoint
4. 先恢复中间 payload，再恢复最终编码

### 不要这样做

- 不要要求 AST 一次性完整还原 VM
- 不要用普通断点硬扛高频状态机
- 不要在没抓到中间态前整体迁移整段 VM

## 四、Wasm 题

### 高危信号

- `WebAssembly.instantiate`
- 导出函数直接影响 sign
- JS 中只看到薄封装

### 推荐打法

1. 找 wasm 加载点
2. 找导出函数名
3. 喂固定输入看输出
4. 能改写成 JS/Python 则优先改写
5. 只在必要时再做深度反编译

## 五、标准算法与自定义编码的分界

很多复杂题不是“整题都是自定义算法”，而是：

```text
标准参数归一化
-> 中间 payload
-> 自定义转序/位运算/编码
-> 标准 hash 或再次包装
```

优先把这 4 段拆开，不要整段一起抄。

## 六、固定不稳定输入

纯算落地前，优先固定这些值：

- `Date.now()`
- `Math.random()`
- `crypto.getRandomValues`
- cookie 中的动态 token
- `navigator.userAgent`
- challenge 初始化对象

如果不先固定这些输入，经常会出现“长度对、值不对”。

## 七、最小落地结果

完成一题后，至少沉淀这些内容：

1. `build_input(...)`
2. `build_raw_string(...)` 或 `build_payload(...)`
3. `sign(...)` / `encrypt(...)`
4. 一个浏览器对齐样本
5. 一个本地校验样本