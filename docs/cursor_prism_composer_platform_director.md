# Prism Composer Platform directory restructuring
_Exported on 2026/5/25 at GMT+8 17:49:03 from Cursor (3.2.21)_

---

**User**

/opsx-explore 根据prism editor change.md想一个改造方案，先把我们整个项目的文件目录先分清楚，再去做方案，我们先做的是Prism Composer Platform，我们可以先讨论一下

---

**Cursor**

<think>
The user wants to explore the project structure and discuss a transformation plan based on the "prism editor change.md" document. They want to understand the project file structure first, and they're focusing on "Prism Composer Platform" for now.

Let me first read the skill file for openspec-explore, then read the change document, and explore the project structure.
</think>




<think>
Let me read the skill and the change doc carefully. The user wants to explore the project structure and come up with a transformation plan for Prism Composer Platform. Let me follow the openspec-explore skill which says I need to:

1. First check OpenSpec status
2. Do structure analysis (scan the codebase structure)
3. Output a Task Anchor declaration
4. Explore the problem space
5. Capture decisions

The key constraint is: **NO CODE CHANGES** in explore mode.

Let me start by scanning the project structure and understanding what we have.
</think>




<think>
Let me check the OpenSpec status properly and get a better view of the project structure.
</think>




<think>
Good, no active changes. Now let me explore the project structure more systematically. I need to understand the current codebase structure, particularly focusing on the `apps/` and `packages/` directories.
</think>

Let me explore the project structure more systematically.


<think>
Now I have a comprehensive understanding of the project structure. Let me provide the Task Anchor and Impact Map as required by the openspec-explore skill.
</think>

## Task Anchor

- **原始任务**：根据 `prism editor change.md` 想一个改造方案，先把整个项目的文件目录分清楚，再做方案。先做的是 Prism Composer Platform。
- **本次用户追加内容**：先分清楚项目目录结构，再做 Prism Composer Platform 的改造方案。
- **追加内容类型判定**：**澄清** — 明确了探索顺序（先目录结构，再方案）
- **是否改变任务主题**：**否** — 仍是 Prism Composer Platform 改造

---

## Impact Map

基于代码库扫描，标注 layer 归属：

```
layer:app.dev-tool     → apps/dev-tool/ (前端编辑器)
layer:app.user-app     → apps/user-app/ (用户运行时)
layer:app.server       → server/ (Fastify + Prisma)
layer:pkg.image-ops    → packages/image-ops/ (Canvas 图像处理)
layer:pkg.workflow-core → packages/workflow-core/ (工作流引擎)
layer:pkg.node-definitions → packages/node-definitions/ (节点定义)
layer:pkg.shared-types → packages/shared-types/ (共享类型)
layer:pkg.shared-ui    → packages/shared-ui/ (UI 组件库)
layer:docs             → docs/ (文档)
layer:infra            → turbo.json, pnpm-workspace.yaml, CI/CD
```

---

## 当前结构分析

### 现状与问题

从 `change.md` 的产品定义来看，**Prism Composer Platform** 的核心是：

> **同一套结构化配置同时驱动前端预览和后端生产，并允许非工程师低代码搭建新品类。**

当前代码库的构建思路是围绕 **dev-tool = 工作流编辑器** + **user-app = 运行时** 构建的，但 **Composer Platform** 的需求完全不同：

| 维度 | 当前 dev-tool/user-app | Composer Platform |
|------|----------------------|-------------------|
| 核心交互 | 节点编辑器 / 参数表单 | 低代码品类配置器 |
| 渲染 | 前端 Canvas 合成 | 前端预览 + 后端生产 |
| 配置方式 | 工程师代码配置节点 | 低代码配置品类 |
| 接入方式 | 独立应用 | 嵌入到业务项目 |
| 交付物 | 工作流 JSON | 生产文件 |

### 关键发现

1. **`packages/image-ops/`** 是核心资产 — 已经实现了纯 Canvas 的图像操作（合成、mask、transform、export），且有 Web Worker 并行化。这可以直接用于 Composer Platform 的前端预览渲染。

2. **`packages/workflow-core/`** 目前的执行模型是"节点图拓扑排序执行"，更适合 dev-tool 的工作流编辑场景。Composer Platform 的执行模型可能需要简化或不同抽象。

