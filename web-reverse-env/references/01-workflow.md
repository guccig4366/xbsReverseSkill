# JS 逆向补环境通用流程总结（中文版增强版）

这份文档讨论的不是“把 Node 里缺的对象补几个上去”这么简单。

真正成熟的补环境，目标是：

- 让目标代码在本地的执行路径尽量接近浏览器内的真实路径。
- 让对象的值、原型链、属性描述符、访问器、函数元信息、原生指纹都尽量接近浏览器。
- 让异常、堆栈、状态数据、指纹对象也尽量不暴露“这是 Node 假环境”。
- 最终恢复真实参数、真实 cookie、真实分支，而不是只做到“不报错”。

## 1. 先判断：这题到底该不该走补环境

常见信号：

- 本地运行直接报 `window is not defined`、`document is not defined`、`navigator is not defined`、`location is not defined`。
- 浏览器里结果正常，本地结果为空、报错、签名不一致、cookie 不一致。
- 目标代码明显在读浏览器对象、指纹对象、DOM/BOM、存储态。
- 目标代码依赖 `document.cookie`、`localStorage`、`sessionStorage`、`canvas`、`WebGL`、`WebSocket`、`Worker`、`meta` 标签等运行时对象。
- 代码切不干净，硬扣算法的成本已经高于“保留大部分原始逻辑 + 外围补环境”。

如果只是纯算法函数，不依赖浏览器环境，那么通常不值得补环境，直接还原算法更高效。

## 2. 永远先定位目标点，再决定补什么

不要一上来就补整套浏览器。

先定位：

- 目标参数或 cookie 是什么。
- 它最终写到了哪里。
- 是哪个函数返回的。
- 是通过 `document.cookie` 写入，还是通过请求头、请求体、query 参数发送。
- 它的上游依赖链是什么。

常见定位入口：

- Hook `document.cookie`
- 搜参数名、cookie 名
- 断在 `XMLHttpRequest`、`fetch`、`WebSocket.send`
- 沿请求调用链往上回溯
- webpack 站点先找模块入口、runtime、构造器
- JSVMP 站点先找对外调用入口，而不是一开始就死抠内部实现

补环境的本质不是“补对象”，而是“围绕真实执行入口，补它运行时真正依赖的对象和状态”。

## 3. 决定执行策略：手补、半框架、全浏览器

### 3.1 手动补环境

适合：

- 缺失对象不多
- 目标依赖链清晰
- 你已经把核心逻辑抽出来了

优点：

- 最干净
- 最容易理解真实依赖
- 最适合沉淀成可复用 skill

缺点：

- 遇到复杂 DOM、原型链检测、native 指纹检测时，维护成本高

### 3.2 模拟浏览器环境

常见工具：

- `jsdom`
- `vm`
- `vm2`
- `catvm`
- `qxVm`
- `sdenv`
- `node-sandbox`

适合：

- DOM/BOM 依赖较多
- 想保留更多原始页面代码
- 不想手写太多空对象

注意：

- 框架只是脚手架，不是魔法。
- 真正难的依然是：原型链、描述符、访问器、原生指纹、动态状态恢复。

### 3.3 真实浏览器执行

常见方式：

- Selenium
- Headless Chrome
- Playwright

适合：

- 本地补环境代价明显高于“直接在浏览器执行”
- 目标强依赖真实 DOM、事件流、浏览器内部实现、渲染对象、定时器行为

这个路线不一定是最终方案，但很适合作为“先跑通，再逆向简化”的过渡方案。

## 4. 第一层：先补最小可运行环境

第一批对象通常包括：

- `window`
- `self`
- `top`
- `parent`
- `frames`
- `globalThis`
- `document`
- `navigator`
- `location`
- `history`
- `screen`

第一层目标不是“完整仿真”，而是：

- 让代码先跑起来
- 让访问路径暴露出来
- 让缺失依赖快速浮现

典型第一步包括：

- 建立全局对象引用关系
- 给 `navigator.userAgent`、`language`、`platform` 等常用字段赋值
- 给 `location.href`、`host`、`hostname`、`origin`、`pathname` 等字段赋值
- 初始化 `document.cookie`
- 初始化 `document.referrer`、`document.head`、`document.documentElement`

但要明确一点：

这只是起步，不是终点。很多检测并不只看值，还看值在什么层级、怎么取到、是不是原生访问器。

