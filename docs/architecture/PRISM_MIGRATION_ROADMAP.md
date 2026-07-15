# Prism Migration Roadmap

> **状态**：已批准
> **用途**：迁移阶段定义与阶段边界；实现时必须按阶段顺序推进。
> **适用分支**：`refactor/prism-runtime-foundation`

---

## 1. 阶段总览

| 阶段 | 名称 | 核心目标 |
|------|------|----------|
| **M0** | 固定模板的浏览器与 Node 双端复现 | 只使用一个确定性的测试 fixture，直接验证 Browser executor 与 Node executor |
| **M1** | 统一 Protocol 和 DesignState | 将验证后的输入结构正式抽象为版本化 DesignState，并共享给 Browser 与 Node |
| **M2** | 确定性 Flow 选择与显式输出 | 移除 `findFirst`、输出遍历顺序等不确定性来源 |
| **M3** | 抽出无 UI Browser Runtime | 抽取无 UI Browser Runtime，只用测试宿主验证 |
| **M4** | Composer 和 Dev Tool 统一使用 Browser Runtime | 消除双预览实现，统一 runtime 入口 |
| **M5** | 独立包及 React 19 / Vite 6 验证 | 支持独立安装与现代化前端环境 |
| **M6** | Mall 独立实验页 | 验证 Mall 独立实验页加载 Runtime 与生产调用 |
| **M7** | 真实品类和工厂数据包 | 真实品类可配置化接入与工厂数据包验证 |

---

## 2. 阶段定义

### M0：固定模板的浏览器与 Node 双端复现

- 只使用一个确定性的测试 fixture。
- 直接验证 Browser executor 与 Node executor。
- 使用测试内部的最小状态输入。
- 不建立正式公开协议。
- 不改数据库 schema。
- 不新增公开 API。
- 验证几何一致性，而非要求 Canvas 与 Sharp 每个像素完全相同。
- 阶段完成标志：指定 fixture 在 Browser executor 与 Node executor 上可重复执行且几何结果稳定。

### M1：统一 Protocol 和 DesignState

- 将 M0 验证后的输入结构正式抽象为版本化 DesignState。
- 定义 `RuntimeTemplate`、`DesignState`、`RenderRequest`、`RenderResult`。
- 建立 JSON schema 或运行时校验。
- 共享给 Browser 和 Node。
- 阶段完成标志：两端输入输出通过共享类型契约与 JSON schema 校验。

### M2：确定性 Flow 选择与显式输出

- Flow 必须通过稳定 `flowKey` 选择。
- 输出必须通过 `explicitOutputs` 声明。
- 移除 `findFirst`、对象遍历顺序等非确定性选择。
- 让生产入口真正消费 DesignState。
- 阶段完成标志：相同输入永远选择同一 Flow，输出结果稳定且可审计。

### M3：抽出无 UI Browser Runtime

- 抽取无 UI Browser Runtime。
- 只用测试宿主验证。
- 暂时不迁移 Dev Tool 和 Composer。
- 阶段完成标志：无 UI runtime 可被测试宿主独立驱动预览执行。

### M4：Composer 和 Dev Tool 统一使用 Browser Runtime

- Dev Tool 迁移到 Browser Runtime。
- Composer 迁移到 Browser Runtime。
- 删除或下线旧的独立预览逻辑。
- 不再保留长期双实现。
- 阶段完成标志：Composer 与 Dev Tool 的预览实现收敛到同一个 runtime 入口。

### M5：独立包及 React 19 / Vite 6 验证

- Prism runtime packages 支持独立安装与消费。
- 验证 React 19 与 Vite 6 环境兼容性。
- 不恢复用户系统，不扩展 Mall 数据模型。
- 阶段完成标志：独立包可被外部工程引用并完成基础渲染。

### M6：Mall 独立实验页

- 验证 Mall 独立实验页加载 Runtime。
- 通过 Mall BFF 或公开 `RuntimeTemplate` 接口获取模板。
- 验证服务到服务鉴权。
- 验证素材引用、DesignState 和生产调用。
- 只有浏览器确实跨域请求时才增加 CORS 设计；不把 CORS 鉴权作为既定前置条件。
- 阶段完成标志：实验页可完成模板加载、预览、提交与生产调用。

### M7：真实品类和工厂数据包

- 接入真实品类配置与工厂数据包。
- 验证生产规格、输出稳定性、素材处理链路。
- 阶段完成标志：真实品类可稳定生产并满足工厂交付要求。

---

## 3. 阶段边界与禁止事项

| 阶段 | 可以做 | 禁止做 |
|------|--------|--------|
| **M0** | 固定模板复现、双端稳定性验证 | 改 schema、改公开 API、动 Mall 模型 |
| **M1** | 协议定义、DesignState 统一 | 改 Mall 用户字段、引入新登录系统 |
| **M2** | 替换非确定性选择、声明显式输出 | 恢复 PublishedWorkflow、恢复旧用户系统 |
| **M3** | 抽 runtime 包、改调用入口 | 新增 Mall 业务表、新增用户系统 |
| **M4** | 统一 runtime 调用方 | 新增与当前阶段无关的前端重构 |
| **M5** | 独立包发布、前端环境升级验证 | 恢复 user-app、恢复 Mall 登录态 |
| **M6** | Mall 独立实验页接入 | 直接改 Mall 主干、恢复 Mall 用户模型 |
| **M7** | 真实品类与工厂数据包接入 | 新增 SKU/订单/工厂账号模型 |

---

## 4. 执行原则

- 每次只做一个阶段。
- 每个阶段必须有对应 OpenSpec change 控制边界。
- 阶段内不得顺手重构无关模块。
- 新增 package、数据库表或公开 API 都必须在当前 OpenSpec 范围内。