3. **`apps/dev-tool/`** 的 `modules/persistence/` 和 `modules/repositories/` 是数据层抽象，但目前绑定在 dev-tool 语境下。Composer Platform 需要把"品类配置"作为一等公民。

4. **`packages/shared-types/`** 中缺少 Composer Platform 专属的类型定义（如 `CategorySchema`、`LayerSchema`、`InputSchema`、`PreviewAsset`、`ProductionAsset`、`OutputSpec`）。

5. **`server/`** 目前主要是 Workflow 存储和 Node 包管理，Composer Platform 需要新增品类管理、生产渲染任务管理、素材管理。

### Unknowns（需要讨论）

1. Composer Platform 的**品类配置系统**是在 dev-tool 里扩展，还是独立成一个新 app（`apps/composer/`）？
2. 前端预览渲染（轻量素材 + 实时预览）和后端生产渲染（高清素材 + 最终文件）之间的**配置驱动同步机制**怎么设计？
3. **低代码品类搭建器**需要哪些基础能力？是否有现有的低代码方案可以参考？
4. **Composer SDK** 的形态（npm package？Web Component？iframe embed？）优先级是什么？
5. 业务项目接入时，**素材/配置/生产信号**怎么传递？

---

## 讨论点

我们先聚焦在第一个问题上：**品类配置系统放在哪里？**

**Option A**：在 dev-tool 基础上扩展，增加"品类配置"模式
**Option B**：独立 `apps/composer/` 作为新产品
**Option C**：新建 `packages/composer-core/` + 轻量嵌入 SDK，dev-tool 改为"品类 Studio"

你觉得哪种方向更符合你的预期？

---

**User**

/opsx-explore 澄清一个问题，节点式编辑器就是低代码的意思

---

**Cursor**

<think>
The user is clarifying a point - they're saying that the node-based editor IS the low-code approach. So Option A/C where the node editor itself serves as the low-code builder makes more sense. Let me explore this clarification and how it affects the discussion.
</think>

## Task Anchor

- **原始任务**：根据 `prism editor change.md` 想改造方案，先分清楚目录结构，再做方案。先做 Prism Composer Platform。
- **本次用户追加内容**：「节点式编辑器就是低代码的意思」
- **追加内容类型判定**：**澄清** — 重新定义"低代码品类搭建器"的具体形态


- **是否改变任务主题**：**否** — 只是澄清了实现方式

---

明白了。**节点式编辑器本身就充当低代码品类搭建器**，不需要另起一套系统。

这意味着：

**dev-tool 的节点编辑器 = 品类搭建界面**
**dev-tool 的 Publish 协议 = 品类配置发布**
**user-app / Composer SDK = 品类运行时预览**

那么"品类"这个概念在现有代码中的等价物是什么？对比一下：

| Composer Platform 概念 | 现有代码等价物 | 差异点 |
|---|---|---|
| 品类（Category）| Workflow / 模板 | 品类是**可配置参数的**，Workflow 是静态的 |
| 品类搭建者 | dev-tool 用户 | 同一个人 |
| 业务项目接入方 | user-app 用户 | 同一个人 |
| 终端用户（配置参数）| user-app 参数填写 | 同一个人 |
| 前端预览 | user-app 运行结果 | 需要轻量素材版本 |
| 后端生产渲染 | server 新能力 | **目前缺失** |
| 生产文件输出 | user-app 导出 | 需要重新定义 Output Spec |

---

## 更清晰的 Unknown

关键 Unknown 变成了一个：

> **品类 = 带参数占位符的 Workflow 模板**。dev-tool 已经有 PublishWorkflow 能力（把 workflow 发布为带配置的模板）。问题是：
> 1. 当前 `PublishedWorkflow` 的"参数"粒度是节点 port 参数，是否需要升级为**品类级输入项**（如选择底色、输入文字、选择尺寸）？
> 2. 后端生产渲染（高清素材 + 生产规则 → 工厂文件）**目前完全缺失**，这是 Composer Platform 最大的工程缺口。
> 3. 前端预览和后端生产需要**同一套结构化配置驱动**，当前 workflow 执行模型能否承载？

---

这个澄清改变了我的判断——**品类搭建不需要新建 app 或系统**，而是在现有 dev-tool 节点编辑器上**扩展品类语义**。

