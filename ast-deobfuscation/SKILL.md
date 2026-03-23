---
name: ast-deobfuscation
description: Use Babel AST to deobfuscate JavaScript by restoring string arrays, decryptor chains, dispatcher objects, control-flow flattening, proxy wrappers, constant expressions, and readable naming. Trigger when code contains `_0x`-style names, string tables, `while/switch` or `for/switch` flattening, self-invoking decode wrappers, dispatcher objects, JSFuck-like expressions, or layered browser anti-bot logic that needs AST-guided recovery rather than simple beautification. Do not use when the code is only minified or the task is only formatting.
---

# ast-deobfuscate

面向 Babel AST 的 JavaScript 解混淆技能。目标不是“尽量美化”，而是尽量恢复可读、可分析、可继续逆向的代码结构。

## Default Strategy

默认优先级：

1. 先做单轮、定向、可解释的 AST 变换。
2. 只有在定向规则无法继续推进时，才使用多轮迭代遍历。
3. 只有在静态无法确认且样本明显依赖运行期解密环境时，才局部 `eval` 最小引导代码。

不要一上来就做“全量多轮 replace + evaluate”。大样本里这类策略容易变慢、误替换，甚至在字面量回写阶段进入近似死循环。

## Core Principle

优先围绕“混淆器产物模式”写规则，而不是围绕“语法节点种类”盲扫。

更稳的方式是：

- 先定位混淆入口：顶层 IIFE、前置解密器、控制流分发器、局部包装函数。
- 再只对目标模式做替换：字符串表恢复、别名链还原、`for/switch` 或 `while/switch` 展平、逗号表达式拆分、包装 IIFE 去除。
- 每完成一组关键替换后，再做一次 `generator -> parser` 重解析，让后续规则在更干净的 AST 上继续工作。

## Fast Triage

先快速判断样本属于哪一类，再决定脚本结构。

### Pattern A: 顶层 IIFE 携带数组参数

常见特征：

- 顶层是 `!function(...){}(...)` 或 `void function(...){}(...)` 一类包装。
- 实参里直接传入多个数组或对象。
- 包装体内部大量 `arr[123]`、`fn(12)`、`String.fromCharCode(...)`、`split('').reverse().join('')`。
- 控制流部分常见 `for(...; ![];) { switch(...) { ... } }`。

推荐处理顺序：

1. 从顶层调用提取 `formalParam -> actualArg` 映射。
2. 只替换明确命中的数组下标访问，不要全局乱替换。
3. 处理包装函数中直接可展开的语句块。
4. 展平 `for/switch` 或 `while/switch` 控制流。
5. 重解析一次。
6. 再做字符串别名传播、`String.fromCharCode` 求值、数组 `join('')` 还原、反转拼接还原。

### Pattern B: 前几条语句就是解密引导代码

常见特征：

- 文件开头几条语句就初始化字符串解密器或控制变量。
- 中间出现多个别名，例如 `var a = decrypt; var b = a;`。
- 后面大量 `a(12)`、`b(34)` 一类调用。
- 还会混入 `SequenceExpression`、`for/switch` 控制流。

推荐处理顺序：

1. 只截取前几条引导语句，拼出最小可运行解密环境。
2. `eval` 这几条最小代码，不要直接执行整个源文件。
3. 根据 binding 追踪别名链，把只带数字字面量参数的调用替换成字符串字面量。
4. 删除已经消费掉的引导语句。
5. 展平单一控制变量驱动的 `for/switch`。
6. 拆分 `SequenceExpression`。

### Pattern C: 顶层 IIFE 展开后，局部函数里还有二次字符串恢复

常见特征：

- 顶层 body 先被包装在一个自执行函数里。
- 解密函数在前两条或前几条声明里。
- 去掉第一层后，函数体内部还有 `new Xxx()['prop']`、成员访问数组、局部索引访问恢复。
- 样本里会混入 `!function(){}()` 或 `!(()=>{})()` 一类无参包装。

推荐处理顺序：

1. 先把顶层 IIFE 的 body 提出来替换 `program.body`。
2. 执行最小解密引导，只恢复明确的数字下标调用。
3. 删除已消费的引导声明。
4. 拆分逗号表达式。
5. 去掉无参自执行包装。
6. 重解析一次。
7. 再识别函数内部那组“构造器 + 成员表达式 + 数字下标”的字符串恢复模式。

## Practical Transform Rules

### 1. 只对“确定可还原”的节点做替换

适合直接替换的场景：

- 数组字面量下标访问，且下标是 `NumericLiteral`。
- 调用参数全是数字或纯字面量，且你已经建立了最小解密环境。
- `['a','b','c'].join('')`、`String.fromCharCode(...)`、`split('').reverse().join('')` 这种纯计算表达式。
- 明确的字符串别名链：`var a = 'x'; var b = a;`。