## 5. 第二层：尽快让环境“自吐”

这是补环境里最重要的一步之一。

典型做法是给这些对象尽早套上 `Proxy`：

- `window`
- `document`
- `navigator`
- `location`
- `history`
- `screen`
- 高风险函数

重点监控：

- `get`
- `set`
- `has`
- `deleteProperty`
- 必要时监控函数调用

这样做的价值是：

- 把“盲猜缺什么”变成“脚本自己告诉你它读了什么”
- 把补环境任务转成一份可迭代的待补清单
- 让你知道哪些对象必须精细补，哪些对象只是路过

## 6. `undefined` 驱动补环境是主路线，但不是唯一标准

很多时候，确实是通过 Proxy 吐出来的 `undefined` 来判断“这里需要补环境”。

这是非常高效的主路线。

但它有边界：

- 某些值虽然不是 `undefined`，但值不真实，依然会算错。
- 某些检测根本不关心值是不是 `undefined`，而是看原型链、描述符、访问器。
- 某些逻辑依赖的是 cookie、`localStorage`、`sessionStorage` 里“已经存在的历史状态”。
- 某些检测通过异常、堆栈、`toString`、`instanceof` 路径触发，Proxy 不会直接提醒你。

所以正确理解应该是：

- Proxy 吐 `undefined` 是补环境的主入口。
- 但不是补环境完成度的唯一判断标准。

## 7. 第三层：补值，不如补结构

很多初学者会这样补：

```js
navigator = { userAgent: "..." };
document = {};
location = {};
```

这只能解决最基础的报错。

真正经常导致失败的是结构问题：

- 属性本该在实例上，你补到了对象本体上
- 属性本该在原型上，你补到了实例上
- 方法本来是访问器，你补成了普通值
- 属性本来不可枚举，你补成了可枚举
- 方法本来不可写或不可配置，你把描述符补错了
- 函数本来有固定 `name` / `length`，你写出来的不一致

所以补环境的关键思路，应该从“补字段”升级为“补对象结构”。

## 8. 第四层：先补原型链，再补实例值

这是真正的分水岭。

真实浏览器对象通常不是：

```js
window.navigator = { userAgent: "..." };
```

更接近的模型通常是：

- 存在 `Navigator` 构造器
- `navigator` 是某个原型链实例
- 属性可能在原型上，也可能通过 getter 暴露
- 方法通常在原型上
- 属性描述符与浏览器一致

因此更合理的顺序通常是：

1. 先建构造器
2. 再建 prototype
3. 再补 prototype 上的方法和属性
4. 再创建实例
5. 最后把实例挂到全局对象上

高价值对象包括：

- `Navigator`
- `History`
- `Location`
- `Screen`
- `Document`
- `HTMLDocument`
- `Storage`
- `WebSocket`
- `Worker`
- `EventTarget`
- `Node`
- `Element`
- `HTMLElement`
- `HTMLCanvasElement`

也就是说，补环境不是“给对象赋值”，而是“重建浏览器对象图”。

## 9. 第五层：保护原生方法的 `toString`

很多站点会检测：

- 方法是不是原生函数
- `Function.prototype.toString.call(fn)` 的返回值是否像浏览器原生实现

如果你手写：

```js
document.createElement = function () {}
```

那么很容易被看出来，因为它的 `toString()` 不会像：

```js
function createElement() { [native code] }
```

常见保护思路包括：

- 改写目标函数自身的 `toString`
- 统一 Hook `Function.prototype.toString`
- 给受保护函数打隐藏标记，再在 `Function.prototype.toString` 中按标记返回伪原生源码

高频需要保护的方法包括：

- `addEventListener`
- `removeEventListener`
- `createElement`
- `getAttribute`
- `setAttribute`
- `querySelector`
- `getContext`
- `Storage.prototype.getItem`
- `Storage.prototype.setItem`

## 10. `toString.toString` 这种深层检测也要考虑

成熟站点不只会检测：

- `fn.toString()`
- `Function.prototype.toString.call(fn)`

还会继续检测：

- `fn.toString.toString()`
- `Function.prototype.toString.toString()`

也就是说，它不只检查“你伪装的函数像不像原生”，还检查“你拿来做伪装的 `toString` 本身像不像原生”。

