# Prism Composer Platform 产品基线 PRD v1.0

> **状态**：v1.0 — 当前生效的基线
> **生效日期**：2026-07-06
> **取代文档**：见 §1.2
> **维护原则**：本文档是 Prism Composer Platform 阶段的唯一权威基线。任何 change、任务、ADR 在与本文档冲突时，必须先更新本文档。

---

## 1. 文档目的与权威性

### 1.1 为什么需要这份基线

Prism 项目从 2026-03 到 2026-07 之间积累了多份产品文档，这些文档之间存在**方向冲突**（v0.1 强调"内部生产工具 + 编辑器为主"，v0.2 转向"mall chat 嵌入画布"，change.md 又提出"Prism Core + 两条产品线分化"），导致：

- 团队不知道哪个方向是"现在的方向"
- 任务拆解、技术约束、任务规划摘要都基于过时的 v0.1
- 实际代码已经做完了 user-app、ProductTemplate，但 PRD 还说"运行页先弱化"

本文档**不是**简单的"v0.1 + v0.2 合订版"，而是一次**方向再选择 + 基线重置**：

- 选择 Prism **Composer Platform**（业务集成方向）作为当前唯一主线
- Prism Studio（用户 Agent 方向）**不在本基线范围**，仅在 §10 列出作为"未来可能分化"
- 历史有效判断（方案 C 技术架构、SKU = 品类、产品模板概念）被吸收进来

### 1.2 本文档取代以下历史文档（明确作废）

| 文档 | 状态 | 备注 |
|------|------|------|
| `Prism Editor PRD v0.1` | **作废** | 阶段定位"内部生产工具 + 编辑器为主"已不适用 |
| `Prism Editor 产品定位与产品形态 PRD v0.2` | **作废** | mall chat 嵌入画布的方向被 Composer Platform 覆盖 |
| `Prism Editor 任务拆解 v0.1` | **作废** | P0/P1/P2 划分基于过时的 v0.1 |
| `Prism Editor 任务规划摘要 v0.1` | **作废** | C1-C5 拆分未落地 |
| `Prism Editor 技术架构约束清单 v0.1` | **作废** | 8 条硬约束中 §3 节点协议、§5 状态管理、§6 发布协议仍然有效，但被本文档第 6 节重新组织 |
| `Prism Editor 架构审阅报告 v0.1` | **作废** | 一次性分析，已被后续多个 change 超越 |

### 1.3 本文档吸收但不重复以下内容

- `docs/prism editor change.md` 的"Prism Core + 两条产品线"分层判断 → §2 核心判断
- `docs/cursor_prism_composer_platform_director.md` 中确认的"方案 C"技术架构 → §6 技术架构
- `docs/product-template-v1.md` 的 ProductTemplate 数据模型 → §3.3 / §6.3
- `openspec/specs/QUALITY_STANDARDS.md` 的全局质量规范 → §6 引用而非重复

### 1.4 后续维护规则

- 本文档**每完成一个 Phase 必须 review 一次**
- 任何对 MVP 范围、技术架构、Out of Scope 的修改必须先改本文档
- 不允许存在"内容与本文档冲突但本文档未更新"的情况

---

## 2. 核心产品判断

### 2.1 一句话定位

> **Prism 是 mall 的图像合成 runtime，为 mall 管理后台提供品类配置管理，为 mall 前端提供 PS 风格的图像合成能力。**

> 它让 mall 的设计师能通过节点编辑器低代码搭建图像合成品类，让 mall 的用户在商品定制页面实时预览合成效果、下单后获取高清生产文件。

### 2.2 与 mall 的关系定位

```
┌─────────────────────────────────────────────────────────────┐
│                          mall                                │
│  ┌──────────────────┐         ┌────────────────────────┐  │
│  │   admin-web      │         │    mall frontend        │  │
│  │  (管理后台)        │         │  (用户购物/定制页)        │  │
│  └────────┬─────────┘         └────────────┬───────────┘  │
│           │                               │               │
│           │ mall backend 调用 Prism API    │ mall 前端调用  │
│           │ 写入/管理 ProductTemplate      │ Prism API     │
└───────────│───────────────────────────────│───────────────┘
            │                               │
            ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Prism Server                            │
│  ├─ dev-tool（品类搭建，内部工具）                           │
│  ├─ /api/templates（品类配置 CRUD）                         │
│  ├─ /api/render（生产渲染）                                │
│  └─ Composer SDK（嵌入 mall 前端，提供 PS 风格交互）          │
└─────────────────────────────────────────────────────────────┘
```

**Prism = mall 的图像合成能力模块，不是一个独立产品。**

### 2.3 核心护城河

> **同一套结构化配置（ProductTemplate）同时驱动前端实时预览和后端生产图渲染，并允许非工程师通过节点编辑器低代码搭建新品类。交互体验与 Photoshop 拖拽图层一致。**

这条护城河由四层组成：

1. **共享配置层**（ProductTemplate.inputs / designParams / assets）—— 同一份数据驱动两端
2. **双 Runtime**（Preview Flow + Production Flow）—— 同结构可由不同 runtime 执行
3. **PS 风格实时交互**（Composer SDK Canvas）—— 拖拽/调参零延迟感知，后端生产高清
4. **低代码搭建**（节点编辑器作为品类搭建界面）—— 非工程师可独立搭建新品类

### 2.4 三条核心原则

1. **结构化配置优先于代码**：每个图像品类的配置应该是数据，不是脚本
2. **前端预览 ≠ 后端生产**：两者使用同一份配置，但走不同执行路径，输出不同精度
3. **轻量化聚焦**：Prism 只做图像合成一件事，不做电商、不做订单、不做用户管理

### 2.5 当前不追求的护城河

- 节点市场规模（开放插件、节点商城）
- Agent 自动搭工作流
- 通用非图像工作流
- 实时多人协作
- 多租户 SaaS

### 2.6 解耦改造原则

