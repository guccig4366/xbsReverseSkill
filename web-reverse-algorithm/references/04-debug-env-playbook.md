# 调试、补环境与证据管理

## 一、优先级

优先采用：

1. Hook / logpoint
2. 调用栈回溯
3. 条件断点
4. 普通断点

原因：

- Hook 更适合持续采样
- Logpoint 更适合 JSVMP / 高频状态机
- 调用栈更适合区分 builder 和 wrapper

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

### P0：先让代码进入 builder

- `window`
- `self`
- `globalThis`
- `document`
- `navigator`
- `location`

### P1：再对齐 builder 输入

- `document.cookie`
- `localStorage`
- `sessionStorage`
- `performance`
- `Date`
- `crypto`
- `screen`
- `history`

### P2：最后才补拟真指纹层

- `canvas`
- `webgl`
- `audio`
- `plugins`
- `mimeTypes`
- `RTCPeerConnection`
- `indexedDB`
- `Intl`

默认只补到 P0 或 P1。

## 四、判断是不是环境问题

### 应先补环境的信号

- 入口直接报对象未定义
- 浏览器与本地中间态差异显著
- `collect`、环境位串、指纹对象明显不一致

### 不应先补环境的信号

- 已经收缩成纯函数
- 真实问题是入口没找对
- 真实问题是 token、cookie、challenge、load 返回对象没喂进去

## 五、四层证据

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

每次做本地复现时都执行：

1. builder 输入是否一致
2. 原始串是否一致
3. 中间数组 / payload 是否一致
4. 最终编码前数据是否一致
5. 最终结果是否一致

只比最终值通常不够。

## 七、AST 的边界

AST 最适合做：

- 字符串表还原
- 常量折叠
- 死代码删除
- 简单代理函数内联
- 局部控制流整理

AST 不适合代替：

- JSVMP 运行时取证
- 强环境依赖 builder
- 高频状态机调试

最稳的顺序是：

```text
先定 writer
-> 再做局部 AST 降噪
-> 再做 hook / logpoint
```

## 八、反调试与拟真问题

高频问题：

- `debugger` 死循环
- 时间差检测
- `toString` 检测
- 原型链检测
- Proxy 暴露问题

优先原则：

1. 先让观察成本下降。
2. 先保留证据，再决定是否深拟真。
3. 不要一上来把所有原型链和 native 外观都补掉。

## 九、常见误区

1. 先补环境，再找入口
2. 只追求不报错
3. 只在最终值处打点
4. 普通断点打太多，反而丢主线
5. 没有留下任何可复用工件