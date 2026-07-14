# Prism Target Architecture

> **状态**：已批准
> **用途**：后续所有改造、OpenSpec change、API/包/数据库设计必须与本文件对齐。
> **适用分支**：`refactor/prism-runtime-foundation`

---

## 1. 目标架构总览

Prism 是**宿主无关**的图像工作流搭建与双端运行基础设施。Mall 是第一个也是当前主要宿主，但 Prism 核心协议、Runtime 和节点能力不得依赖 Mall 业务模型。

Prism Dev Tool 负责内部模板和 Flow 搭建。Mall 管理后台是否直接操作 Prism API 目前未确认，不应作为既定架构。Mall 商品只保存模板关联；用户确认或生产任务触发时，由 Mall 后端调用 Prism Production Runtime。具体是在下单前还是下单后触发，由 Mall 业务决定，Prism 不做假设。

```
Prism 目标架构
├─ Dev Tool（内部搭建器）
│    └─ 负责：内部模板和 Flow 搭建、品类配置、单次预览
├─ Shared Protocol（共享协议）
│    └─ 负责：ProductTemplate / TemplateVersion / Flow /
│           DesignState / RenderRequest / RenderResult 契约
├─ Browser Runtime（无 UI 浏览器运行时）
│    └─ 负责：Composer / Dev Tool 的实时预览与浏览器内执行
├─ Composer React（可选交互层）
│    └─ 负责：宿主前端 PS 风格交互，不包含生产逻辑
└─ Production Runtime（Node 后端生产运行时）
     └─ 负责：高清生产渲染、原始素材处理、稳定输出
```

**关键结论**：Composer、Dev Tool 最终都必须共享同一套 **Browser Runtime**，不得长期保留两套独立预览逻辑。

---

## 2. 六层职责边界

| 模块 | 主要职责 | 禁止事项 |
|------|----------|----------|
| **Dev Tool** | 内部人员搭建模板、Flow、参数与 bindings | 不承接终端用户身份、不直接嵌入宿主前端、不存放 Mall 业务数据 |
| **Browser Runtime** | 提供无 UI 浏览器执行能力，驱动实时预览与交互态执行 | 不包含 Mall 用户模型、不处理订单/工厂账务 |
| **Composer React** | 提供宿主前端 PS 风格交互层 | 不定义第二套渲染协议、不依赖 Dev Tool 特有状态 |
| **Production Runtime** | Node 端生产渲染，使用原始素材，输出显式生产结果 | 不读取前端压缩预览图作为生产源、不依赖前端 hash 序 |
| **Shared Protocol** | 定义模板、DesignState、RenderRequest、RenderResult 语义 | 不同端不能私自扩展不可序列化字段 |
| **Prism Server API** | 暴露 templates / flows / render 等最小公开接口 | 不引入 Mall 用户/SKU/订单表，不恢复旧登录系统 |

---

## 3. Mall 可见范围

Mall 可以理解 Prism 的公开宿主协议，包括但不限于：

- `templateId`
- `templateVersion`
- 公开 `inputSchema`
- `editableSchema`
- `DesignState`
- preview events
- `RenderRequest` / `RenderResult` 的公开部分

Mall 不允许理解：

- 内部节点
- DAG 结构
- executor
- 私有 bindings
- Dev Tool Store
- Runtime 内部实现

Mall 的商品只保存模板关联；生产图来源只能来自 Prism Production Runtime 的原始素材渲染输出。

---

## 4. 数据归属与拆分原则

| 数据域 | 责任方 | 说明 |
|--------|--------|------|
| **ProductTemplate** | Prism | 模板定义、版本、flows、共享设计参数 |
| **TemplateVersion** | Prism | 模板版本快照，用于可追溯回滚 |
| **Flow** | Prism | 预览流/生产流的结构化执行图 |
| **DesignState** | Prism 定义协议；Mall 持有业务态 | Prism 管理语义，不拥有 Mall 用户项目表 |
| **RenderRequest / RenderResult** | Prism | 生产调用契约，显式输入输出 |
| **Mall 用户素材** | Mall | 设计图、图层资源、用户草稿 |
| **设计记录 / 订单 / 生产任务** | Mall | Mall 自己保存状态与生产关系 |
| **prismTemplateId** | Mall 使用 | Mall 通过该字段关联模板，不解析节点内部结构 |