> 来自项目改造经验：不要按"页面"堆代码，要按"职责"拆代码

| 原则 | 在 Prism 中的应用 |
|------|-----------------|
| **页面只做"组装"** | WorkflowEditorPage 不直接渲染节点，而是组合 Canvas/Inspector/Toolbar 组件 |
| **组件按产品职责拆** | 画布、选区、连接线、Inspector 各拆独立组件 |
| **业务核心放 lib** | image-ops、workflow-engine 已经是独立 lib，保持 |
| **产品规则单独抽** | 节点验证规则、合成规则抽到 `packages/rules/` |
| **类型当合同** | shared-types 作为项目内部契约，严格遵守 |
| **插件化思维** | 节点定义、executor 可插拔，不硬编码 |

---

## 3. 产品形态：Prism Composer Platform

### 3.1 产品定义

Prism Composer Platform 是 **mall 的图像合成 runtime**，由**四部分**组成：

```
Prism Composer Platform（mall 图像合成 runtime）
├─ dev-tool（内部品类搭建工具）
│   └─ 节点编辑器 + ProductTemplate 管理（不跑实时合成）
├─ Prism Server（API 服务）
│   ├─ /api/templates —— ProductTemplate CRUD
│   ├─ /api/render —— 生产渲染
│   └─ /api/assets —— 素材管理
├─ Preview Runtime（浏览器内 Canvas）
│   └─ Composer SDK 调用，PS 风格实时合成
└─ Composer SDK（嵌入 mall 前端）
    └─ <ComposerCanvas /> + <ComposerParams /> + onSubmit
```

**与 mall 的集成关系**：

| mall 组件 | 集成 Prism 的方式 |
|-----------|------------------|
| mall admin-web（管理后台） | 通过 mall backend 调用 Prism API，管理 ProductTemplate |
| mall frontend（用户前端） | 嵌入 Composer SDK，实时预览 + 提交订单 |
| mall backend（后端服务） | 调用 Prism /api/render，触发生产渲染 |

### 3.2 关键产品流程

```
[mall 管理员] 在 mall admin-web 操作
              └─ mall backend 调用 Prism API
                  └─ 搭建/管理 ProductTemplate
                      ├─ 配置 inputs（用户可填参数）
                      ├─ 配置 designParams（设计参数）
                      └─ 关联 Preview Flow + Production Flow

[mall 用户] 在 mall 前端商品定制页
           └─ Composer SDK 加载 ProductTemplate
               └─ 渲染 <ComposerCanvas />

[mall 用户] 在 mall 前端体验 PS 风格交互
           ├─ 拖拽图层（CSS transform 实时跟随，< 16ms）
           ├─ 调参数（位置、缩放、旋转、叠加模式）
           └─ 每次变化触发前端 Canvas 实时合成预览
               └─ 叠加模式（正常/正片叠底/滤色/叠加...）
               └─ 蒙版运算（亮度蒙版/渐变蒙版/羽化）
           └─ 满意后点击确认 / 加入购物车

[mall 后端] 收到订单信号
           └─ 调用 Prism /api/render
               └─ 后端 sharp 高清渲染（1-5 秒）
                   └─ 返回生产文件
           └─ 订单继续：支付 → 生产 → 工厂对接
```

#### Composer SDK 交互模型（PS 风格）

```
用户操作（拖拽 / 调参数）
  ↓ 实时响应（CSS transform，< 16ms）
  图层位置/缩放/旋转 → 立刻反映在屏幕上

  ↓ 触发前端 Canvas 实时合成
  ┌─ 叠加模式：正常、正片叠底、滤色、叠加、柔光...
  ├─ 蒙版运算：亮度蒙版、渐变蒙版、边缘羽化
  └─ 输出预览图（< 100ms）

用户确认 / 提交订单
  ↓ 收集最终状态
  { foreground: { x, y, scale }, background: {...}, ... }
  ↓ 发送到业务后端
  ↓ 业务后端调用 Prism Production API
  ↓ 后端 sharp 高清渲染（1-5 秒）
  ↓ 返回生产文件
  展示最终合成结果
```

**关键约束**：
- dev-tool 搭建阶段**不跑实时合成**，只做节点配置和单次触发预览
- Composer SDK 的实时预览是**纯前端 Canvas 合成**（不请求后端）
- Production Render 是**后端 sharp 高清渲染**（异步，用户确认后触发）

### 3.3 业务对象模型

```
ProductTemplate（业务层容器）
├─ inputs              ← 用户可填的输入项
├─ assets              ← 模板素材
├─ designParams        ← 设计参数
├─ preview.flow        ← 1..N 条 Preview Flow
└─ production.flow     ← 1..M 条 Production Flow

Flow = PublishedWorkflow 的子集
├─ nodes（带 platforms 标记）
├─ connections
├─ bindings（如何把共享 inputs/params/assets 映射到节点）
└─ platform = 'browser' | 'nodejs'
```

**关键约束**：
- Preview Flow 和 Production Flow **不要求**是同一份 workflow，可以完全不同
- 它们的**一致性**通过共享 inputs / designParams / assets 保证，而不是通过共享执行图
- 一个 ProductTemplate 可关联 N 条 Preview Flow 和 M 条 Production Flow（独立工作流，无串联）

### 3.4 接入边界

#### 3.4.1 Composer Platform 与业务项目的边界

| 属于 Composer Platform | 属于业务项目 |
|------------------------|-------------|
| **Composer SDK 全部**（`<ComposerCanvas />` 拖拽交互 + 实时预览 + 参数面板） | 业务页面布局 |
| Preview 实时合成（前端 Canvas） | 业务素材管理（上传/存储） |
| 后端 Production Runtime | 订单流程 |
| 配置版本管理 | 支付 / 用户账户 |
| 节点编辑器（仅 dev-tool） | 生产文件分发 |
| 生产文件生成 | 工厂对接 |

#### 3.4.2 dev-tool 与 Composer SDK 的职责分离

