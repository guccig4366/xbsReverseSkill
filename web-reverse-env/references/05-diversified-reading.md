# 去中心化补环境阅读池

这份清单专门用来纠正一个问题：

当前补环境资料很容易被 CSDN / 51CTO / 博客园 / 镜像站的重复转载“制造出很多文章”的错觉，但其实很多内容是同一套思路在多平台反复出现。

所以这份清单的目标不是“再堆大站镜像”，而是尽量扩展到：

- 个人博客
- 小站
- 案例站
- 安全社区转载但内容更偏实战的文章

## 1. 当前阅读池的结构性问题

现有资料里，确实有一个偏差：

- 大平台多
- 镜像多
- Proxy 入门多
- 真实复杂检测点少

最常见的重复内容是：

- `window/document/navigator` 代理
- 简单 `Proxy get/set`
- `document.cookie` hook
- `window = global`

这些当然有用，但如果只读这一层，会误以为补环境主要就是“补对象 + 打印日志”。

实际上更难的部分是：

- 原型链与描述符
- native `toString`
- `document.all`
- 栈清洗
- `plugins/mimeTypes`
- `Worker`
- `WebSocket`
- `AudioContext`
- `WebRTC`
- 字体 / 精度 / 多模块一致性

## 2. 更值得扩展阅读的来源

下面这些来源不一定都是“大站爆文”，但对 future skill 的参考价值更高。

### 2.1 个人博客 / 小博客

