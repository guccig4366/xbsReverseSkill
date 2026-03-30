# GitHub 代码级补环境设计笔记

这份笔记不是“仓库推荐清单”，而是把几套 GitHub 补环境框架拆成更接近未来 skill 设计稿的模块说明。

目标只有一个：为后续构建“JS 逆向补环境 skill”沉淀可复用的代码结构、流程和取舍标准。

## 1. 这份笔记解决什么问题

围绕下面八个模块做代码级拆解：

- 原型链模块
- native `toString` 模块
- 描述符模块
- `navigator` 模块
- `document` 模块
- `Storage` 模块
- 指纹模块
- Proxy 吐环境模块

同时把这些横切难点一起纳入设计视角：

- Node 环境检测
- `document.all` 不可检测对象
- 报错异常与堆栈清洗
- `toString.toString` 二次检测
- getter / setter / 方法描述符保护
- 函数 `name` / `length` 对齐
- `webdriver` / `plugins` / `mimeTypes` / `getBattery`
- `canvas` / `WebGL` 指纹
- `cookie` / `localStorage` / `sessionStorage` 初始状态

## 2. 仓库价值映射

这批仓库里，最值得吸收的不是“整仓照抄”，而是分工：

- `node-sandbox`
  - 最像“底层修复层”
  - 强项是 `document.all`、堆栈清洗、不可变原型、复杂 `navigator.plugins/mimeTypes` 图结构、`getBattery`、`canvas/WebGL`
- `qxVm`
  - 最像“工程化框架层”
  - 强项是模块拆分、`safefunction`、描述符保护、可配置 Proxy 吐环境、对象级文件布局
- `catvm`
  - 最像“教学拆解层”
  - 强项是把补环境拆成非常清楚的步骤，适合沉淀为 skill 的解释文本
- `boda_jsEnv`
  - 最像“配置采集与批量生成层”
  - 强项是浏览器侧采集、指纹种子、dispatch 分发、海量对象生成
- `sdenv`
  - 最像“jsdom + 定点增强层”
  - 强项是 `document.all` 的 native addon 路线、`navigator` getter native 化、定向浏览器对象修补
- `v_jstools`
  - 更像“前置采集工具链”
  - 更适合用于网页分析、注入、导出环境，而不是直接当补环境框架骨架

## 3. 原型链模块

### 3.1 最有参考价值的来源

- `node-sandbox/util/init_env.js`
- `qxVm/qxVm_sanbox/env/*`
- `catvm/__bak/step.js`
- `boda_jsEnv/bodaEnv/env/*`

### 3.2 GitHub 里反复出现的核心套路

第一类是“先构造函数，再原型，再实例”。

- 先定义构造函数，并让非法 `new` 时抛 `Illegal constructor`
- 再把原型链接对
- 最后才创建实例对象并挂到 `window`

第二类是“实例属性与原型属性分层”。

- 原型上放方法、访问器、只读能力
- 实例上放真实环境值和状态
- 不要把原本应该在原型上的东西全部平铺到实例上

第三类是“复杂对象图要同时补链和补引用关系”。

- `navigator.plugins` 不是普通数组
- `PluginArray -> Plugin -> MimeType` 和 `MimeTypeArray -> MimeType -> enabledPlugin` 是互相引用的图
- 只补值不补图结构，很容易被检测

### 3.3 代码级启发

`node-sandbox` 的路线更偏真实运行态：

- 在 `util/init_env.js` 里大量使用 `Object.setPrototypeOf`
- `document.all` 直接挂到 `HTMLAllCollection.prototype`
- `navigator.plugins`、`navigator.mimeTypes`、`location`、`Storage` 都明确接回对应原型

`qxVm` 的路线更偏“模块化对象工厂”：

- 每个对象一个文件
- 每个文件内都区分构造函数、属性映射、函数映射、保护逻辑
- 适合未来 skill 输出“补某个对象模块”

`catvm` 的教学价值非常高：

- 明确提出先看真浏览器原型链，再决定属性该放原型还是实例
- 这很适合写进 future skill 的流程说明

### 3.4 应该沉淀到 future skill 的结论

- skill 必须先做“对象拓扑建模”，再做属性填充值
- skill 输出不能只是一段平铺赋值脚本，至少要区分：
  - 构造函数层
  - prototype 层
  - instance 层
  - `window/globalThis/self/top` 挂载层