你觉得这个理解对吗？如果对，下一个问题是：后端生产渲染（高清素材 + 生产规则 → 工厂文件）是第一阶段就要做，还是先只做前端预览 + 轻量 SDK 接入？

---

**User**

/opsx-explore 品类就是sku，一个sku的品类会对应一条或者多条Workflow来进行图像合成，它们之间并不冲突

---

**Cursor**

<think>
The user is clarifying that:
1. Category/SKU = a product type (like "keyboard keycap", "phone case", etc.)
2. One SKU can have one OR multiple Workflows for image synthesis
3. They don't conflict with each other

So the model is:
- SKU/Category = product type
- SKU has 1..N Workflows associated with it
- Each Workflow handles part of the image synthesis pipeline

This means:
- A "SKU" is not a single workflow, but a container of workflows
- Multiple workflows can contribute to the same product's visual output
- This is more flexible than 1:1 mapping


- Now I'm looking at what changes this requires in the data model: we need to introduce SKU as a new concept, establish the 1:N relationship between SKU and Workflows, and reconsider what publishing actually means in this context.

Let me anchor this task and explore the implications.
</think>

## Task Anchor

- **原始任务**：根据 `prism editor change.md` 想改造方案，先分清楚目录结构，再做方案。先做 Prism Composer Platform。
- **本次用户追加内容**：「品类就是 SKU，一个 SKU 的品类会对应一条或者多条 Workflow 来进行图像合成，它们之间并不冲突」
- **追加内容判定**：**澄清** — SKU 是 Workflow 的容器，一个 SKU 可关联多条 Workflow
- **是否改变任务主题**：**否** — 深化了品类与 Workflow 的关系模型

---

明白了。这个模型更灵活也更真实：

```
SKU (品类)
└── Workflow A (图层合成)
└── Workflow B (调色/风格化)
└── Workflow C (导出/裁剪)
...
```

**它们不冲突，可以并行、可以串行，共同构成一个 SKU 的完整图像合成流水线。**

---

## 这个澄清带来的影响

### 1. 数据模型变化

现有 `PublishedWorkflow` 是一级概念。SKU 作为**上层容器**引入：

```
SKU
├── id / name / description / categoryType
├── workflows: PublishedWorkflow[]
├── assets: { preview: Asset[], production: Asset[] }
├── inputSchema: CategoryInputSchema  ← 用户可填的品类参数
└── outputSpec: OutputSpec            ← 工厂文件规范
```

这意味着 `packages/shared-types/` 需要新增 `SKU` 类型，以及 `SKUInputSchema` / `SKUOutputSpec`。

### 2. dev-tool 的变化

dev-tool 当前是"单条 Workflow 编辑 → Publish"。升级后：

- **SKU 级别**：品类名称、描述、品类参数配置、素材管理
- **Workflow 级别**：节点编辑器（保持不变）
- **1 SKU : N Workflow** 的关联在 dev-tool 内管理

这意味着 dev-tool 需要新增 **SKU 管理视图**（品类列表、品类详情、关联 Workflow 管理）。

### 3. user-app / SDK 的变化

user-app 当前是"选择一条 PublishedWorkflow → 填参数 → 运行"。升级后：

- **SKU 级别**：选择品类 → 展示该 SKU 的所有 Workflow
- **并行运行**：多个 Workflow 同时执行
- **结果组装**：多条 Workflow 输出如何合并/传递给下一条

或者换个角度：SKU 的多条 Workflow 在 dev-tool 编排为一个**串联/并联执行图**，user-app 只看到"运行 SKU"这一个动作。

### 4. 生产渲染的变化

如果一个 SKU 的最终输出是多张图（Workflow A 出图1 + Workflow B 出图2），那**生产文件**的概念也变了：

- 可能是打包成一个 zip
- 可能是一个多页 PDF
- 可能是多张独立文件 + 配置文件

SKU 级别的 `OutputSpec` 需要定义这个。

---

## 当前结构中的对应关系