因此成熟方案通常要同时保护：

- 被伪装的目标函数
- 目标函数自己的 `.toString`
- `Function.prototype.toString`
- 与 `toString` 相关的 `name` / `length` / 描述符

## 11. 第六层：保护 getter / setter 访问器

真实浏览器里很多属性不是普通数据属性，而是访问器属性。

例如：

- `document.cookie`
- `location.href`
- `navigator.userAgent`
- 一些 DOM 节点属性

如果目标代码用了：

- `Object.getOwnPropertyDescriptor`
- `__lookupGetter__`
- 直接检测 getter / setter 的 `toString`

那么你补成普通值就会露馅。

更稳妥的补法应当是：

- 使用 `Object.defineProperty`
- 显式提供 `get`
- 必要时提供 `set`
- 对 getter / setter 本身也做 `toString` 保护
- 保持 `enumerable` / `configurable` 等标志尽量接近浏览器

另外还要注意异常路径：

- 某些 getter 在非法调用时应该抛异常
- 某些 setter 在类型不合法时不能静默通过

所以访问器不只是“能取到值”，还要尽量对齐：

- 返回值
- 报错时机
- 报错类型
- 报错信息形态

## 12. 第七层：保护属性描述符

很多补环境失败，不是值错了，而是描述符错了。

重点需要关注：

- `enumerable`
- `configurable`
- `writable`
- `get`
- `set`

还要注意：

- 某些属性本应定义在 prototype 上
- 某些属性本应定义在实例上
- 某些属性本应不出现在 `Object.keys`
- 某些属性本应能通过 `in` 访问，但不应是 own property

所以补环境时，经常要把下面这些检测一起纳入验证：

- `Object.getOwnPropertyDescriptor`
- `Object.getOwnPropertyDescriptors`
- `Object.keys`
- `Reflect.ownKeys`
- `hasOwnProperty`
- `propertyIsEnumerable`
- `in`
- `Object.getPrototypeOf`
- `constructor`
- `instanceof`
- `Symbol.toStringTag`
- `Object.prototype.toString.call(obj)`

## 13. 第八层：保护函数的 `name` 和 `length`

很多环境检测会直接看：

- `fn.name`
- `fn.length`

如果浏览器原生方法本来：

- 名字固定
- 参数个数固定

而你手写的函数不一致，就可能被识别。

补函数时要注意：

- 用命名函数而不是匿名函数
- 参数个数尽量与真实浏览器一致
- 必要时通过 `Object.defineProperty` 保护 `name` / `length`
- 如果统一封装安全函数或 native 模板，要确保封装后不会把这些信息破坏

还要注意：

- 包装函数之后，外层壳子很容易把原始 `name` / `length` 改掉
- getter / setter 函数自身也可能被检测 `name`
- 某些站点还会顺带看 `caller`、`arguments` 的访问行为

## 14. Node 环境检测必须单独考虑

很多站点真正先做的，不是浏览器对象检测，而是先识别“你是不是在 Node 里跑”。

常见检测点：

- `process`
- `global`
- `Buffer`
- `require`
- `module`
- `exports`
- Node 版本差异导致的内置对象行为差异
- Node 特有的全局痕迹

所以成熟流程里要考虑：

- 是否隐藏或清理 Node 痕迹
- 是否让全局对象更接近浏览器
- 是否避免把明显的 CommonJS / Node 运行特征暴露给目标代码

## 15. 错误异常检测也必须纳入流程

有些站点会主动触发错误，然后检查：

- 抛出的异常类型是否合理
- `message` 是否像浏览器
- `name` 是否正确
- 报错位置是否合理

这意味着补环境不能只补“正常路径”，还要补“异常路径”。

## 16. 堆栈检测也要考虑

错误一旦抛出，目标代码可能会检查：

- `error.stack`
- 栈中的函数名
- 栈中的文件路径格式
- 是否出现 `vm`、本地文件路径、Node 模块路径

因此成熟方案里常常还要考虑：

- 栈裁剪
- 栈伪装
- 避免在高风险函数中暴露本地包装层

## 17. 第九层：按对象类型拆分补环境策略

这一层很适合后面抽象成 skill 的模块能力。

### 17.1 BOM 对象

常见包括：

- `window`
- `self`
- `top`
- `parent`
- `frames`
- `navigator`
- `history`
- `location`
- `screen`