- skill 需要有“复杂图对象模板”：
  - `PluginArray`
  - `MimeTypeArray`
  - `Storage`
  - `Location`
  - `Navigator`
  - `Document`

## 4. native `toString` 模块

### 4.1 最有参考价值的来源

- `qxVm/qxVm_sanbox/env/TOOLS/vm_protection.js`
- `catvm/CatVm2/tools/vm_safefunction.js`
- `sdenv/browser/chrome/navigator.js`
- `node-sandbox/README.md`

### 4.2 这一模块为什么是补环境的核心

绝大多数初级补环境失败，不是因为值补少了，而是因为：

- 函数 `toString()` 露馅
- getter / setter 的 `toString()` 露馅
- `toString.toString()` 二次检测露馅
- 方法名、`name`、`length`、`prototype` 描述符不对

### 4.3 GitHub 里最值得吸收的套路

`qxVm` 和 `catvm` 都采用了同一类思路：

- 接管 `Function.prototype.toString`
- 用私有符号保存伪造的 native 字符串
- 调 `func.toString()` 时返回该伪造串
- 再对新的 `Function.prototype.toString` 自身做一层保护
- 从而尽量过掉 `location.reload.toString.toString()` 这一类检测

这是 future skill 里必须作为独立模块存在的能力。

### 4.4 skill 设计上必须拆出的子能力

- `protectFunctionNative(fn, displayName?)`
  - 保护普通函数
- `protectGetter(target, key)`
  - 保护 getter 的 `toString`
- `protectSetter(target, key)`
  - 保护 setter 的 `toString`
- `protectFunctionToStringSelf()`
  - 专门处理 `toString.toString`
- `repairFunctionMeta(fn, expectedName, expectedLength)`
  - 修正 `name`、`length`

### 4.5 这里的关键判断

如果 future skill 没有统一的 native 保护层，那么后面补：

- `navigator.getBattery`
- `document.cookie` 的 getter/setter
- `location.reload`
- `Storage.prototype.getItem`
- `WebSocket`
- `Worker`

这些对象时，几乎都会重复暴露。

也就是说，`toString` 保护层必须是底座，不是附加项。

## 5. 描述符模块

### 5.1 最有参考价值的来源

- `qxVm/qxVm_sanbox/env/TOOLS/vm_protection.js`
- `node-sandbox/README.md`
- `boda_jsEnv/bodaEnv/tools/globalThis.js`
- `boda_jsEnv/bodaEnv/env/*`

### 5.2 GitHub 里出现的三条主线

第一条是“统一走 `Object.defineProperty` / `defineProperties`”。

原因很简单：

- 直接赋值很难精确控制 `enumerable`
- 不方便处理只读属性
- 不方便保持 getter/setter 形态

第二条是“给 prototype 和 constructor 单独做保护”。

`qxVm` 里专门有 `safeDescriptor_addConstructor`：

- 保护 `Obj.prototype`
- 保护 `Obj.prototype.constructor`

第三条是“getter/setter/function 的描述符保护不能分散写”。

`qxVm.safe_Objattribute` 的价值就在这里：

- 输入一组 getter 名
- 输入一组 setter 名
- 输入一组函数名
- 统一做 `safefunction`

### 5.3 未来 skill 必须具备的能力

- 读取目标浏览器对象的描述符快照
- 输出“实例描述符层”和“原型描述符层”
- 区分：
  - 数据属性
  - 访问器属性
  - 方法属性
- 自动补：
  - `configurable`
  - `enumerable`
  - `writable`
  - getter / setter 引用
  - `constructor`
  - `Symbol.toStringTag`

### 5.4 不能忽略的细节

- `Function.prototype.toString` 本身的 `name`、`length`、`prototype` 描述符要处理
- 访问器函数本身也要 native 化
- 某些对象在 `window` 上是不可枚举的，不能简单 `window.Foo = Foo`
- 仅把值补对而描述符错掉，仍然会被 `getOwnPropertyDescriptor`、`ownKeys`、`propertyIsEnumerable` 打穿

## 6. `navigator` 模块

### 6.1 最有参考价值的来源

