# 验证与回归

补环境完成后，不要只看“脚本不报错”，至少做下面几类验证。

## 1. 结构验证

- `instanceof`
- `Object.getPrototypeOf`
- `constructor`
- `Symbol.toStringTag`
- `getOwnPropertyDescriptor`
- `ownKeys`

## 2. native 验证

- `fn.toString()`
- `fn.toString.toString()`
- getter / setter `toString`
- `name`
- `length`

## 3. 运行验证

- 同一路径第二次访问是否仍为 `undefined`
- 是否还抛 `Illegal invocation`
- 是否还抛 `TypeError`
- 是否还暴露 Node 栈

## 4. 指纹验证

- `canvas`
- `WebGL`
- `battery`
- `screen/window` 一致性
- `AudioContext`
- `WebRTC`

## 5. 替代路线判断

如果补到以下阶段仍然成本过高，考虑切换路线：

- `document.all`
- `Worker`
- `WebRTC`
- `AudioContext`
- `Math` 精度

可切换为：

- 真浏览器内执行
- `JsRpc`
- `WebSocket` 回传
