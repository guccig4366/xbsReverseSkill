# 调试、补环境与检查点

## 适用目的

在已经锁定目标字段后，用这份文档决定如何布断点、何时 hook、何时最小补环境，以及如何做浏览器/本地对齐。

## 一、优先用 hook 和检查点

优先级建议：

1. Hook / logpoint
2. 调用栈回溯
3. 条件断点
4. 普通断点

理由：

- hook 更适合持续采样
- logpoint 更适合高频状态机
- 调用栈更容易分清 builder 和 wrapper

## 二、最值钱的 hook 点

### 请求链

- `fetch`
- `XMLHttpRequest.prototype.open`
- `XMLHttpRequest.prototype.send`
- `setRequestHeader`
- `JSON.stringify`

### 结果写出点

- `document.cookie`
- 目标对象字段写入
- 已知 builder 函数

### 运行时代码

- `eval`
- `Function`
- `Date.now`
- `Math.random`
- `crypto.getRandomValues`

## 三、最小补环境优先级

### P0：先保证代码能进入 builder

- `window`
- `self`
- `globalThis`
- `document`
- `navigator`
- `location`

### P1：再保证 builder 输入正确

- `document.cookie`
- `localStorage`
- `sessionStorage`
- `performance`
- `Date`
- `crypto`
- `screen`
- `history`

### P2：最后才考虑拟真指纹层

- `canvas`
- `webgl`
- `audio`
- `plugins`
- `mimeTypes`
- `RTCPeerConnection`
- `indexedDB`
- `Intl`

默认只补到 P0 或 P1，除非证据明确指向指纹层。

## 四、判断是不是环境问题

### 先补环境的信号

- 入口直接报对象未定义
- 浏览器和本地中间态差异显著
- 关键结果显著依赖 `cookie/storage/ua/fingerprint`

### 不要先补环境的信号

- 已经收缩成纯函数
- 真实问题是入口没找对
- 真实问题是 token、cookie、challenge 没喂进去

## 五、四层检查点

### 1. source 检查点

记录：

- cookie
- storage
- UA
- 页面配置
- challenge 初值

### 2. builder 输入检查点

记录真正喂给 builder 的对象。

### 3. builder 中间态检查点

记录：

- 原始串
- 中间数组
- payload
- 编码前字节流

### 4. 最终输出检查点

记录：

- sign
- token
- collect
- verify payload

## 六、浏览器与本地对齐

每次做本地复现时都执行这套对比：

1. builder 输入是否一致
2. 原始串是否一致
3. 中间数组或 payload 是否一致
4. 最终编码前数据是否一致
5. 最终结果是否一致

只比较最终值，定位成本会非常高。

## 七、常见误区

1. 先补环境，再找入口
2. 只追求不报错
3. 一上来深拟真所有原型链
4. 只在最终值处打点
5. 没有保存任何中间工件