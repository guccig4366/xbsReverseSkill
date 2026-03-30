# 来源映射

这份文档说明当前 skill 主要吸收了哪些公开来源。

## 1. GitHub 框架来源

- `node-sandbox`
  - 特殊对象、栈、复杂 `plugins/mimeTypes`、`getBattery`、`canvas/WebGL`
- `qxVm`
  - 工程结构、描述符、native 保护、Proxy 诊断
- `catvm`
  - 教学式拆解、原型链步骤
- `boda_jsEnv`
  - 浏览器采集、指纹种子、配置化环境
- `sdenv`
  - `document.all` addon 路线、jsdom 定点增强

## 2. 阅读池策略

为了继续扩充补环境知识库，优先吸收：

- 个人博客 / 小站
- 博客园实战贴
- 小型安全社区案例
- 验证码与风控分析文

使用这些来源时，重点提取：

- 补环境流程
- Proxy 吐环境思路
- 原型链 / 描述符 / native 保护写法
- `navigator` / `document` / `Storage` / 指纹对象代码

不要把镜像转载重复算作新增知识，也不要把“只讲概念、不落代码”的文章当成高优先级来源。