- `node-sandbox/util/init_env.js`
- `node-sandbox/util/cover_function.js`
- `qxVm/qxVm_sanbox/env/BOM/Navigator.js`
- `sdenv/browser/chrome/navigator.js`
- `boda_jsEnv/bodaEnv/env/Navigator.js`
- `boda_jsEnv/bodaEnv/config/changeDom.js`

### 6.2 这一模块的真实难点

不是把 `userAgent` 填上就结束，而是要同时处理：

- `webdriver`
- `userAgent`
- `platform`
- `vendor`
- `languages`
- `plugins`
- `mimeTypes`
- `userAgentData`
- `connection`
- `webkitPersistentStorage`
- `webkitTemporaryStorage`
- `getBattery`

### 6.3 哪套代码最值得学什么

`node-sandbox` 最值得学“真实对象图”：

- 不是简单数组，而是完整接回 `PluginArray.prototype`
- 每个 `Plugin` 下再挂 `MimeType`
- 每个 `MimeType` 再反向指回 `enabledPlugin`

这对过 `plugins/mimeTypes` 检测非常重要。

`qxVm` 最值得学“配置映射”：

- 用 `$attribute_map` 收口环境值
- getter 内统一做 `Illegal invocation` 检查
- 适合 future skill 产出模块化代码

`sdenv` 最值得学“getter native 化”：

- 给 `userAgent`、`platform`、`appVersion`、`vendor`、`connection` 等 getter 做 native 保护

`boda_jsEnv` 最值得学“浏览器侧采集”：

- `changeDom.js` 直接从真实浏览器导出 `navigator`、`screen`、`cookie`、`storage`
- 适合作为 future skill 的采集前置步骤

### 6.4 未来 skill 的设计建议

把 `navigator` 拆成五个子模块：

- `navigator-basic`
  - `userAgent`、`appVersion`、`platform`、`vendor`、`language`
- `navigator-automation`
  - `webdriver`
  - `permissions`
  - 可能的 headless 标志
- `navigator-plugin-graph`
  - `plugins`
  - `mimeTypes`
  - 双向引用关系
- `navigator-device`
  - `hardwareConcurrency`
  - `deviceMemory`
  - `maxTouchPoints`
  - `pdfViewerEnabled`
- `navigator-async-capability`
  - `getBattery`
  - `storage`
  - `connection`
  - `userAgentData`

### 6.5 对你当前目标最重要的结论

未来 skill 不能把 `navigator` 当成一个单文件补完任务，而要把它当成“最复杂的检测入口”。

优先级应当是：

1. `webdriver`
2. `plugins/mimeTypes`
3. `userAgent/platform/vendor/languages`
4. `getBattery`
5. `userAgentData`
6. `connection`

## 7. `document` 模块

### 7.1 最有参考价值的来源

- `sdenv/browser/chrome/document.js`
- `sdenv/test/documentAll.test.js`
- `node-sandbox/util/init_env.js`
- `qxVm/qxVm_sanbox/env/DOM/Document.js`
- `qxVm/qxVm_sanbox/env/DOM/document_.js`
- `boda_jsEnv/bodaEnv/env/Document.js`

### 7.2 这个模块里最关键的是 `document.all`

这是补环境里必须单独对待的对象。

从现有仓库看，有两条路线：

第一条是 `sdenv` 的 native addon 路线：

- 直接通过 `getDocumentAll()` 生成对象
- 测试里明确覆盖：
  - `da == undefined` 为 `true`
  - `da === undefined` 为 `false`
  - `typeof da` 为 `"undefined"`
  - `da()` 返回 `null`

第二条是 `node-sandbox` 的底层对象路线：

- `document.all = new wanfeng.xtd`
- 再把其原型接到 `HTMLAllCollection.prototype`
- README 里明确说明重新引入底层 `setUndetectable`，就是为了 `document.all`

### 7.3 这里应当得出的结论

纯 JS 路线可以模拟很多对象，但 `document.all` 这种“不可检测对象”很难完全靠普通脚本等价复刻。

因此 future skill 应该把 `document.all` 标为：

- `Tier-1: 可完全脚本化`
  - 普通 `document` 属性
  - `cookie`
  - 常规 getter/setter
- `Tier-2: 需底层支持或降级策略`
  - `document.all`
  - undetectable object
  - 特殊 `typeof`

### 7.4 `document` 模块本身怎么拆