> **dev-tool 的职责是搭工作流，不跑实时合成。实时合成是 Composer SDK 的运行时能力。**

| 场景 | dev-tool（搭建者） | Composer SDK（运行时） |
|------|-------------------|----------------------|
| 工作流编辑 | ✅ 可视化节点编辑器 | ❌ 不暴露 |
| 节点配置 | ✅ Inspector 配置节点参数 | ❌ 不暴露 |
| 实时预览 | ✅ 用户主动触发单次预览 | ✅ **拖拽/调参自动触发** |
| 合成执行 | ✅ 单次触发（调试用） | ✅ 实时 Canvas 合成 |
| 生产渲染 | ❌ 不做 | ❌ 后端 sharp（由业务后端调用） |

---

## 4. 目标用户与场景

### 4.1 目标用户分层

| 角色 | 谁 | 主要动作 | 工具 |
|------|-----|---------|------|
| **mall 管理员** | mall 运营 / 设计师 | 在 mall admin-web 管理 ProductTemplate | mall admin-web（调用 Prism API） |
| **mall 用户** | mall 买家 | 在商品定制页拖拽图层、看预览、下单 | mall 前端（Composer SDK） |
| **Prism 开发者** | Prism 维护者 | 维护 dev-tool、Composer SDK、Server | dev-tool |

### 4.2 核心痛点（mall 视角）

- 每新增一个可定制商品品类都要前端重写合成代码 → 协作困难、复用差
- 前端预览和后端生产图不一致 → 用户下单后发现效果不对
- 设计师调整参数依赖工程师 → 沟通成本高
- 可定制商品无法实时预览 → 转化率低

### 4.3 Prism 要解决的问题（mall 视角）

> 让 mall 能**低代码新增可定制商品品类**，**用户实时预览与后端生产由同一份配置驱动**，设计师可以独立操作，不需要工程师介入。

---

## 5. MVP 场景定义

### 5.1 MVP 场景

**品类**：商品图合成（典型场景：键帽、海报图、产品图中的"主体合成到背景"）

**核心链路**：

```
1. 品类搭建者在 dev-tool 搭建 ProductTemplate
   ├─ inputs: 前景图 URL、背景图 URL
   ├─ designParams: 主体位置、缩放、边缘羽化、阴影强度
   ├─ preview.flow: [LoadImage:前景, LoadImage:背景, ApplyMask, Composite, Export]  ← 浏览器 Canvas 执行
   └─ production.flow: [LoadImage:高清前景, LoadImage:高清背景, Composite with cut-line]  ← Node.js sharp 执行

2. 业务系统加载 ProductTemplate
   └─ Composer SDK 渲染 <ComposerCanvas />

3. 终端用户上传图 / 选择模板 → 进入 PS 风格交互
   ├─ 拖拽前景图层 → CSS transform 实时跟随（< 16ms）
   │   └─ 同时触发前端 Canvas 实时合成预览（叠加模式 / 蒙版运算）
   ├─ 调参数（位置、缩放、旋转、叠加模式、不透明度）
   │   └─ 每次变化触发实时 Canvas 合成（< 100ms）
   └─ 满意后点击确认 / 提交订单
       └─ SDK 提交最终参数到业务后端

4. 业务后端收到下单信号
   └─ 调用 Prism Production API
   └─ 后端用同一份 ProductTemplate 但用高清素材 + sharp 渲染
   └─ 返回生产文件

5. 业务系统拿到生产文件 → 展示最终合成结果 → 交给工厂
```

#### PS 风格交互详细说明

**实时预览的工作原理**：

| 交互阶段 | 技术实现 | 延迟 |
|---------|---------|------|
| 拖拽/缩放 | CSS transform 实时跟随 | < 16ms |
| 参数变化触发合成 | 前端 Canvas 实时合成（image-ops/browser executor） | < 100ms |
| 叠加模式渲染 | Canvas `globalCompositeOperation` | 同上 |
| 蒙版运算 | Canvas 像素级运算（亮度蒙版/渐变蒙版/羽化） | < 100ms |
| 生产渲染 | 后端 sharp 高清渲染 | 1-5 秒 |

**Composer SDK 的 `<ComposerCanvas />` 职责**：
- 渲染图层拖拽交互（位置、缩放、旋转、锚点）
- 实时调用 `image-ops/browser` executor 进行 Canvas 合成
- 支持叠加模式：正常（source-over）、正片叠底（multiply）、滤色（screen）、叠加（overlay）、柔光（soft-light）
- 支持蒙版运算：亮度蒙版、渐变蒙版、边缘羽化
- 收集最终参数，通过 `onSubmit` 回传给业务后端

### 5.2 MVP 验收标准

- [ ] 至少 **1 条真实业务品类**（如：键帽）能完整跑通 MVP 链路
- [ ] 同一 ProductTemplate 在前端预览和后端生产**输出一致**（同一位置、同一缩放、同一合成结果）
- [ ] Composer SDK 接入业务 demo **不超过 50 行代码**
- [ ] 搭建新品类时间（从 0 到能预览）**不超过 1 个工作日**
- [ ] 后端生产渲染**单图 < 5 秒**

### 5.3 MVP 不做什么（Out of Scope，详见 §10）

---

## 6. 技术架构

### 6.1 整体架构图

