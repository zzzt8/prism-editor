# Prism Architecture Guardrails

> **状态**：已批准
> **用途**：不可违背的红线；任何实现、change、任务都必须先核验本文件。
> **适用分支**：`refactor/prism-runtime-foundation`

---

## 1. 架构红线

以下规则在无新基线决策前**永久有效**，任何 task 不得绕过。

### 1.1 禁止 Mall 业务模型进入 Prism

- Prism **不得新增** Mall 用户、SKU、购物车、订单和工厂账号模型。
- Prism 不得替 Mall 管理用户项目、设计记录生命周期、订单状态。

### 1.2 禁止恢复旧用户系统与发布态

- 不得恢复 `user-app`、`PublishedWorkflow`、Prism 用户登录系统。
- Prism 使用服务到服务鉴权，当前可以使用 API Key / shared secret，后续可演进为签名、短期凭证、网关身份或其他机制。
- 任何服务密钥不得进入浏览器 bundle、URL 或 `DesignState`。
- Mall 浏览器默认不直接持有 Prism 服务权限。

### 1.3 禁止 Mall 业务 ID 进入公共模板

- 不得把 `userId`、`skuId`、`orderId` 等 Mall 业务字段写入公共 `ProductTemplate`。
- Mall 业务 ID 只能存于 Mall 侧元数据或通过 `prismTemplateId` 关联。
- `RenderRequest` 可携带 `requestId`、`traceId`、`externalReferenceId` 等不透明追踪标识；这些字段不参与模板执行语义，不写入公共模板，只用于日志、幂等和链路追踪。

### 1.4 禁止双渲染逻辑长期分叉

- Composer 与 Browser Runtime 不得长期保留两套独立渲染逻辑。
- 预览执行必须收敛到同一套无 UI Browser Runtime。

### 1.5 强制共享 DesignState 与参数语义

- 浏览器预览和 Node 生产必须共享同一套 `DesignState` 与参数语义。
- 两端语义差异必须在协议层显式记录，不能散落在实现细节里。

### 1.6 生产端必须使用原始素材

- Production Runtime 必须使用原始素材。
- 禁止把前端压缩预览图作为生产源数据。

### 1.7 Flow 选择必须显式

- Flow 必须通过稳定 `flowKey` 显式选择。
- 禁止用 `findFirst` 或对象遍历顺序决定生产流程。

### 1.8 输出必须显式声明

- 输出必须通过 `explicitOutputs` 显式声明。
- 禁止隐式依赖执行结果遍历顺序决定最终输出。

### 1.9 新增品类不得要求 Mall 前端随改

- 新增普通品类只能新增模板与 Flow 配置。
- 不允许为了新品类修改 Mall 前端主流程。

### 1.10 迁移阶段最小化原则

- 每次只实施一个迁移阶段。
- 不得顺手重构与当前阶段目标无关的模块。

### 1.11 新增包、表、公开 API 必须受控

- 任何新增 package、数据库表或公开 API 都必须在当前 OpenSpec 范围内。
- 不在当前 OpenSpec 内的新增能力不得直接落地。

---

## 2. 数据与协议护栏

### 2.1 Mall 可见范围

- Mall 可以理解 Prism 的公开宿主协议：`templateId`、`templateVersion`、公开 `inputSchema`、`editableSchema`、`DesignState`、preview events，以及 `RenderRequest` / `RenderResult` 的公开部分。
- Mall 不允许理解：内部节点、DAG 结构、executor、私有 bindings、Dev Tool Store、Runtime 内部实现。

### 2.2 模板版本不可变

- `TemplateVersion` 一旦被确认设计或生产任务引用，不得原地修改。
- 模板变化必须产生新版本。
- `DesignState` 和 `RenderResult` 必须记录 `templateVersion`。
- 历史生产任务必须能够定位到原版本。
- “当前版本”可以变化，但历史版本不可被覆盖。

### 2.3 原始素材不可逆替换

- 一旦前端预览图被当作生产源，后续无法回退到原始素材精度。
- Production Runtime 必须保留原始素材输入链路。

### 2.4 明确输出契约

- `RenderResult` 中必须能追溯到输入 `RenderRequest`、模板版本、Flow 版本。
- 结果若无法复现或无法审计，则不符合生产要求。

---

## 3. 协议可序列化护栏

- `DesignState` 必须版本化。
- `DesignState` 必须 JSON 可序列化。
- `DesignState` 必须独立于 React、DOM、Zustand 和具体执行器。
- 禁止 `Blob`、`File`、`Canvas`、`ImageBitmap`、DOM 节点、函数、Store、blob URL 进入持久协议。
- 原始素材必须使用稳定 asset reference 和可选 checksum。
- `previewUrl` 只能用于显示，不能成为权威生产素材引用。

---

## 4. Runtime 包隔离护栏

- Browser Runtime 不得引入 `sharp`、`fs`、`path` 等 Node-only 依赖。
- Production Runtime 不得依赖 React、DOM 或 Composer UI。
- Dev Tool 内部 Store 不得成为 Runtime 公开接口。
- Composer 不得要求 Mall 直接访问 Prism 内部 Store。
- Shared protocol 不得引用平台专属类型。

---

## 5. 实现护栏

### 5.1 单阶段原则

- 一个任务只交付一个迁移阶段的完整闭环。
- 不把跨阶段改造混入同一 task。

### 5.2 OpenSpec 先行

- 涉及公开 API、schema、package 边界、协议字段的任务，必须先有对应 change/proposal。
- 没有 change 的跨层改造不予进入 apply。

### 5.3 禁止隐蔽兼容层

- 不允许为保持旧路径而长期保留条件化双逻辑。
- 兼容只能作为迁移态，必须有明确下线计划。

### 5.4 可观测性要求

- Flow 选择、输出选择、异常节点都必须有稳定标识。
- 禁止仅靠执行顺序、对象 key 顺序、undefined fallback 决定生产行为。

---

## 6. 架构文档保护

- 普通实现任务不得修改目标架构、架构护栏、迁移路线图和 Cursor Rule。
- 修改这些文档必须是独立架构决策任务，必须获得人工批准。
- 实现与架构冲突时必须停止并报告，不能通过修改护栏适配实现。
- 当前任务必须声明 migration phase 和 OpenSpec change ID；无 phase/change ID 不得开始跨层修改。

---

## 7. 违反护栏的后果

以下后果必须在 code review / QA 中显式检查：

- Mall 业务数据泄露到模板公共区
- 预览与生产结果不一致且无法溯源
- Mall 前端因 Prism 内部变化被迫同步改版
- 生产结果依赖前端压缩图、执行顺序或隐式 fallback
- 新增能力游离于 OpenSpec 管理之外
- 服务密钥泄露到浏览器或公开协议中
- 协议字段携带不可序列化对象导致持久化或跨端失败