建议未来 skill 至少拆成：

- `document-basic`
  - `URL`
  - `referrer`
  - `documentURI`
  - `readyState`
  - `visibilityState`
- `document-cookie`
  - `cookie` getter/setter
  - 同步 `jsonCookie`
- `document-query`
  - `getElementById`
  - `querySelector`
  - `createElement`
  - `createExpression`
- `document-special`
  - `all`
  - `scripts`
  - `plugins`
  - 其他站点敏感接口

### 7.5 skill 应该吸收的流程点

- 先从 Proxy 吐环境里看哪个 `document.xxx` 是 `undefined`
- 再确认它是真缺对象、缺值、缺 getter，还是缺原型
- 如果是 `document.all`，应立刻标为特殊分支，而不是继续普通补值

## 8. `Storage` 模块

### 8.1 最有参考价值的来源

- `qxVm/qxVm_sanbox/env/BOM/Storage.js`
- `catvm/CatVm2/browser/Storage.js`
- `node-sandbox/util/init_env.js`
- `boda_jsEnv/bodaEnv/env/Storage.js`
- `boda_jsEnv/bodaEnv/config/configFormChrome.js`

### 8.2 这一模块看似简单，实际有三个层面

第一层是对象链：

- `localStorage.__proto__ === Storage.prototype`
- `sessionStorage.__proto__ === Storage.prototype`

第二层是行为：

- `length`
- `key`
- `getItem`
- `setItem`
- `removeItem`
- `clear`

第三层是状态：

- 初始 key/value
- 业务 cookie 同步
- 站点侧 token / sign / deviceId 缓存

### 8.3 各仓库的价值

`qxVm` 很适合做通用模板：

- `length` 直接按 `Object.keys(this).length`
- 方法都集中在 `Storage.prototype`

`catvm` 的优点是直观：

- 用一个内存对象做状态存储
- 适合做最小可用版本

`node-sandbox` 负责把实例链接对：

- `localStorage` / `sessionStorage` 接回 `Storage.prototype`

`boda_jsEnv` 最适合处理“预置状态”：

- 浏览器侧读取真实 `localStorage`
- 导出到配置
- Node 侧初始化时灌回去

### 8.4 未来 skill 的设计建议

把 `Storage` 拆成两个层面：

- `storage-shape`
  - 原型链
  - 方法
  - 描述符
  - native 保护
- `storage-state`
  - 真实 key/value
  - cookie 联动
  - 站点初始化快照

这样 skill 才能区分：

- “补接口”
- “补业务状态”

## 9. 指纹模块

### 9.1 最有参考价值的来源

- `node-sandbox/util/cover_function.js`
- `node-sandbox/util/globalMy.js`
- `qxVm/qxVm_sanbox/env/DOM/WebGLRenderingContext.js`
- `boda_jsEnv/bodaEnv/tools/toolsFunc.js`
- `boda_jsEnv/bodaEnv/config/changeDom.js`

### 9.2 当前最值得学的对象

- `canvas`
- `WebGL`
- `screen`
- `Battery`
- `navigator.device*`

### 9.3 两条主流思路

第一条是“固定指纹返回值”。

`node-sandbox`：

- `HTMLCanvasElement.getContext('webgl')` 时返回 `WebGLRenderingContext` 风格对象
- 把 `toDataURL` 指向预置的 WebGL 指纹 base64

第二条是“指纹种子池 + 随机取样”。

`boda_jsEnv.toolsFunc.initEnvFingerPrint()`：

- 维护 `WebGLRenderingContext_getParameter_37446` 候选池
- 维护 `BatteryManager_level`
- 维护 `canvas` / `webgl` base64
- 维护一组 `screen/window` 尺寸组合

这条路线更适合 skill，因为它天然支持配置化。

### 9.4 `qxVm` 的价值

`qxVm` 不一定提供最真实的完整指纹，但它提供了“对象模块化承载方式”：

- `WebGLRenderingContext` 单独成文件
- `getParameter(37445/37446)` 这类关键点可以单独覆写

这很适合 future skill 生成“只修一个检测点”的补丁。

### 9.5 未来 skill 应该怎么拆

- `fingerprint-canvas`
  - `toDataURL`
  - `getImageData`
  - 2D 绘图结果