| 新概念 | 现有代码位置 | 需要改动 |
|---|---|---|
| SKU 类型定义 | `packages/shared-types/` | **新增** `sku.ts` |
| SKU <-> Workflow 关联 | `server/prisma/schema.prisma` | **新增** `SKU` 模型 |
| SKU 管理 UI | `apps/dev-tool/` | **新增** SKU 管理模块 |
| SKU 级别的运行时 | `apps/user-app/` 或新 SDK | **改造** 运行时选择 SKU |
| SKU 生产渲染 | `server/` | **新增** 生产渲染任务 |
| SKU 素材管理 | `server/` (OSS) | **新增** 轻量/高清素材分离 |

---

## 下一个问题

既然一个 SKU 可以有多条 Workflow，这里有个架构决策：

> **SKU 内的多条 Workflow，在运行时是串行（输出接输入）还是并行（各自独立执行后合并）？**

还是说两者都要支持，品类搭建者可以自己选择？

---

**User**

/opsx-explore sku里面的工作流没有串联关系，举一个简单的例子，一个sku往往有给前端做预览的工作流，还有一个后端裁切的工作流。这个根本上的问题在于我们的workflow能不能同时兼容前端和后端的计算

---

**Cursor**

<think>
This is a crucial technical clarification. The user is saying:

1. SKU workflows are NOT串联 (chained/serial) - they are independent
2. Example: one workflow for frontend preview, another workflow for backend cropping/trimming
3. The core question: **Can the workflow engine simultaneously support both frontend AND backend computation?**

This is actually about a deeper architectural question - can the same workflow definition run on both the browser (frontend) and the server (backend)?

Let me think about this in the context of the current codebase.

Current state:
- `packages/image-ops/` - Canvas-based image operations, runs in browser with Web Workers


- `packages/workflow-core/` - Workflow execution engine with topological sort and type validation, also running in the browser
- `apps/user-app/` - Uses `image-ops` in the browser for runtime execution
- `apps/dev-tool/` - Editor with preview using `image-ops`
- `server/` - REST API for storage, no workflow execution engine yet

So the real challenge here is whether a single workflow definition can be interpreted by different executors - one running in the browser for preview and another running on the server for production rendering.

Looking at what's needed: the workflow executor needs to be backend-compatible, image operations must work server-side (Node.js instead of browser Canvas API), and there needs to be a way to map workflow nodes to appropriate operations depending on where they're running. The existing `node-definitions` with type and port definitions could provide the abstraction layer needed to support both execution environments.

The core blocker is that `packages/image-ops/` depends on the browser Canvas API and `OffscreenCanvas` in workers, which don't exist in Node.js. So I need to understand what the actual requirement is here - whether the same workflow should run identically in both contexts, or if they should produce equivalent results through different implementations. Let me explore what's actually blocking this unification.
</think>

## Task Anchor

- **原始任务**：根据 `prism editor change.md` 想改造方案，先分清楚目录结构，再做方案。先做 Prism Composer Platform。
- **本次用户追加内容**：「SKU 里的 Workflow 没有串联关系。SKU 通常有前端预览工作流 + 后端裁切工作流。根本问题是 workflow 能否同时兼容前端和后端计算」
- **追加内容判定**：**澄清** — 揭示了核心架构问题：单套 Workflow 定义能否在前端和后端同时执行
- **是否改变任务主题**：**否** — 深化了对 Composer Platform 技术核心的理解

---

这是一个**根本性的架构问题**。让我先扫描一下当前代码的执行模型，看看障碍在哪里。


<think>
Now let me read the key files to understand the current execution model - specifically the executor and node definitions to see if nodes have a "runTarget" concept.
</think>




<think>
Now I have a good understanding of the current execution model. Let me read a few more key files to understand the full picture - especially the `load-image.ts` executor (which handles file input) and how the user-app runs workflows, to understand where the frontend/backend execution boundary currently sits.
</think>




<think>
Now I have a clear picture. Let me analyze the core issue.

The fundamental question is: **Can the current workflow system simultaneously support frontend and backend computation?**

Let me analyze what I found:

**Current execution model:**
- `WorkflowExecutor` runs node graphs by:
  1. Topological sort to determine execution order
  2. Parallel execution by topological levels
  3. Each node executor is a pure function: `(inputs, params, ctx) => Promise<outputs>`

**Current node executors (in `packages/image-ops/src/executors.ts`):**
- All are browser-only: they use `Image`, `Canvas`, `OffscreenCanvas`, `fetch`, `URL.createObjectURL`