1. Chen's Blog: web逆向-补环境笔记  
   链接: [chenxs.site](https://chenxs.site/2024/12/13/web%E9%80%86%E5%90%91-%E8%A1%A5%E7%8E%AF%E5%A2%83%E7%AC%94%E8%AE%B0/)  
   价值: 把 `Proxy`、`toString`、`jsdom`、history 补环境和 v_jstools 串成了一条个人实践链，比较接近“自己做笔记并反复试验”的材料。

2. 博客园: JavaScript逆向之代码补环境（以 iwencai 为例）  
   链接: [cnblogs.com/sbhglqy](https://www.cnblogs.com/sbhglqy/p/18085001)  
   价值: 对原型链、`Object.setPrototypeOf`、history 补环境、`global = window` 这类实战细节写得比较直。

3. 博客园: js逆向之补环境常用代码  
   链接: [cnblogs.com/caomengqi](https://www.cnblogs.com/caomengqi/p/15370101.html)  
   价值: 虽然偏入门，但把“先吐环境，再按层补对象”的朴素思路讲得很清楚，还点到了 `XMLHttpRequest` 和音频指纹。

4. 博客园: js逆向7-常见的混淆手段和补环境  
   链接: [cnblogs.com/andy0816](https://www.cnblogs.com/andy0816/p/15087573.html)  
   价值: 虽然不是纯补环境教程，但强调了“hook 原生方法后还要过 `toString` 检测”。

5. Geek Blog: JS逆向完整技能图谱  
   链接: [51rexue.cn](https://51rexue.cn/blog/50)  
   价值: 更像个人整理版知识图谱，能帮助 future skill 做导航，而不是只做片段代码。

### 2.2 案例型文章

6. 博客园: 多个开源的 js 补环境框架测试  
   链接: [cnblogs.com/kanadeblisst](https://www.cnblogs.com/kanadeblisst/p/18177803)  
   价值: 不是讲单个技巧，而是把多个框架放到同一个案例里比较。

7. 博客园: 某音 `__ac_signature` 补环境案例  
   链接: [cnblogs.com/kanadeblisst](https://www.cnblogs.com/kanadeblisst/p/18183750)  
   价值: 明确展示了 cookie 生成链如何依赖补环境，适合作为“站点驱动补环境”的参考。

8. EW帮帮网: ali231 补环境案例  
   链接: [ewbang.com](https://www.ewbang.com/community/article/details/1000130780.html)  
   价值: 更偏真实站点流程，适合看“怎么从参数入口一路走到补环境”。

9. CSDN: 今日头条 `_signature` 补环境  
   链接: [blog.csdn.net/m0_52336378/article/details/133042514](https://blog.csdn.net/m0_52336378/article/details/133042514)  
   价值: 案例导向，强调补环境只是三条路之一，和插桩、JS-RPC 并列。

10. CSDN: XHS 私信协议 / X-s 补环境  
    链接: [blog.csdn.net/2401_85458050/article/details/139437038](https://blog.csdn.net/2401_85458050/article/details/139437038)  
    价值: 直接碰到了 `AudioContext`、`CanvasRenderingContext2D`、socket 协议和更复杂的运行环境。

### 2.3 高强度检测点文章

11. CN-SEC: hCaptcha 无感逆向分析-补环境  
    链接: [cn-sec.com](https://cn-sec.com/archives/4909845.html)  
    价值: 这是当前最值得继续深读的来源之一，因为它已经不满足于基础 BOM/DOM，而是点到了 `RTCPeerConnection`、`OfflineAudioContext`、`WebGL2RenderingContext`、字体指纹、`Worker/SharedWorker`、`Math` 精度和大量描述符检测。

12. 信息安全知识库: hCaptcha 无感逆向分析-补环境  
    链接: [gm7.org](https://www.gm7.org/archives/27931)  
    价值: 内容与上文接近，但整理摘要里把 `Worker`、`Math` 精度、WebRTC、WASM 交互明确提出来了，适合作为快速索引。

## 3. 这些来源给 future skill 带来的新提醒

如果把上面这些小博客 / 小站 / 案例文一起看，能很明显看到几个变化：

- 基础 BOM/DOM 只是第一层
- 真正难的是异步对象、通信对象和更深层指纹
- `Proxy` 只是入口，不是结尾
- “值对了”远远不够，还要“形状对、关系对、时序对”

## 4. 后续阅读策略应该怎么改

后面继续扩资料时，不应再用“收集 30 个链接”这种粗放方式来判断进展，而应该改成：

### 4.1 按“新信息量”筛文章

优先保留能新增这些维度的文章：

- 新对象
- 新检测链
- 新指纹
- 新补环境流程
- 新脚本模板

### 4.2 把镜像站当备份，不当新增样本

例如同一篇 Proxy 入门文，如果在：

- CSDN
- 博客园
- 51CTO
- 优快云

都出现了，那应该视为 1 份思路，不是 4 份新增知识。

### 4.3 优先阅读“案例里补出了什么”

比起“补环境是什么”的泛讲，更应该优先看：

- 补了哪些对象
- 为什么补
- 哪一步报错
- 最后如何验证

这类文章对 future skill 的模块设计更有价值。

## 5. 现阶段最值得重点深读的非大站来源

如果只选 4 个最值得现在继续深读的来源，我建议是：

1. [Chen's Blog - web逆向-补环境笔记](https://chenxs.site/2024/12/13/web%E9%80%86%E5%90%91-%E8%A1%A5%E7%8E%AF%E5%A2%83%E7%AC%94%E8%AE%B0/)
2. [博客园 - JavaScript逆向之代码补环境（以 iwencai 为例）](https://www.cnblogs.com/sbhglqy/p/18085001)
3. [EW帮帮网 - ali231 补环境案例](https://www.ewbang.com/community/article/details/1000130780.html)
4. [CN-SEC - hCaptcha无感逆向分析-补环境](https://cn-sec.com/archives/4909845.html)

原因分别是：

- Chen's Blog: 像个人实战笔记，适合吸收流程和日常补法
- iwencai: 适合吸收原型链和 `global/window` 关系
- ali231: 适合吸收真实站点导向流程
- hCaptcha: 适合吸收更深层检测点

## 6. 当前最稳的调整方向

后续继续收资料时，建议把重心从“大站高热度文章”切到：

- 个人博客
- 博客园实战贴
- 小型安全社区案例
- 含代码片段的镜像站
- 国外风控 / 验证码案例分析

换句话说，后面的重点不再是“找更多同类补环境文章”，而是“找更多不同层级、不同复杂度、不同检测面的补环境文章”。