- `fingerprint-webgl`
  - `getParameter`
  - `getExtension`
  - `getSupportedExtensions`
  - `getShaderPrecisionFormat`
- `fingerprint-screen`
  - `screen.width/height`
  - `availWidth/availHeight`
  - `window.inner/outer*`
- `fingerprint-battery`
  - `getBattery`
  - Battery 对象值

### 9.6 关键原则

不要把指纹模块做成“纯随机”。

更合理的是：

- 同一会话内稳定
- 各字段彼此一致
- 与 `navigator.platform`、`screen`、`UA` 尽量匹配

否则反而会制造新的指纹冲突。

## 10. Proxy 吐环境模块

### 10.1 最有参考价值的来源

- `qxVm/qxVm_sanbox/env/TOOLS/vm_proxy.js`
- `catvm/CatVm2/tools/vm_proxy.js`
- `sdenv/browser/chrome/document.js`
- `v_jstools` 的浏览器侧注入思路

### 10.2 为什么这是补环境流程的入口

你前面提到的一点非常关键：

- 一般是根据 Proxy 吐出来的值是否为 `undefined` 来判断是否需要补环境

这和现有框架经验是完全一致的。

补环境真正高效的流程，不是先列全对象，而是：

1. 让页面跑起来
2. 用 Proxy / Hook 吐访问路径
3. 定位 `undefined`、异常、非法调用、原型不匹配
4. 只补最短缺口

### 10.3 各仓库的区别

`catvm` 是最小版：

- 只做 `get` / `set`
- 适合教学、理解“吐环境”的本质

`qxVm` 是工程版：

- `get`
- `set`
- `has`
- `deleteProperty`
- `getOwnPropertyDescriptor`
- `defineProperty`
- `getPrototypeOf`
- `setPrototypeOf`
- `preventExtensions`
- `isExtensible`
- `ownKeys`
- 并且会继续代理返回的对象和函数

这才是真正适合 future skill 沉淀的路线。

### 10.4 future skill 应该输出的日志类型

建议统一分成四类：

- `missing`
  - 访问得到 `undefined`
- `shape`
  - 原型链、`instanceof`、`ownKeys`、描述符异常
- `invoke`
  - `Illegal invocation`
  - `TypeError`
  - 参数签名异常
- `fingerprint`
  - `canvas`
  - `WebGL`
  - `battery`
  - `plugins`

### 10.5 未来 skill 里最值得加的能力

- 路径聚合
  - 把高频访问路径折叠统计
- 自动分层建议
  - 判断这是缺值、缺 getter、缺原型、缺描述符、缺特殊对象
- 补环境优先级排序
  - 先补能让主流程继续执行的缺口
- 回归验证
  - 同一路径第二次访问是否仍为 `undefined`

## 11. 横切能力：必须专门预留的特殊模块

这些不属于单一对象模块，但 future skill 必须预留接口。

### 11.1 Node 环境检测

至少要考虑：

- `process`
- `global`
- `Buffer`
- `require`
- `module`
- Node 特有堆栈痕迹

从当前仓库经验看，真实做法不是只删几个全局，而是：

- 调整执行容器
- 清洗错误堆栈
- 避免把 Node 痕迹透给页面逻辑

`node-sandbox` 的 `Utils.Error_get_stack` 很值得吸收，它不是只改一行字符串，而是按规则删除运行时栈帧。

### 11.2 `document.all`

这是特殊对象，不建议在 future skill 里伪装成“普通 JS 模块可完全搞定”。

更合理的设计是：

- 明确标记为特殊能力
- 标注需要：
  - native addon
  - V8 API
  - 或降级兼容策略

### 11.3 异常与堆栈检测

未来 skill 应至少支持：

- 栈帧过滤
- 文件名伪装
- `evalmachine.<anonymous>` 替换
- 去掉内部包装函数痕迹

### 11.4 `cookie` / `localStorage` / `sessionStorage` 业务态

很多页面不是只检查对象形状，而是直接读业务值。

因此 future skill 不能只生成：

- `Storage.prototype.getItem`

还要支持：

- 从浏览器导出真实状态
- 灌入 Node 环境
- 保持 cookie 与 storage 的站点态一致

## 12. 更接近 skill 的补环境流程

结合这些仓库，比较合理的流程不是“补全浏览器”，而是“按缺口驱动”：

### 阶段 1：采集真实环境