- The `loadImageExecutor` relies on browser APIs like `Image`, `HTMLCanvasElement`, `OffscreenCanvas`, and CORS handling through fetch
- Image memory management uses a browser-specific singleton pattern

**The core incompatibility:**
Browser APIs can't run in Node.js without polyfills, and Web Workers depend on browser-specific transfer mechanisms. Even if I tried to run this on the server, I'd need to swap out all the canvas operations, image loading, and blob handling for Node.js equivalents.

The real problem is that the node executors are tightly bound to browser environments. To make a single workflow work across frontend and backend, I'd need to either abstract away the execution environment entirely, create separate executor implementations for each platform, or build an adapter layer that handles the differences. The compositing, masking, and transformation operations themselves are mathematically sound and could work anywhere, but the API surface is locked to browser APIs.

The solution is to introduce a runtime abstraction layer that decouples the workflow from where it actually executes.

Defining the runtime interface...
</think>

现在我有了完整的图景。让我直接给出分析结论。

---

## 核心问题：当前 Workflow 能否同时兼容前端和后端？

**答案是：不能，原因不在 Workflow 模型本身，而在于 Node Executor 的执行环境依赖。**

### 当前障碍分析

```
WorkflowExecutor (workflow-core)
  └─ 遍历节点拓扑 → 并行执行各节点
       └─ nodeExecutor (image-ops)
            ├─ loadImage  → 依赖 Image() + HTMLCanvasElement + fetch (浏览器)
            ├─ composite  → 依赖 CanvasRenderingContext2D (浏览器)
            ├─ applyMask  → 依赖 ImageData + Canvas API (浏览器)
            ├─ transform  → 依赖 Canvas API (浏览器)
            ├─ export     → 依赖 canvas.toBlob (浏览器)
            └─ Web Worker → 依赖 postMessage + transferable (浏览器)
```

### 问题根源

不是"计算不能跨端"，而是 **API 绑定在浏览器**。但好消息是：图像处理的数学逻辑（合成算法、mask 计算、变换矩阵）是纯函数，**本身完全可以在 Node.js 重跑**。

关键在于需要一个**抽象执行层**：

```text
┌─────────────────────────────────────────────────┐
│              WorkflowDefinition                   │
│         (节点图 + 参数，完全跨端)                 │
└──────────────────────┬──────────────────────────┘
                       │
              ┌────────▼────────┐
              │  RuntimeTarget   │
              │  enum {          │
              │    browser,      │
              │    nodejs        │
              │  }               │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             │             ▼
  ┌─────────────┐     │      ┌─────────────┐
  │ BrowserExec │     │      │ NodeJSExec  │
  │ (image-ops) │     │      │ (sharp/png) │
  │ Canvas API  │     │      │ Buffer API  │
  └─────────────┘     │      └─────────────┘
```

### 同一条 Workflow 的不同执行策略

同一个节点图，可以通过不同 executor 实现达到不同效果：

| 场景 | 目标 | 策略 |
|------|------|------|
| **前端预览** | 轻量、实时、交互流畅 | Canvas API + 轻量素材 + 低分辨率 |
| **后端生产** | 高清、精确、可复现 | sharp/libvips + 高清素材 + 完整分辨率 |

### 需要的改动

**最小改动路径**（不需要重构整个系统）：

1. `packages/image-ops/` 新增 `runtime-target` 参数到 executor 函数签名
2. 针对 `loadImage`：前端用 `Image + Canvas`，后端新增 `loadImageNodeJs` 用 `sharp` 或原生 `fs`
3. 针对 `export`：前端输出 `blob URL`，后端输出 `Buffer` / `file path`
4. 针对 `composite/transform/applyMask`：核心计算逻辑抽成纯函数，两端复用
5. `server/` 新增 `POST /api/sku/:id/render` 接口，接收 `SKUConfig + 用户参数`，执行后端渲染

---

这个改动有多大？如果按最小路径，**主要工作量在 `packages/image-ops/` 新增 Node.js 端的 executor**，其他层面改动较小。

你觉得这个方向对吗？如果对，我们可以开始聊具体的改动范围和优先序了。

---

**User**