常见补法：

- 建立对象之间的引用关系
- 构造器 + prototype + 实例三层补齐
- 补属性描述符
- 补常见方法
- 补 `toString`
- 补 getter / setter

### 17.2 `navigator`

高频字段包括：

- `userAgent`
- `platform`
- `language`
- `languages`
- `webdriver`
- `plugins`
- `mimeTypes`
- `hardwareConcurrency`
- `deviceMemory`
- `cookieEnabled`
- `vendor`
- `appCodeName`
- `appName`
- `appVersion`
- `maxTouchPoints`
- `pdfViewerEnabled`
- `getBattery`

高风险点：

- `navigator.webdriver === false`
- `plugins` 不是简单数组，而是类数组结构
- `mimeTypes` 通常也不是简单数组
- `plugins` 和 `mimeTypes` 之间常有结构关联
- `navigator.getBattery()` 常常需要返回 `Promise`
- `userAgent`、`platform`、`language`、`languages` 之间需要自洽
- 原型归属、描述符、own property 与 prototype property 的差异

也就是说，`navigator` 不能只补几个字符串，还要补数据结构、返回类型、原型和描述符。

### 17.3 `history`

常见方法：

- `back`
- `forward`
- `go`
- `pushState`
- `replaceState`

很多时候不一定真需要逻辑，但需要：

- 原型上存在
- `name/length` 正确
- `toString` 像原生

### 17.4 `location`

重点：

- 许多字段应通过 getter 暴露
- `href` 变化可能联动 `host`、`hostname`、`origin`、`pathname`
- 有些站会检查 `location.toString()`

### 17.5 `screen`

常见字段：

- `width`
- `height`
- `availWidth`
- `availHeight`
- `colorDepth`
- `pixelDepth`

### 17.6 `document`

高频依赖包括：

- `cookie`
- `referrer`
- `readyState`
- `head`
- `body`
- `documentElement`
- `createElement`
- `addEventListener`
- `querySelector`
- `getElementById`
- `getElementsByTagName`
- `all`

高风险点：

- `document.cookie` 通常要做成访问器
- DOM 节点返回值不能永远是空对象
- `createElement("canvas")` 经常需要特殊返回
- `meta`、`script`、隐藏节点都可能参与补环境

`document.all` 需要单独拿出来说，因为它不是普通字段：

- 它是历史兼容对象
- 很多站会拿它做特殊检测
- 它在真假判断、相等判断、类型判断上的行为都比较特殊

所以在真正做 skill 时，`document.all` 最好做成一个独立能力模块，而不是普通属性赋值。

### 17.7 `localStorage` / `sessionStorage`

通常不是简单对象，而应尽量按 `Storage` 结构去补。

常见方法：

- `getItem`
- `setItem`
- `removeItem`
- `clear`
- `key`

高风险点：

- `length`
- 存取行为
- 原型归属
- 描述符

补这两个对象时还要注意：

- 业务逻辑可能真的依赖已有值，而不是只检测存在性
- 需要提前注入站点依赖的键值
- 某些参数生成逻辑会从 `localStorage` 或 `sessionStorage` 里读取种子值

所以补环境时不仅要补对象结构，还要补运行态数据。

### 17.8 `WebSocket`

如果代码只检测存在性，可能只需要：

- 构造器
- `prototype.send`
- `prototype.close`
- `prototype.addEventListener`

如果代码真在走链路，就要考虑：

- 实例属性
- 回调事件
- `readyState`
- 发送参数格式
- `binaryType`
- `bufferedAmount`
- `extensions`
- `protocol`

### 17.9 `Worker`

有些站并不真的依赖 Worker 干活，而是拿它做检测。

常见检查：

- `Worker` 是否存在
- 是否能 `new Worker()`
- 是否存在 `postMessage`
- 是否存在 `terminate`

复杂情况下还要考虑：

- `importScripts`
- `onmessage`
- 消息流
- `Worker.toString()`
- 原型链和实例行为

## 18. canvas / WebGL 指纹要作为独立模块考虑

高频指纹包括：

- canvas 指纹
- WebGL 指纹
- 音频指纹
- 屏幕指纹
- 插件 / MIME 类型指纹

这里尤其要注意：