- 从真实浏览器导出：
  - `navigator`
  - `screen`
  - `location`
  - `document`
  - `localStorage`
  - `sessionStorage`
  - `cookie`
  - 指纹样本

推荐吸收：

- `boda_jsEnv/config/changeDom.js`
- `v_jstools` 的页面侧注入思想

### 阶段 2：建立对象骨架

- 先建构造函数
- 再建 prototype
- 再建实例
- 再挂全局
- 再补 `Symbol.toStringTag`
- 再补 constructor / prototype 描述符

推荐吸收：

- `qxVm`
- `catvm`
- `node-sandbox`

### 阶段 3：统一 native 与描述符保护

- 统一保护函数
- 统一保护 getter/setter
- 统一修正 `name` / `length`
- 统一处理 `toString.toString`

推荐吸收：

- `qxVm/vm_protection.js`
- `catvm/vm_safefunction.js`

### 阶段 4：接入 Proxy 吐环境

- 从主对象开始代理：
  - `window`
  - `document`
  - `navigator`
  - `location`
  - `localStorage`
  - `sessionStorage`
- 记录：
  - `undefined`
  - `Illegal invocation`
  - `descriptor mismatch`
  - `prototype mismatch`

推荐吸收：

- `qxVm/vm_proxy.js`

### 阶段 5：按缺口补丁

补丁优先级建议：

1. 缺对象导致主流程中断
2. getter / setter 非法调用
3. 描述符异常
4. 指纹异常
5. 特殊对象，如 `document.all`

### 阶段 6：回归验证

- 同一条调用链重跑
- 看是否从：
  - `undefined`
  - `TypeError`
  - `Illegal invocation`
  - 栈暴露

变成可继续执行

## 13. 未来 skill 最值得优先实现的代码块

如果后续正式写 skill，最应该先沉淀的不是“某站专用补环境脚本”，而是下面这些通用块：

1. `prototype-builder`
   - 构造函数、原型、实例、全局挂载
2. `native-protector`
   - `Function.prototype.toString`
   - getter / setter / 方法 native 化
   - `toString.toString`
3. `descriptor-guard`
   - `constructor`
   - `prototype`
   - `Symbol.toStringTag`
   - 访问器/方法描述符
4. `navigator-plugin-graph`
   - `plugins`
   - `mimeTypes`
   - `enabledPlugin`
5. `document-special`
   - `cookie`
   - `document.all`
6. `storage-state-loader`
   - cookie / localStorage / sessionStorage 导入
7. `fingerprint-seed`
   - `canvas`
   - `WebGL`
   - `battery`
   - `screen`
8. `proxy-observer`
   - 访问路径聚合
   - 缺口诊断
   - 回归验证

## 14. 实现路线建议

如果只从当前 GitHub 仓库里提炼可落地的 skill 设计路线，那么未来补环境 skill 的最佳组合不是单选，而是拼装：

- 原型链和底层特殊对象：以 `node-sandbox` 为最高参考
- native 保护、描述符保护、Proxy 工程化：以 `qxVm` 为最高参考
- 教学化流程表达：以 `catvm` 为最高参考
- 指纹配置池与浏览器侧采集：以 `boda_jsEnv` 为最高参考
- `document.all` addon / jsdom 定点增强：以 `sdenv` 为最高参考
- 浏览器侧注入与自动采集工具链：以 `v_jstools` 为补充参考

换句话说，这一节存在于 skill 中的目的，是帮助后续实现时快速决定“该参考谁来写哪一层能力”，避免：

- 把 skill 写成一堆站点专用补丁
- 把底层能力和采集能力混在一起
- 在 `document.all`、native 保护、Proxy、指纹模块上反复走弯路

更直接的执行建议是：

- 用 `catvm` 的流程说明来教怎么做
- 用 `qxVm` 的工程结构来组织代码
- 用 `node-sandbox` 的底层经验补最难的检测点
- 用 `boda_jsEnv` 的采集和指纹配置来喂数据
- 用 `sdenv` 处理 `document.all` 这类特殊对象

它不会直接改变补环境运行结果，但会直接影响：

- 模块拆分方式
- 参考代码的优先级
- 后续补环境能力是否能长期复用

这才更接近“可复用补环境 skill”，而不是“又一份站点脚本”。