/opsx-explore 我觉得这个方向是对的，我希望我们不要争对前端后端写两套节点体系，这是没有必要的，节点可以在前端和后端通用。而且前端写工作流和后端写工作流的侧重点不太一样，我们在新建工作流的时候可以区分，给一个选择，是建立前端工作流还是后端。如果是这样区分，可能存在写两套节点，我需要和你讨论一下，到底怎么样，优缺点分别是什么？

---

**Cursor**

<think>
The user wants to discuss the trade-offs between:

1. **One unified node system** that works on both frontend and backend
2. **Two separate node systems** - one for frontend preview workflows, one for backend production workflows

The user is asking me to analyze the pros/cons of each approach.

Let me think through this carefully.

**Option A: One unified node system**

All nodes are defined once, with platform-agnostic executor implementations. A node like "Load Image" works the same way on frontend and backend - just different I/O APIs (Canvas vs Node.js file system).

Pros:
- Single source of truth for node definitions


- No duplication of logic - compositing algorithms, mask operations, transform math all written once
- Easier to maintain - one node definition change propagates everywhere
- More natural "one workflow, two execution targets" model
- Easier to reason about - there's just one set of nodes
- Future: if Prism Studio needs to run workflows server-side, the same workflow can be used

Cons:
- Executor implementations will need platform detection and abstraction layers
- Some nodes may have inherently different behaviors (e.g., LoadImage: frontend loads from blob/file picker, backend loads from file path/URL)
- Need to handle "this node only works on frontend/backend" gracefully
- Node definitions need to include platform metadata to indicate capabilities
- Abstraction layer can add complexity

**Option B: Two separate node systems**

Frontend nodes and backend nodes are completely separate packages with their own definitions and implementations.

Pros:
- Clear separation - each platform has exactly what it needs
- No abstraction overhead
- Easier to reason about what's available where
- Frontend nodes can be more interactive-focused, backend nodes can be more production-focused
- Simpler executor implementations (no platform branching)

Cons:
- Duplicate node definitions for equivalent operations
- Duplicate logic for compositing, masks, transforms
- Two sets of node definitions to maintain
- Can't share workflows between platforms
- If a workflow concept changes, need to update both systems
- The distinction can become blurry - what's "frontend" vs "backend" for a transform node?
- Leads to divergence over time
- Harder to migrate if a node concept needs to work on both

Now looking at Option C with unified definitions but separate executors, where the node catalog is shared but implementations vary by platform. This gives me the best of both worlds - single source of truth for what nodes exist and their semantics, with platform-specific executor implementations. The main trade-off is needing a clear platform capability system and handling nodes that only work on one platform, though the duplication shifts from logic to just implementation files. I should present this as a middle ground that addresses the core concerns about maintaining consistency while allowing platform-specific optimizations.
</think>

## Task Anchor

- **原始任务**：根据 `prism editor change.md` 想改造方案，先分清楚目录结构，再做方案。先做 Prism Composer Platform。
- **本次用户追加内容**：「节点应该在前端和后端通用。新建工作流时可以选择是前端工作流还是后端工作流。但担心这样会变成写两套节点，需要讨论优缺点。」
- **追加内容判定**：**新需求** — 需要明确节点体系的架构决策
- **是否改变任务主题**：**否** — 仍围绕 Composer Platform 技术架构

---

这是个很关键的架构讨论。让我把三个方案都摆出来，逐个分析。

---

## 三个方案对比

### 方案 A：一套节点，两套 Executor

```
packages/node-definitions/
└── definitions.ts          ← 唯一的节点定义（节点类型、输入输出、参数 schema）

packages/image-ops/
├── browser/               ← 前端 executor（Canvas API）
│   ├── load-image.ts
│   └── composite.ts
└── nodejs/                ← 后端 executor（Sharp / Buffer）
    ├── load-image.ts
    └── composite.ts
```

每个节点定义一份，但 executor 写两套实现。逻辑相同，平台 API 不同。

**优点**：
- 节点语义统一，不会出现"前端有 composite 后端没有"的情况
- 同一份节点定义驱动两侧，node 参数变更只改一处
- 前端工作流和后端工作流可以互相替换节点（比如前端预览用轻量 composite，后端生产用高精度 composite）
- 未来如果 Prism Studio 需要把同一个 workflow 拉到后端跑，天然支持