```
┌────────────────────────────────────────────────────────────────────────┐
│                              mall                                       │
│  ┌──────────────────┐         ┌──────────────────────────────┐     │
│  │   admin-web      │         │       mall frontend            │     │
│  │  (管理后台)        │         │   (商品定制页)                │     │
│  └────────┬─────────┘         └──────────────┬───────────────┘     │
│           │ mall backend 调用 Prism API        │ mall 前端直接调用     │
└───────────│─────────────────────────────────│───────────────────────┘
            │                                 │
            ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Prism Server (Fastify)                          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                         API Routes                               │  │
│  │  /api/templates/*   — ProductTemplate CRUD                      │  │
│  │  /api/render        — 生产渲染（POST）                          │  │
│  │  /api/assets/*      — 素材管理                                  │  │
│  │  /api/health        — 健康检查                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────┐    ┌────────────────────────────────────┐   │
│  │   Prisma ORM         │    │       Prism Runtime                  │   │
│  │   SQLite/PostgreSQL  │    │  ├─ workflow-core                   │   │
│  │                      │    │  ├─ image-ops/                      │   │
│  │   ┌───────────────┐  │    │  │   ├─ core/  （纯算法）           │   │
│  │   │ProductTemplate│  │    │  │   ├─ browser/（Canvas）← Preview │   │
│  │   │Workflow       │  │    │  │   └─ nodejs/ （sharp）← Render  │   │
│  │   │Asset          │  │    │  ├─ node-definitions               │   │
│  │   └───────────────┘  │    │  └─ shared-types                   │   │
│  └──────────────────────┘    └────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                         dev-tool（内部）                                │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  节点编辑器 + ProductTemplate 管理（不跑实时合成）                 │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                       Composer SDK（嵌入 mall 前端）                     │
│  <ComposerCanvas />  +  <ComposerParams />  +  onSubmit               │
│  PS 风格拖拽 + 实时 Canvas 合成 + 参数提交                             │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 数据存储方案

#### 6.2.1 设计原则

> **Prism 保持独立数据库，不和 mall 共用表。mall 通过 API 访问 Prism 数据。**

| 存储 | 技术选型 | 理由 |
|------|---------|------|
| Prism 数据 | SQLite（开发）/ PostgreSQL（生产） | 轻量、独立、Prisma 原生支持 |
| mall 数据 | MongoDB | mall 已有，不改动 |

#### 6.2.2 Prism 数据模型（精简后）

```prisma
model ProductTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  version     String   @default("1.0.0")
  content     String   // 完整的 ProductTemplate JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workflows   Workflow[]
  assets      Asset[]
}

model Workflow {
  id           String   @id @default(cuid())
  templateId   String
  template     ProductTemplate @relation(fields: [templateId], references: [id])
  name         String
  platform     String   // 'browser' | 'nodejs'
  content      String   // workflow JSON
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([templateId])
}

model Asset {
  id          String   @id @default(cuid())
  templateId  String
  template    ProductTemplate @relation(fields: [templateId], references: [id])
  name        String
  url         String
  type        String   // 'image' | 'font' | 'other'
  createdAt   DateTime @default(now())

  @@index([templateId])
}
```

#### 6.2.3 mall 访问 Prism 的方式

| mall 操作 | 访问方式 | 说明 |
|----------|----------|------|
| 管理后台查看品类列表 | mall backend → GET /api/templates | mall 调用 Prism API |
| 管理后台编辑品类 | mall backend → PUT /api/templates/:id | mall 调用 Prism API |
| mall 前端加载配置 | 直接调用 GET /api/templates/:id | CORS 白名单允许 mall 域名 |
| 触发生产渲染 | mall backend → POST /api/render | mall 调用 Prism API |

### 6.3 认证方案

> **Prism 对 mall 内部完全信任，不需要自己的用户认证系统。**

| 访问路径 | 认证方式 | 说明 |
|----------|----------|------|
| mall backend → Prism API | **固定 API Key** | 部署在内网，用 `X-PRISM-SECRET` header |
| mall frontend → Prism API | **CORS 白名单** | 只允许 mall 的域名访问 |
| dev-tool → Prism API | **固定 API Key** | 内部工具，使用同一个 secret |

```typescript
// Prism Server 中间件
const MALL_API_SECRET = process.env.PRISM_API_SECRET || 'dev-secret';

// API Key 验证（server-to-server）
fastify.addHook('preHandler', async (request, reply) => {
  if (request.url.startsWith('/api/')) {
    const secret = request.headers['x-prism-secret'];
    if (secret !== MALL_API_SECRET) {
      // 仅在内网环境允许无 secret 访问公开端点
      if (!isPublicEndpoint(request.url)) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }
  }
});

// CORS 白名单
fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:3000', 'https://mall.example.com'],
});
```

### 6.4 方案 C：节点定义统一 + 算法分层 + 平台能力标记

历史决策（2026-05-25 在 `cursor_prism_composer_platform_director.md` 中已确认）。

**目录结构目标**：

```
packages/
├─ node-definitions/           ← 唯一的节点定义（含 platforms 标记）
│   └─ definitions.ts
│
├─ image-ops/                  ← 算法 + 平台适配
│   ├─ core/                   ← 纯函数算法层（composite / mask / transform math）
│   ├─ browser/                ← 浏览器端 executor（调用 core + Canvas API）
│   └─ nodejs/                 ← 服务端 executor（调用 core + sharp/Buffer API）
│
├─ workflow-core/              ← 执行引擎（拓扑排序、类型校验、缓存）
├─ core/                       ← 全局注册表
└─ shared-types/               ← 类型契约
```

**节点定义结构**（目标形态）：

```ts
interface NodeDefinition {
  type: string;
  category: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  params: ParamDefinition[];
  platforms: ('browser' | 'nodejs')[];   // 新增
}
```

**平台能力规则**：

- `platforms: ['both']` → 两端都能用
- `platforms: ['browser']` → 仅前端编辑器可见
- `platforms: ['nodejs']` → 仅后端编辑器可见
- `platforms: ['browser', 'nodejs']` → 两端编辑器都可见

dev-tool 新建工作流时**必须选择 target**（`browser` 或 `nodejs`），编辑器按 target 过滤可见节点。

### 6.5 ProductTemplate 数据模型

**已实装**（参见 `docs/product-template-v1.md`）：

```ts
interface ProductTemplate {
  id: string;
  name: string;
  description?: string;
  version: string;

  // 共享层
  inputs: ProductTemplateInput[];
  assets: ProductTemplateAsset[];
  designParams: ProductTemplateDesignParam[];

