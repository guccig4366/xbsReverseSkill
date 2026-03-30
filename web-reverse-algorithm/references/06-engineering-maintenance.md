# 工程化、GitHub 吸收与扩库维护

## 一、把逆向结果做成接口，而不是只做成笔记

优先把结果收敛为这些接口：

- `build_context(input)`
- `build_payload(ctx)`
- `sign_payload(payload, ctx)`
- `solve(ctx)`
- `validate(browser_checkpoints, local_checkpoints)`

## 二、GitHub 项目最值得学什么

真正值得吸收的不是“又一个能跑的脚本”，而是：

1. 最小输入集合怎么定义
2. 算法层、环境层、请求层怎么分模块
3. 哪些检查点要暴露给调用方
4. 失败如何分类成环境问题、参数问题、版本问题

## 三、国外工程化思路要补的 5 个意识

1. 模块化
2. 版本意识
3. 输入边界意识
4. 中间检查点意识
5. 失败诊断意识

## 四、推荐的项目层次

```text
context/
payload builder/
crypto or vm layer/
env patch/
validation/
service or sdk/
```

## 五、吸收来源时的记录模板

每条来源或每个仓库，至少记：

1. 主落点
2. 补充落点
3. 备注
4. 题型
5. 输入集合
6. 输出集合
7. 关键脚本文件
8. 最值得学习的结构

## 六、案例与来源的标签化

建议使用：

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
- `sdk`
- `service`

## 七、扩库时的固定栏目

每篇新案例文档尽量保留：

1. 来源
2. 请求链
3. 关键字段
4. 入口定位
5. 代码骨架
6. 中间检查点
7. 易错点

## 八、推荐从 GitHub 项目抄的文件角色

- `sign.py / xbogus.js`：算法层
- `get_fingerprint.js`：环境采集层
- `deobfuscate.js`：前处理层
- `solve.py`：求解层
- `server.py / __main__.py`：服务封装层

## 九、版本变化时先改哪里

优先排查：

1. 输入边界有没有变化
2. 页面态参数或 load 返回对象有没有变化
3. 中间 payload 结构有没有变化
4. 只是编码层变了，还是 builder 逻辑变了
5. 环境字段是变成强校验了，还是仍然可写死

## 十、文档和代码的最终目标

目标不是“再多收集一篇文章”，而是让每次新增资料都能补到下面这条能力闭环：

```text
请求链定位
-> 算法或 builder 还原
-> 中间检查点对齐
-> 环境与协议边界确认
-> 本地复现
-> solver / SDK / 服务化
```