### 4.1 不透明追踪标识

`RenderRequest` 可携带 Prism 不解释的不透明字段，用于日志、幂等和链路追踪：

- `requestId`
- `traceId`
- `externalReferenceId`

这些字段不参与模板执行语义，不写入公共模板，也不要求 Prism 理解它们对应的 Mall 业务概念。

### 4.2 模板版本不可变规则

- `TemplateVersion` 一旦被确认设计或生产任务引用，不得原地修改。
- 模板变化必须产生新版本。
- `DesignState` 和 `RenderResult` 必须记录 `templateVersion`。
- 历史生产任务必须能够定位到原版本。
- “当前版本”可以变化，但历史版本不可被覆盖。

---

## 5. 鉴权与安全

- Prism 使用服务到服务鉴权。当前可以使用 API Key / shared secret，后续可以演进为签名、短期凭证、网关身份或其他机制。
- 任何服务密钥不得进入浏览器 bundle、URL 或 `DesignState`。
- Mall 浏览器默认不直接持有 Prism 服务权限；Prism 不强制某种特定 Mall 鉴权模型。

---

## 6. 目标执行模型

### 6.1 预览执行

- Mall 前端加载 `DesignState`。
- Composer React 和 Dev Tool 都通过 **Browser Runtime** 执行。
- 浏览器端和 Node 生产端共享同一份 **DesignState** 与参数语义。

### 6.2 生产执行

- Mall backend 调用 Prism Production Runtime。
- 生产端读取原始素材，不依赖前端压缩预览图。
- 输出通过 `explicitOutputs` 声明，不通过对象遍历顺序隐式推断。

### 6.3 模板与 Flow 选择

- Flow 选择必须使用稳定 `flowKey`。
- 生产流程和最终输出禁止由 `findFirst` 或对象遍历顺序决定。

### 6.4 可扩展性

- 新增普通品类应只涉及模板和 Flow 配置。
- 新增品类不应要求修改 Mall 前端主流程。

---

## 7. 协议可序列化红线

- `DesignState` 必须版本化。
- `DesignState` 必须 JSON 可序列化。
- `DesignState` 必须独立于 React、DOM、Zustand 和具体执行器。
- 禁止 `Blob`、`File`、`Canvas`、`ImageBitmap`、DOM 节点、函数、Store、blob URL 进入持久协议。
- 原始素材必须使用稳定 asset reference 和可选 checksum。
- `previewUrl` 只能用于显示，不能成为权威生产素材引用。

---

## 8. Runtime 包隔离红线

- Browser Runtime 不得引入 `sharp`、`fs`、`path` 等 Node-only 依赖。
- Production Runtime 不得依赖 React、DOM 或 Composer UI。
- Dev Tool 内部 Store 不得成为 Runtime 公开接口。
- Composer 不得要求 Mall 直接访问 Prism 内部 Store。
- Shared protocol 不得引用平台专属类型。

---

## 9. 包与运行形态演进目标

| 阶段 | 形态 |
|------|------|
| 当前 | Dev Tool + Server + Composer SDK 组合在 monorepo 中 |
| M3+ | Browser Runtime 抽出为无 UI 包 |
| M5+ | Prism 提供可独立安装的 runtime packages |
| M6+ | Mall 通过独立实验页接入，不侵入 Mall 主干 |
| M7+ | 真实品类和工厂数据包可配置化接入 |

---

## 10. 交付边界

- Prism 不负责 Mall 用户中心、购物车、订单履约、工厂账号系统。
- Prism 负责**可配置模板 + 双端 runtime + 稳定协议**。
- Mall 负责**用户项目、订单、生产任务、工厂对接**。