不确定就不要替换。宁可少做一步，也不要把控制流或环境依赖表达式错误内联。

### 2. 控制流展平优先写“定向 visitor”

处理 `for/switch`、`while/switch` 时，不要写成通用大而全解法，优先针对当前样本结构：

- 先验证 `init/test/update/body` 形状是否固定。
- 提取 `switchCaseMap`。
- 按控制数组或控制变量顺序拼接 block。
- 丢掉 `continue`、仅用于跳转的赋值、无意义 `break`。

只要结构不匹配，就直接跳过，不要强行展平。

### 3. `SequenceExpression` 要按父节点分类拆分

至少区分：

- `ExpressionStatement`
- `ReturnStatement`
- `VariableDeclarator`

不同父节点下，拆法不同。不要把所有逗号表达式都简单改成多条表达式语句。

### 4. 去包装 IIFE 时，优先处理“零参、立即执行、纯包裹”模式

例如：

```js
!function(){ ... }();
```

如果满足：

- 外层是 `UnaryExpression('!')` 或等价包装。
- `argument` 是 `CallExpression`。
- `callee` 是 `FunctionExpression`。
- 无参数、无实参。

这类一般可以直接取函数体展开。

### 5. 局部 `eval` 只运行最小必需代码

允许 `eval` 的典型场景：

- 前 2 到 5 条语句就能构造出字符串解密函数。
- 一个函数声明内部只做纯字符串恢复。
- 明确的 `String.fromCharCode` 或拼接恢复函数。

禁止：

- 直接 `eval` 整个源文件。
- 在不隔离环境的情况下执行带浏览器依赖的大段代码。
- 对含有明显副作用的逻辑做批量运行。

## Sentinel Cleanup

某些样本会在条件测试位里塞“哨兵对象比较”来污染逻辑，例如：

```js
cond && fn(...) !== {}
cond && fn(...) === {}
```

这类模式经常出现在：

- `if (...)`
- `for (...; test; ...)`
- `while (test)`

如果已经确认右侧只是混淆器注入的测试位噪音，而不是业务必须副作用，可以做窄化清理：

- 只处理测试表达式位置。
- 只处理 `&&` 右侧是“调用结果与空对象字面量比较”的情况。
- 直接保留左侧条件，删除右侧哨兵比较。

这是一个定向规则，不要默认推广到所有逻辑表达式。

## Reparse Points

以下节点处理完后，建议立即重解析一次：

- 顶层 IIFE 展开后。
- 大块控制流展平后。
- 一轮字符串恢复后。
- 大量 `replaceWithMultiple` 之后。

推荐方式：

```js
ast = parser.parse(
  generator(ast, { compact: false, comments: false, jsescOption: { minimal: true } }).code,
  { sourceType: 'unambiguous' }
);
```

## Avoid These Mistakes

- 不要把 `StringLiteral`、`NumericLiteral`、`BooleanLiteral` 自己也纳入“继续 evaluate 并回写”的循环，否则很容易重复替换同值节点，导致低效甚至近似死循环。
- 不要对所有 `CallExpression` 都尝试 `eval`。
- 不要在不验证 binding 的情况下做别名传播。
- 不要假设所有 `LogicalExpression` 都能安全折叠，尤其是可能含副作用调用时。
- 不要为了“完全还原”而牺牲稳定性。先拿到结构可读、核心字符串已恢复、主要控制流已展开的结果。

## Preferred Output Standard

一个合格的解混淆结果至少应满足：

- 主要字符串表已经恢复。
- 主要控制流展平已经完成。
- 包装 IIFE 和明显别名链已去掉。
- 代码可以再次被 Babel 正常解析。
- 输出中 `_0x` 风格残留显著减少，且剩余部分集中在暂时无法静态确认的区域。

## Working Style

执行时按这个顺序组织工作：

1. 先读样本前 100 到 300 行，确认入口结构。
2. 写单个定向脚本，不要先拆成很多轮。
3. 只在关键阶段重解析。
4. 跑脚本并验证输出可解析。
5. 再与期望结果做 AST 级别比较，而不是只看文本是否一模一样。
6. 如果 AST 已一致但文本不同，优先判断是否只是字面量 raw、引号风格、Unicode 转义差异。

## Validation

优先做这几类验证：

- `node --check` 确认脚本本身无语法错误。
- 运行脚本生成 `target_deobf.js`。
- 用 Babel 重新 parse 产物，确认无语法损坏。
- 用“去掉 loc/start/end/extra 后的 AST JSON”比对产物与期望文件，而不是只做文本 diff。

如果文本不同但 AST 一致，视为成功。