**缺点**：
- executor 实现文件翻倍
- 两套实现需要保持同步（如果算法改了，两边都要改）
- 需要明确区分"哪些节点是纯前端/纯后端/两者都有"

---

### 方案 B：两套完全独立的节点体系

```
packages/node-definitions/
├── frontend/               ← 前端节点
│   └── definitions.ts
└── backend/                ← 后端节点
    └── definitions.ts

packages/image-ops/
├── browser/                ← 前端 executor
└── nodejs/                 ← 后端 executor
```

前端一套、后端一套，定义和实现都分开。

**优点**：
- 两边完全解耦，可以各自独立迭代
- 前端节点可以专注交互体验（如文件选择器节点、实时预览节点）
- 后端节点可以专注生产（如高清裁切节点、文件输出节点）

**缺点**：
- **重复逻辑**：composite/mask/transform 的计算公式要写两遍
- **概念分裂**：同一个"合成"在前端叫 composite，在后端叫 production-composite，维护成本高
- **无法共享 workflow**：前端预览 workflow 和后端生产 workflow 语义不对齐
- **维护地狱**：如果产品逻辑变了，要同时改两边，还要保证行为一致
- **边界模糊**：哪些节点是前端专属？crop 算前端专属吗？裁切算后端专属吗？边界会越来越模糊

---

### 方案 C（我的建议）：定义统一，执行分层

```
packages/node-definitions/
└── definitions.ts          ← 唯一的节点定义（含平台能力标记）

packages/image-ops/
├── core/                   ← 纯算法层（composite math, mask math, transform math）
│   ├── composite-math.ts
│   ├── mask-math.ts
│   └── transform-math.ts
├── browser/                ← 前端 executor（调用 core + Canvas API）
│   ├── load-image.ts
│   ├── composite.ts
│   └── mask.ts
└── nodejs/                 ← 后端 executor（调用 core + sharp/Buffer API）
    ├── load-image.ts
    ├── composite.ts
    └── mask.ts
```

节点定义一份，核心算法抽成纯函数复用，两端 executor 只写"如何把数据读进来 + 如何把结果写出去"的胶水层。

**为什么这个方案最好**：

| 维度 | 方案 A（两套 executor） | 方案 B（两套节点） | 方案 C（算法分层） |
|------|----------------------|------------------|------------------|
| 节点定义一致性 | ✅ | ❌ | ✅ |
| 核心逻辑复用 | ❌（算法重复） | ❌（完全重复） | ✅（core 层复用） |
| 执行层解耦 | ⚠️（算法可能耦合） | ✅ | ✅ |
| 前端/后端 workflow 可替换 | ✅ | ❌ | ✅ |
| 维护成本 | 中 | 高 | 低 |
| 平台特有节点支持 | ⚠️（需要能力标记） | ✅（天然分离） | ✅（能力标记） |

---

## 方案 C 的关键设计：平台能力标记

节点定义里加一个字段，标注"在哪里可用"：

```ts
interface NodeDefinition {
  // ... 现有字段
  platforms?: ('browser' | 'nodejs' | 'both')[];
}
```

前端工作流编辑器只展示 `both` + `browser` 节点。后端工作流编辑器只展示 `both` + `nodejs` 节点。`both` 节点两边都能用。

---

## 核心问题的答案

回到你最初的问题：**节点可以在前端和后端通用**——这是对的，但不是"一套 executor 通用"，而是**核心算法通用 + 读写层差异化**。

这意味着：
- `composite` 节点在前端和后端**数学上完全一致**（blend mode 计算公式只写一份）
- 前端用 `CanvasRenderingContext2D`，后端用 `sharp`
- 但对开发者来说，他感知到的是"同一个 composite 节点"

---

你觉得这个方向符合你的预期吗？还是有其他约束我没考虑到（比如团队协作方式、或者某些节点天然就是单平台的）？

---

**User**

/opsx-explore 没错就用方案c，现在你还有问题要问我吗，这是一个非常大的任务，可能要分很多个change来做

---

**Cursor**

<think>
The user has confirmed Plan C and is asking if I have more questions. This is a large task that will be split into multiple changes. Let me think about what questions I still need to ask before we can move to propose phase, based on the SKILL.md criteria for switching to propose:

