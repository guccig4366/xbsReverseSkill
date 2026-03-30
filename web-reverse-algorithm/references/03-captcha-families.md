# 验证码与 challenge 家族

## 一、验证码统一拆法

先拆 5 条线：

1. 初始化 / challenge 线
2. 图像或题面识别线
3. 参数 builder 线
4. 环境 / 指纹 / collect 线
5. 最终 verify 线

每条线都单独保存证据，不要混写。

## 二、高频字段

- `collect`
- `pow_answer`
- `pow_calc_time`
- `w`
- `fs`
- `ac_c`
- `Signature`
- `SignatureNonce`
- `captcha_collect`
- `behavior`
- `token`
- `challenge`
- `lot_number`
- `payload`

不要只看它像不像密文，要看：

1. 删除后是否失败
2. 伪造后是否失败
3. 是否与识别结果、时间戳、环境值绑定

## 三、站点家族

### 腾讯滑块 / TCaptcha

两条路线要分开：

1. `prehandle -> 图像 -> gap -> PoW -> collect -> verify` 的纯 HTTP 工程链
2. `tdc.js / VM / collect` 的补环境 + VMP 链

重点：

- `pow_answer` 与 `pow_calc_time`
- `collect`
- 轨迹与 gap 的一致性
- 不要把腾讯题误写成“只靠图像和轨迹”

### 极验 3/4 代

#### 三代

- 高价值入口：搜 `"\u0077"`
- 重点不是只盯最终 `w`，而是记录 `h + u`

#### 四代

- `captcha_id` 更像固定配置
- `challenge` 更像运行时生成值
- 必须记录 `load` 返回对象

### 网易盾

统一链：

```text
初始化
-> 图片接口
-> 距离识别
-> userAnswer
-> P1~P9
-> w
-> verify
```

重点：

- 图片接口返回对象要保留
- `userAnswer` 可能是距离、比例、固定分隔材料、时间戳的组合
- 不能只做图像，不做 `w`

### 百度旋转 / 阿里 v2 / 某多多

- 某度旋转：图像角度恢复 + `fs/ac_c/tk`
- 某里 v2：`SignatureNonce / Signature / 排序+编码` 更重
- 某多多：图片/标题解密 + 坐标 verify + `captcha_collect`

### V5 / WebSocket challenge

- 先数包，再分首包、图片包、验证包
- 不要在协议边界不清时直接猜算法

### hCaptcha / Cloudflare / PerimeterX 一类强对抗 challenge

- 需要从一开始就把 `WASM + 指纹 + 状态机 + challenge 请求链` 分层
- 这些题常常同时存在“纯算路线”和“环境拟合路线”

## 四、验证码统一检查点

每题至少保存：

1. 初始化请求参数
2. 图片或 challenge 资源返回值
3. 识别结果
4. 轨迹明文
5. builder 输入对象
6. builder 输出对象
7. 浏览器发送值
8. 本地生成值

## 五、何时先修图像，何时先修参数

### 先修图像线

适用：

- 参数层较薄
- verify 明显只校验距离/角度/坐标

### 先修参数线

适用：

- `collect/signature/w/fs` 明显更重
- token/challenge/load 返回对象没喂进去
- 环境值明显不一致

## 六、验证码 Solver 落地结构

推荐拆成：

```text
fetch_challenge
-> solve_image
-> build_track_or_answer
-> build_param_payload
-> verify
```

不要把图片识别、参数 builder、环境模拟写成一个大函数。