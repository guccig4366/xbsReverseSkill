# 算法家族与站点模式

## 一、标准签名题

### 统一结构

```text
request params
-> normalize / stringify / sort
-> inject token / timestamp / cookie / ua
-> hash / encrypt
-> final sign
```

### 高频站点模式

#### 财联社

- 典型链：`query string -> SHA1 -> MD5`
- 真正难点：参数排序、URL 编码、query string 一致性

#### 百度翻译

- `token` 来自页面
- `sign` 来自前端函数
- 典型价值：页面态参数与 JS 纯算参数分离

#### 有道翻译

- 请求签名：`client + mysticTime + product + key -> MD5`
- 响应侧还存在固定 seed 派生的 `AES-CBC` 解密
- 典型价值：同题同时训练请求签名和响应解包

#### 淘宝 H5

- 典型链：`token&t&appKey&data -> MD5`
- 真正难点：token 提取、`t` 一致性、紧凑 JSON

## 二、混合加密题

### 统一结构

```text
明文
-> 对称加密
-> 对称加密或再次包装
-> 编码
-> params

随机 key
-> reverse / transform
-> RSA / SM2
-> encSecKey / signature
```

#### 网易云音乐

- 双层 AES-CBC + RSA
- 重点不是入口，而是“业务数据”和“密钥包装”分层

## 三、Cookie / Header / 多参数联动题

### Cookie 题

统一结构：

```text
环境采集
-> builder
-> hash / encrypt / encode
-> document.cookie 写入
```

最稳入口：

- Hook `document.cookie`
- 回栈看 builder
- 继续追环境采集层

#### 盼之 cookie

- 典型价值：从 cookie sink 反推 IIFE 和 builder

### 多参数联动题

#### 滴滴 `dd03 / dd05 / wsgsig`

- `dd03` 更偏纯算层
- `dd05` 更偏运行时或 webpack/VMP 层
- `wsgsig` 更像收口层
- 最稳打法：先拆组成件，再拆最终收口件

#### 某农网 `X-CLIENT-SIGN`

- 先盯最终缺的 header
- 再把真正返回它的混淆函数整段收缩

## 四、JSVMP / VMP 题

### 共同策略

1. 不从文件头正推。
2. 先找最终 writer 和最终返回值。
3. 先恢复中间数组 / 中间对象 / payload。
4. 再恢复最终编码层。

### 小红书 `X-s / X-t / X-S-Common`

- 第一入口是 `window._webmsxyw()`，不是最终 header 串。
- 必须把 `X-s` 和 `X-S-Common` 分开看。
- `X-S-Common` 体现的是 header 家族和环境/指纹字段联动。
- 高频中间结构：`x1 / x2 / x3 / x4 / payload`。
- 同站点多文章要分“入口定位”“AST 解混”“JSVMP 结构”“环境位串”“算法骨架”五种思路记录。

### 抖音 `a_bogus`

- 不要把它简化成 `SM3 + RC4 + Base64`。
- 真正难点是多段数组、状态推进、时间戳/随机数/UA/环境材料如何进入 96/128/136 位数组。
- 最该保存的检查点：双 SM3 输出、41 位浏览器数组、50 位主数组、96/128/136 位数组、最终 `a_bogus`。

### QQ 音 / Spiderdemo / 复杂 VMP

- 更适合当“标准题”和“超重型对抗题”之间的过渡训练。
- 优先练 webpack 入口定位、最终 writer 确认、协议/页面回填拆分。

## 五、Wasm / 协议题

### Wasm

优先顺序：

1. 找加载点
2. 找 Wasm URL
3. 看 `instance.exports`
4. 用固定输入验证输出
5. 再决定是否反编译

### Protobuf / WebSocket

- 先数包或先确认 message type
- 先拆协议线和页面线
- 不要一开始就把二进制题当“某个 sign 函数”

#### Spiderdemo T6

- 重点不是 sign，而是 protobuf + 页面占位回填

## 六、国密题

### SM3

- 经常作为最终签名层或中间摘要层出现
- 真正要对齐的是：原始明文、SM3 输入字节、SM3 输出、后续 builder 输入

### SM4

- 分析重点和 AES 类似：key、iv、模式、padding、编码层

### SM2

- 更适合作为“识别型知识”
- 先确认它是不是关键层，再决定是否优先迁移

## 七、最小落地接口

优先收敛成这类分层：

```text
build_context
-> build_raw_string / build_payload
-> crypto_or_vm_layer
-> validate_checkpoints
-> final_output
```

不要把所有逻辑塞进一个大函数里。