Must satisfy (all):
- [ ] 核心问题已有清晰的技术理解 ✅ (Plan C confirmed)
- [ ] 改动范围已标注到 layer 级别 - Need to outline this
- [ ] 用户明确表示要开始实现 - User just said to use Plan C and asked about next steps


- [ ] 有 3 个以上的 unknowns 已被回答 - Let me check: SKU=Workflow container, Workflows within SKU are independent with no serial connections, Plan C is the architecture choice
- [ ] 已画出 ASCII architecture diagram - Not yet formally
- [ ] 需要协调其他 active changes - OpenSpec shows no active changes
- [ ] 涉及数据迁移或 Prisma schema 变更 - Likely yes (SKU model)

Looking at what's still unclear, I need to understand the scope of Phase 1 work—whether we're building the infrastructure first (core layer, node definition changes, Prisma schema) before tackling both executor paths, and what comes after. The key unknowns are the initial implementation scope, the rollout sequence for Plan C, and how we should break this into separate changes. I should also clarify which changes can happen in parallel, the dependencies between them, the existing codebase state, and which features have priority.

Let me organize my remaining questions around the most critical decision points before moving forward.
</think>

## Task Anchor

- **原始任务**：根据 `prism editor change.md` 想改造方案，先分清楚目录结构，再做方案。先做 Prism Composer Platform。
- **本次用户追加内容**：「确认用方案 C。这是一个非常大的任务，可能要分很多个 change 来做。」
- **追加内容判定**：**澄清** — 确认架构方案，明确这是分阶段大任务
- **是否改变任务主题**：**否**

---

确认方案 C 了。在我们转向 propose 之前，我还有几个关键问题需要你来决策，这些会直接影响 change 的拆分方式。

---

## 需要你回答的问题

### Q1：最小起步 Change

这个改动可以切得很碎。你希望**第一个 change** 只做什么？

**A. 先建基础设施**：在 `packages/image-ops/core/` 把现有算法抽出来，作为独立纯函数层。还不涉及 executor 拆分，只是把代码结构变得更清晰。这个 change 风险最小，不会破坏现有功能。

**B. 先建 SKU 模型**：先在 `packages/shared-types/` 和 `server/prisma/` 里定义 SKU 数据结构，以及 SKU 与 Workflow 的关联关系。这个 change 不碰 image-ops，只改数据层。

**C. 先做平台能力标记**：先在 `NodeDefinition` 加 `platforms` 字段，改造 `packages/node-definitions/` 的注册机制。这个 change 也不破坏现有功能。

---

### Q2：现有 `image-ops` 的改动范围

当前 `image-ops` 的 executor 已经完整实现了：
- `load-image`、`load-mask`、`apply-mask`、`composite`、`transform`、`export`、`empty-input`

改造后，每个 executor 都要拆成：
```
core/      ← 纯算法（可 Node.js 运行）
browser/  ← 前端 executor（调用 core + Canvas API）
nodejs/   ← 后端 executor（调用 core + sharp/Buffer API）
```

**你的预期**：
- 是先从**某一个节点**开始试点（比如只拆 `composite`），验证方案后再全面铺开？
- 还是希望一次性把**所有节点**都按方案 C 改造？

---

### Q3：后端 executor 的依赖

后端需要图像处理库。`sharp` 是 Node.js 生态里最成熟的，API 也清晰。但它需要 native 依赖。

**你倾向于**：
- 用 `sharp`（功能强、成熟稳定，但有 native 依赖）
- 用 `jimp`（纯 JS，无 native 依赖，但功能相对少）
- 其他方案？

---

### Q4：dev-tool 的改造方式

`apps/dev-tool` 新建工作流时要区分"前端工作流"和"后端工作流"。这涉及 UI 改动。

**你倾向于**：
- **A. 在 NewWorkflowModal 里加一个 Radio**：选"前端工作流"还是"后端工作流"，选完后编辑器里只展示对应平台的节点
- **B. 改成两个独立入口**：导航栏两个按钮"新建前端工作流"和"新建后端工作流"，分别进入不同编辑器
- **C. 保持一个编辑器**，但加平台切换 tab，通过 tab 切换展示的节点集合

---

这四个问题回答后，我就基本可以勾勒出 **Phase 1 的 Change 拆分**了。