- 不是所有题都要完整补，但流程上必须预留能力
- canvas 经常从 `createElement("canvas")`、`getContext()`、`toDataURL()` 进入
- WebGL 经常从 context、`getParameter()`、vendor / renderer 信息进入

也就是说，指纹对象补丁最好作为单独模块，而不是零散塞在 `document` 里。

## 19. Cookie 与存储态必须一起考虑

很多站点的参数生成，并不只依赖静态环境对象，还依赖运行态数据：

- `document.cookie`
- `localStorage`
- `sessionStorage`
- 页面初始化时种下的 token
- 某些前置请求返回的数据

因此补环境判断不能只看 Proxy 吐出来的 `undefined`。

还要看：

- 有没有读取已有 cookie
- 有没有读取已有 storage 值
- 是否依赖“浏览器中本来就存在的历史状态”

也就是说，补环境不仅是补“对象”，还要补“状态”。

## 20. 第十层：把“报错修复”升级成“检测对抗”

补环境不是只让脚本跑通。

你还要考虑它会不会检测：

- 原型链
- native code 指纹
- getter / setter
- 描述符
- `name`
- `length`
- 枚举行为
- own keys
- `instanceof`
- `constructor`
- `Symbol.toStringTag`
- `Object.prototype.toString.call(obj)`
- Node 痕迹
- 异常与堆栈
- 指纹对象

因此一份成熟的补环境流程，至少应包含三类验证：

1. 值验证
   这个字段是不是存在，值对不对。

2. 结构验证
   它在实例上还是原型上，描述符是否合理。

3. 指纹验证
   `toString`、`toString.toString`、`name`、`length`、枚举性、原型链是否像真的。

## 21. 实操顺序建议：先粗补，再精补

推荐顺序如下：

1. 先定位目标参数、cookie、真实调用入口
2. 建最小全局对象
3. 给高风险对象套 `Proxy`
4. 先让代码跑起来
5. 根据 `get/set/has` 访问轨迹补缺失项
6. 把“直接赋值”逐步替换成“构造器 + prototype + 实例”
7. 把关键方法替换成 native 风格函数
8. 修正 getter / setter
9. 修正属性描述符
10. 修正 `name` / `length`
11. 修正 `toString` 及 `toString.toString` 路径
12. 修正 `Object.prototype.toString.call`
13. 修正 `instanceof` / `constructor`
14. 检查 Node 痕迹
15. 检查异常与堆栈
16. 检查 canvas / WebGL 等指纹对象
17. 检查 cookie / storage 是否需要预置真实值
18. 最后回到真实调用点校验结果

## 22. 补环境最终要验证什么

不是“没报错”就算完成。

至少要验证：

- 返回的参数值是否一致
- `document.cookie` 写入是否一致
- 结果长度、格式、字段名是否一致
- 后续请求是否成功
- 是否走了和浏览器相同的调用分支
- 是否触发了隐藏 fallback 逻辑

必要时还要验证：

- 描述符是否一致
- `toString` 是否一致
- `toString.toString` 是否一致
- `name/length` 是否一致
- `instanceof` 是否成立
- 原型链层级是否一致
- 异常类型、错误信息、堆栈是否暴露 Node 痕迹
- cookie / storage 是否与真实页面初始化状态一致

## 23. 对后续 skill 设计最有价值的能力模块

建议优先沉淀这些模块：

- 目标定位模块
- `document.cookie` Hook 模块
- Proxy 吐环境模块
- 最小全局环境模板
- BOM 对象模板
- DOM / `document` 模板
- `Storage` 模板
- `WebSocket` 模板
- `Worker` 模板
- 原型链构建模块
- native `toString` 保护模块
- `toString.toString` 保护模块
- getter / setter 保护模块
- 属性描述符保护模块
- `name` / `length` 对齐模块
- Node 痕迹清理模块
- 异常与堆栈伪装模块
- canvas / WebGL 指纹模块
- cookie / storage 预置状态模块
- 结果校验模块

## 24. 一句话总结

真正成熟的补环境流程，不是“给对象补几个字段”，而是：

先定位真实执行入口，再让环境自吐，再按访问路径逐步补齐对象图，并同时对原型链、原生指纹、访问器、属性描述符、函数元信息、Node 痕迹、异常堆栈、指纹对象、cookie 与 storage 状态做一致性修复，最后回到真实调用点校验结果。