  // 双流
  preview: {
    flow: FlowReference;     // PublishedWorkflow | Workflow
    bindings: FlowBinding[];
  };
  production: {
    flow: FlowReference;     // Workflow | external | none
    bindings: FlowBinding[];
  };

  metadata: {
    authorId: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

**v1.0 目标扩展**：
- `FlowReference.platform: 'browser' | 'nodejs'`
- 同一 ProductTemplate 可关联 N 条 Preview Flow + M 条 Production Flow（多对多）
- Production Flow 在 v1.0 阶段允许为空（占位结构）

### 6.6 Runtime 抽象

```ts
interface RuntimeTarget {
  type: 'browser' | 'nodejs';
  capabilities: {
    webWorker: boolean;
    fileSystem: boolean;
    sharp: boolean;   // 仅 nodejs
  };
}

interface RuntimeExecutor {
  execute(workflow: Workflow, inputs: RuntimeInputs, target: RuntimeTarget): Promise<RuntimeResult>;
}
```

**约束**：
- 同一份 `WorkflowDefinition` 可由 `browser` 或 `nodejs` executor 执行
- 执行器**只做平台适配**（Canvas ↔ sharp），不改变算法
- 后端使用 `sharp` 作为图像处理库（已确定）

### 6.7 关键架构约束（从 v0.1 继承，强制遵守）

| 编号 | 约束 | 适用范围 |
|------|------|---------|
| AC-1 | 节点 = 协议，不是 UI 组件 | 全部 |
| AC-2 | 新增节点不改核心 | 全部 |
| AC-3 | 浏览器 / Node.js 共享同一份节点定义 | 全部 |
| AC-4 | 算法层纯函数化（无 DOM 依赖） | image-ops/core |
| AC-5 | 编辑态 / 模板态 / 发布态三态分离 | shared-types |
| AC-6 | 本地存储只做缓存，不做真相 | 全部 |
| AC-7 | 节点执行无副作用优先（Export / AI 类节点除外） | 节点实现 |
| AC-8 | 任何错误必须可定位到节点级 | workflow-core |
| AC-9 | DAG 执行图，不支持循环 | workflow-core |
| AC-10 | UI State 与 Domain State 必须分离 | dev-tool / user-app |

### 6.8 复用现有资产盘点

**可直接复用的（已实现）**：
- `workflow-core`（拓扑执行引擎、类型校验、缓存、AbortSignal）
- `image-ops` 的 7 个节点 executor（需要按方案 C 重构）
- `node-definitions` 节点元数据（需要加 platforms 字段）
- `server` Prisma schema 已有 ProductTemplate 模型
- `dev-tool` 的节点编辑器、Inspector、PreviewPanel
- `PublishedWorkflowExecutor`（重建 PublishedWorkflow 执行能力）

**需要新增的**：
- `image-ops/core/` 纯算法层（从现有 executor 抽出）
- `image-ops/nodejs/` sharp 后端 executor
- Composer SDK 入口包（独立 npm package）
- Production Runtime 调度（server 侧）

**可能舍弃的（候选）**：
- Snippet（代码片段）—— `shared-types/src/snippet.ts` 是 stub，未实装（**已在 §11 瘦身体系列入删除**）
- Node Marketplace 完整功能 —— 见 §10 / §11

### 6.9 质量规范

本基线自动继承 `openspec/specs/QUALITY_STANDARDS.md` 的全部约束。任何 change 必须显式引用并执行其检查清单。

**关键质量要求**：

| 质量维度 | 要求 |
|---------|------|
| 类型安全 | TypeScript strict 模式，shared-types 作为唯一类型真相源 |
| 测试覆盖 | image-ops/core 算法层必须 100% 单元测试覆盖 |
| 预览一致性 | 前端 Canvas 预览与后端 sharp 生产输出像素级一致（可量化 Diff） |
| 错误定位 | 任何运行时错误必须能定位到具体节点 |
| 构建性能 | dev-tool 冷启动 < 5 秒，热更新 < 500ms |

---

## 7. MVP 功能清单

### 7.1 必须做（MVP 必交付）

#### A. 数据契约与编辑器

- [ ] ProductTemplate 完整数据模型支持多 Preview/Production Flow
- [ ] dev-tool 支持按 `platform` 过滤节点（前端 / 后端编辑器分离）
- [ ] ProductTemplate 编辑器：搭建、配置 inputs/designParams、关联 Flow、发布
- [ ] Composer SDK 入口包：能加载 ProductTemplate、渲染 Preview、回传事件

#### B. Runtime

- [ ] `image-ops/core/` 纯算法层（composite / mask / transform / export）
- [ ] `image-ops/browser/` 重构为调用 core + Canvas
- [ ] `image-ops/nodejs/` 用 sharp 实现同算法（composite / mask / transform / load / export）
- [ ] `server/api/render` Production API（接收 ProductTemplate + 用户参数，返回生产文件）

#### C. 业务链路

- [ ] 至少 1 条真实品类（如键帽）的 ProductTemplate 跑通 MVP 全链路
- [ ] 前端预览与后端生产输出一致性测试

### 7.2 可以后做（不阻塞 MVP）

- 多用户协作编辑
- Composer SDK 多种分发形态（iframe / Web Component / React package）
- ProductTemplate 版本管理
- 节点市场
- Agent 辅助搭建
- Production Runtime 任务队列
- 批量生产
- 成本统计

### 7.3 必须舍弃（详见 §11）

待定 —— 见 §11 候选舍弃清单

---

## 8. Phase 0-4 任务路线

> **OpenSpec Change**: [`phase0-baseline-cleanup`](../openspec/changes/phase0-baseline-cleanup/tasks.md)（status: `in-progress`，15 tasks）
> 
> **更新记录**：
> - 2026-07-08：创建 OpenSpec change，确立 Phase 0 任务清单

### Phase 0：基线重置 + 瘦身体系

**目标**：PRD 生效 + 历史代码清理 + mall 集成准备。

**Phase 0.1 - PRD 与文档**：
- [ ] 完成本文档（基线 PRD v1.0）
- [ ] 在 `docs/README.md` 中将 v1.0 标为"当前生效"
- [ ] 将 v0.1 / v0.2 / 任务拆解 / 任务规划摘要 / 架构审阅报告 / 技术架构约束 全部移入 `_archive/`

**Phase 0.2 - 代码瘦身体系**（详见 §11）：

| 删除项 | 处理方式 |
|--------|---------|
| JWT Auth | 删除 `@fastify/jwt`、Auth 中间件 |
| User 模型 | 删除 `User` Prisma model、登录/注册 API |
| RevokedToken | 删除（随 JWT 一起删除） |
| NodePackage 市场 | 删除 `NodePackage` / `NodePackageVersion` 模型和路由 |
| Snippets | 删除 `snippet.ts` stub |
| SKU 模型 | 删除 `SKU` / `SKUWorkflow` 模型 |
| WorkflowVersion | 删除（由 ProductTemplate 版本替代） |
| apps/user-app | 删除（Prism 不做独立用户产品） |

**Phase 0.3 - mall 集成准备**：
- [ ] 设计精简 API 路由（templates / render / assets / health）
- [ ] 实现 API Key 认证中间件
- [ ] 配置 CORS 白名单

**完成标准**：PRD 生效 + 瘦身体系完成 + mall 集成 API 就绪

---

### Phase 1：核心架构重构（方案 C 落地）

**目标**：把 image-ops 拆成 core / browser / nodejs 三层。

**任务**：
- [ ] **T1.1**：在 `NodeDefinition` 加 `platforms` 字段
- [ ] **T1.2**：抽取 `image-ops/core/` 纯算法层（composite / mask / transform / export）
- [ ] **T1.3**：把现有 7 个 executor 改造为"调用 core + 平台 API"
- [ ] **T1.4**：实现 `image-ops/nodejs/` 的 sharp 版本（先做 composite + transform + load + export）
- [ ] **T1.5**：dev-tool 新建工作流增加"前端 / 后端"目标选择
- [ ] **T1.6**：现有所有 dev-tool 端到端测试通过

**完成标准**：
- 同一 WorkflowDefinition 可分别在 browser 和 nodejs 执行，输出像素级一致
- dev-tool 行为正常

---

### Phase 2：ProductTemplate 多流化

**目标**：让 ProductTemplate 支持多 Preview Flow + 多 Production Flow。

**任务**：
- [ ] **T2.1**：精简 Prisma schema（ProductTemplate / Workflow / Asset 三表）
- [ ] **T2.2**：实现 ProductTemplate CRUD API
- [ ] **T2.3**：dev-tool ProductTemplate 编辑器支持多 Flow 管理
- [ ] **T2.4**：实现 `server/api/render` Production API
- [ ] **T2.5**：生产文件 Output Spec 实现（PNG / JPEG + 工厂规格）

**完成标准**：
- 同一 ProductTemplate 可关联至少 1 Preview + 1 Production Flow
- Production API 接受 ProductTemplate + 用户参数，返回生产文件

---

### Phase 3：Composer SDK + PS 风格交互

**目标**：发布可被 mall 前端集成的 Composer SDK，提供 PS 风格实时交互。

**Composer SDK 核心能力**：

```
Composer SDK
├─ <ComposerCanvas /> —— PS 风格拖拽交互
│   ├─ 图层拖拽（位置、缩放、旋转）
│   ├─ 实时 Canvas 合成（叠加模式、蒙版运算）
│   └─ 参数响应（< 100ms 合成延迟）
├─ <ComposerParams /> —— 参数面板（可选）
└─ 事件回传
    ├─ onChange(state) —— 参数变化回调
    └─ onSubmit(params) —— 提交最终参数到 mall 后端
```

**Composer SDK 交互约束**：

- 拖拽 / 缩放使用 CSS transform 实时跟随（< 16ms）
- 参数变化触发前端 Canvas 实时合成（不请求后端）
- onSubmit 只负责把最终参数发给 mall 后端，不直接触发 Production Render
- Production Render 由 mall 后端通过 Prism Production API 调用

**任务**：
- [ ] **T3.1**：抽出 `packages/composer-sdk/` 入口包
- [ ] **T3.2**：实现 `<ComposerCanvas />` —— PS 风格拖拽 + 实时 Canvas 合成
- [ ] **T3.3**：实现 `<ComposerParams />` —— 参数面板
- [ ] **T3.4**：实现事件回传（onChange / onSubmit）
- [ ] **T3.5**：跑通 1 条真实品类 MVP 链路（如键帽）

**完成标准**：
- Composer SDK 提供 `<ComposerCanvas />` 组件，支持 PS 风格拖拽 + 实时预览
- 跑通"加载模板 → PS 风格拖拽预览 → 调整参数 → 提交 → 拿到生产图"链路
- 接入代码 < 50 行

---

### Phase 4：mall 集成

**目标**：Prism 与 mall 完成集成，mall 管理后台可管理品类，用户可在 mall 前端定制商品。

**mall 集成架构**：

```
mall admin-web
    └─ 调用 mall backend API
            └─ /api/admin/templates → 调用 Prism API
            └─ /api/admin/templates/:id → 调用 Prism API

mall frontend
    └─ 嵌入 Composer SDK
            └─ 加载 ProductTemplate → PS 风格交互 → onSubmit

mall backend
    └─ /api/render → 调用 Prism /api/render → 返回生产文件
```

**任务**：
- [ ] **T4.1**：mall admin-web 新增"品类管理"模块（调用 Prism API）
- [ ] **T4.2**：mall frontend 商品详情页嵌入 Composer SDK
- [ ] **T4.3**：mall backend 新增 `/api/render` 路由（调用 Prism API）
- [ ] **T4.4**：端到端测试（管理后台配置品类 → 用户定制 → 下单 → 获取生产文件）

**完成标准**：
- mall 管理员可在 admin-web 新增/编辑/删除 ProductTemplate
- mall 用户可在商品定制页体验 PS 风格实时预览
- 用户下单后，mall 后端能拿到 Prism 生成的生产文件

---

## 9. 开放问题与决策项

| ID | 问题 | 影响范围 | 建议决策 | 阻塞？ |
|----|------|---------|---------|--------|
| Q3 | ProductTemplate 是否支持运行时绑定 inputs（动态表单） | §6.5 数据模型 | **支持**，但 v1.0 只用静态 schema | 否 |
| Q4 | 后端生产文件 Output Spec 是否需要支持 PDF / 多页 | Phase 2 | **v1.0 只做 PNG/JPEG** | 否 |
| Q5 | dev-tool 编辑器是否需要可视化编辑 Flow 间的 bindings | Phase 2 | **v1.0 用 JSON 表单**，可视化编辑器后做 | 否 |
| Q6 | image-ops/core 抽算法时，是否保持现有 executor 100% 行为一致 | Phase 1 | **必须保持**，否则现有 E2E 全挂 | 是 |
| Q7 | 是否需要 Runtime 沙箱（防止节点代码执行风险） | 长期 | **v1.0 不做**，但留接口 | 否 |

> **Q1-Q2 已解决**：Q1（user-app 命运）和 Q2（Composer SDK 分发形态）已在 §13.3 和 §13.2 中决策。

---

## 10. Out of Scope（明确不做）

### 10.1 本阶段（v1.0 + MVP）不做

- ❌ **Prism Studio 方向**（用户 Agent 图像合成）—— 仅在 §2 提到，不在本基线范围
- ❌ **ComfyUI 兼容** —— 自研 runtime，ComfyUI 仅作为未来可选后端
- ❌ **节点市场 / 节点商城** —— 只用系统节点白名单
- ❌ **第三方插件机制** —— 节点加载接口预留，但开放生态延后
- ❌ **AI 自动搭建工作流** —— Workflow IR 必须先稳
- ❌ **多用户实时协作** —— 暂不支持
- ❌ **复杂权限系统** —— 仅最小归属（作者 / 可运行 / 管理者）
- ❌ **Production 任务队列** —— 同步渲染足够 MVP
- ❌ **批量生产** —— 单图生产足够 MVP
- ❌ **成本统计 / 配额** —— 商业化后做
- ❌ **SaaS 多租户** —— 当前阶段只服务内部 + 1-2 个业务项目
- ❌ **复杂图像 Eval** —— v1.0 不做 AI 评估

### 10.2 历史文档中提到的、但本阶段不做的

- v0.1 P0-1 "Template 类型独立" —— 已被 ProductTemplate 替代
- v0.1 P0-7 "模板机制" —— 已被 ProductTemplate + Template 中心覆盖
- v0.1 P0-8 "验收指标" —— 已落到本文档 §5.2
- v0.2 "用户视角是画布不是编辑器" —— 仅适用于 Prism Studio 方向
- v0.2 "dev-tool 不对外暴露" —— 在本阶段依然成立（§3.4）
- v0.2 "前端实时 vs 后端批量" —— 已被 §6.4 方案 C 升级为"同结构 / 双 runtime"

---

## 11. 瘦身体系清单

> 以下是 Prism 需要删除的代码 / 能力，确保 Prism 保持轻量化，聚焦图像合成。

### 11.1 已确认删除项（Phase 0 执行）

| 删除项 | 当前状态 | 处理方式 |
|--------|---------|---------|
| **JWT Auth** | 已废弃 | 删除 `@fastify/jwt`、删除 Auth 中间件、删除登录/注册 API |
| **User 模型** | Prisma model | 删除 `User` model 及相关路由 |
| **RevokedToken** | Prisma model | 删除（随 JWT 一起删除） |
| **NodePackage 市场** | Prisma model + 路由 | 删除 `NodePackage` / `NodePackageVersion` 模型、`server/src/routes/node-packages.ts` |
| **Snippets** | stub | 删除 `packages/shared-types/src/snippet.ts` |
| **SKU 模型** | Prisma model | 删除 `SKU` / `SKUWorkflow` 模型 |
| **WorkflowVersion** | Prisma model | 删除，版本管理收敛到 ProductTemplate.version |
| **apps/user-app** | 整个 app | 整体移除，Prism 不做独立用户产品 |
| **user-app 相关 API** | server 路由 | 删除 `PublishedWorkflow` API、`ProductTemplateListPage` / `ProductTemplateRunPage` |

### 11.2 保留项

| 保留项 | 理由 |
|--------|------|
| **dev-tool** | 品类搭建工具，mall 内部使用 |
| **Inspector 5 Tab** | 节点配置必需 |
| **Template Center** | ProductTemplate 管理必需，升级为 ProductTemplate 视角 |
| **Publish Dialog** | 升级为 ProductTemplate 发布 |
| **Execution Log** | Runtime 调试能力，简化保留 |
| **packages/* 核心包** | shared-types / shared-ui / node-definitions / workflow-core / image-ops / core |

### 11.3 精简后的 API 路由

```
Prism Server（精简后）
├── /api/templates
│   ├── GET    /api/templates           # 列出所有 ProductTemplate
│   ├── GET    /api/templates/:id       # 获取单个 ProductTemplate
│   ├── POST   /api/templates           # 创建设类配置
│   ├── PUT    /api/templates/:id       # 更新品类配置
│   └── DELETE /api/templates/:id       # 删除品类配置
│
├── /api/render
│   └── POST   /api/render              # 触发生产渲染
│
├── /api/assets
│   ├── POST   /api/assets/upload        # 上传素材
│   └── GET    /api/assets/:id          # 获取素材
│
└── /api/health
    └── GET    /api/health              # 健康检查
```

### 11.4 精简后的数据模型

```
ProductTemplate          ← 品类配置（核心）
├─ id, name, description, version
├─ content (完整 ProductTemplate JSON)
└─ createdAt, updatedAt

Workflow                 ← 工作流（精简版）
├─ id, templateId, name
├─ platform ('browser' | 'nodejs')
└─ content (workflow JSON)

Asset                    ← 素材
├─ id, templateId
├─ name, url, type
└─ createdAt
```

### 11.5 精简后的目录结构目标

```
prism-editor/
├── apps/
│   └── dev-tool/           ← 内部品类搭建工具
├── packages/
│   ├── shared-types/       ← 类型契约
│   ├── shared-ui/          ← UI 组件
│   ├── node-definitions/   ← 节点定义
│   ├── workflow-core/       ← 执行引擎
│   ├── image-ops/          ← 图像处理算法
│   │   ├── core/           ← 纯算法
│   │   ├── browser/        ← Canvas executor
│   │   └── nodejs/         ← sharp executor
│   └── composer-sdk/       ← Composer SDK（新增）
└── server/
    ├── src/
    │   ├── routes/         ← 精简后的路由
    │   │   ├── templates.ts
    │   │   ├── render.ts
    │   │   └── assets.ts
    │   └── services/
    └── prisma/
        └── schema.prisma   ← 精简后的 schema
```

---

## 12. 修订历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-07-06 | 基线重置：选定 Composer Platform 方向，吸收 change.md / product-template-v1.md / 历史对话的判断，作废 6 份历史 PRD/约束文档 |
| v1.0 | 2026-07-08 | 补充 PS 风格交互模型：拖拽图层零延迟感知 + 纯前端 Canvas 实时合成（叠加模式、蒙版运算），明确 dev-tool 与 Composer SDK 的职责分离 |
| v1.0 | 2026-07-08 | 定位调整为"mall 图像合成 runtime"：独立 DB + mall 信任模式（API Key + CORS）、瘦身体系（删除 JWT/User/NodePackage/SKU/WorkflowVersion/user-app）、精简 API 路由、解耦改造原则 |

---

## 13. 本次基线重置的决策记录

> 本节是 v1.0 落定时的"决策快照"，用于未来回溯。**不是新决策**，只是把已经做出的决策集中记录。

### 13.1 产品方向决策

| 决策 | 选择 | 备选 | 理由 |
|------|------|------|------|
| 产品主轴 | **Prism Composer Platform** | Prism Studio | 业务集成方向更明确、可验证、有真实品类需求 |
| Prism Studio 定位 | **本基线范围外**，仅作"未来可能分化" | 一同推进 | 资源有限，单线推进比双线分头好 |

### 13.2 架构决策

| 决策 | 选择 | 来源 |
|------|------|------|
| 节点架构 | **方案 C**：节点定义统一 + 算法分层（core / browser / nodejs）+ 平台能力标记 | `cursor_prism_composer_platform_director.md`（2026-05-25 用户确认） |
| 图像后端库 | **sharp** | 历史对话已确认 |
| 数据容器 | **ProductTemplate** 作为业务层唯一容器，Workflow 作为其内部 Flow | `product-template-v1.md` 已实装 |
| Preview 实时合成 | **纯前端 Canvas**，不请求后端 | 2026-07-08 用户确认 |
| Composer SDK 交互模式 | **PS 风格** —— 拖拽图层零延迟感知，实时 Canvas 合成 | 2026-07-08 用户确认 |
| 实时合成算法 | 叠加模式（正常/正片叠底/滤色/叠加/柔光）+ 蒙版运算（亮度蒙版/渐变蒙版/羽化） | 2026-07-08 用户确认 |
| **Prism 定位** | **mall 图像合成 runtime**，不是独立产品 | 2026-07-08 用户确认 |
| **数据存储** | 独立 DB（Prism 用 SQLite/PostgreSQL），mall 通过 API 访问 | 2026-07-08 用户确认 |
| **认证方案** | **mall 内部信任**：固定 API Key（server-to-server）+ CORS 白名单（frontend） | 2026-07-08 用户确认 |

### 13.3 范围决策（2026-07-06 用户拍板）

| 决策项 | 决策 | 落地 Phase |
|--------|------|-----------|
| `apps/user-app` | **删除** | Phase 0 |
| Node Marketplace（节点市场） | **删除** | Phase 0 |
| Snippets（代码片段） | **删除** | Phase 0 |
| WorkflowVersion 独立表 | **被 ProductTemplate 版本替代** | Phase 2 |
| SKU 模型 | **删除** | Phase 0 |
| JWT Auth + User 模型 | **删除**，改为 mall 信任模式 | Phase 0 |
| RevokedToken | **删除**（随 JWT） | Phase 0 |

### 13.4 保留决策

以下能力**保留并演进**，不进入舍弃清单：
- `apps/dev-tool` 全量保留（品类搭建工具）
- Inspector 5 Tab、Publish Dialog
- Template Center、Version History（迁移到 ProductTemplate 维度）
- `packages/*` 核心包（shared-types / shared-ui / node-definitions / workflow-core / image-ops / core）
- `server` Fastify + Prisma 基础设施
- Execution Log（简化保留）
- Runtime Protocol / Embed Config

### 13.5 仍待决策的开放项

| ID | 问题 | 阻塞？ |
|----|------|--------|
| Q3 | ProductTemplate 是否支持运行时绑定 inputs（动态表单） | 否 |
| Q4 | 后端生产文件 Output Spec 是否需要支持 PDF / 多页 | 否 |
| Q5 | dev-tool 编辑器是否需要可视化编辑 Flow 间的 bindings | 否 |
| Q6 | image-ops/core 抽算法时，是否保持现有 executor 100% 行为一致 | **是**（Phase 1 强制） |
| Q7 | 是否需要 Runtime 沙箱（防止节点代码执行风险） | 否 |

