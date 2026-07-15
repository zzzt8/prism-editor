# Product Template v1

> Established: 2026-06-09
> Updated: 2026-06-11
> Status: v1 — Initial business abstraction layer
> Implementation Status: ptl-1 (dev-tool CRUD) ✓ / ptl-2 (server API) ✓ / ptl-3 (user-app) ✓

---

## What is a Product Template?

A **Product Template** is a business-level object that sits above the Workflow concept.

```
Product Template
  ├── Preview Flow  ←→  Preview Canvas
  └── Production Flow  ←→  Production Output Spec
```

The core insight driving this model:

> Prism Editor's purpose is not "generic workflow editing."
> It is product-oriented image synthesis — typically producing something
> a factory or end user will receive as a finished artifact.

A Product Template captures the complete intent of a product editing job,
including how it should look on screen and how it should be rendered for delivery.

---

## Relationship to Existing Concepts

| Concept | Role |
|---|---|
| **Workflow** | Execution graph of nodes and connections |
| **EditorDraft** | Canvas persistence state (nodes, edges, groups, viewport) |
| **Template** | Snapshot-based reusable workflow asset |
| **PublishedWorkflow** | A workflow exposed to the end user in the app |
| **ProductTemplate** | Business layer grouping preview + production intent |

`ProductTemplate` does **not** replace any of the above.
It is an additional abstraction that can reference existing Workflows as its flows.

---

## 与现有 Workflow / PublishedWorkflow 的关系

`ProductTemplate` is the new **business-layer container**, while `Workflow` and
`PublishedWorkflow` remain the current operational models during the transition period.

- **Current phase does not replace `Workflow`** — existing editor, execution, and publish
  flows continue to use the legacy workflow objects.
- **`ProductTemplate` acts as the upper container first** — it groups business inputs,
  design parameters, preview intent, and production intent without changing runtime behavior.
- **`preview.flow` temporarily reuses existing flow objects** — it may reference either a
  `PublishedWorkflow` (preferred for current user-app runnable preview) or a `Workflow`
  (for editor-side or transitional preview scenarios).
- **`production.flow` currently keeps only a reference structure** — it may reference a
  `Workflow`, an external production process, or no bound flow yet. v1 does not implement
  production execution.
- **Preview and Production are allowed to diverge** — they are not required to point to the
  same workflow. Their consistency comes from shared `ProductTemplate.inputs` and
  `designParams`, not from sharing a single runtime graph.
- **Future direction** — `Preview Flow` and `Production Flow` will be split into clearer,
  more dedicated flow models step by step, instead of overloading today's legacy workflow
  objects forever.

A temporary mapping for v1:

```
ProductTemplate
  ├── preview.flow     -> PublishedWorkflow | Workflow
  └── production.flow  -> Workflow | external | none
```

This keeps the current publishing model intact while making room for later migration of the
existing published flow into `ProductTemplate.preview.flow`.

---

## 过渡期兼容：从 PublishedWorkflow 包装为 ProductTemplate

当前阶段新增了一个轻量兼容桥接函数，用于把既有 `PublishedWorkflow` 视为一个
`ProductTemplate`，但**不改变现有数据库、发布流程或运行时执行模型**。

兼容策略如下：

- **当前不迁移数据库** — 现有 `PublishedWorkflow` 持久化结构保持不变。
- **当前不改变发布流程** — dev-tool 仍然发布 `PublishedWorkflow`，不会直接发布
  `ProductTemplate`。
- **只把旧 `PublishedWorkflow` 视为 `ProductTemplate` 的 preview flow** — 兼容函数会把
  `preview.flow.type` 设为 `published-workflow`，并绑定 `publishedWorkflowId`。
- **`production.flow` 暂时为空** — v1 只提供占位结构，不启用生产图链路。
- **后续再升级发布流程** — 后续阶段再把 dev-tool 的发布模型演进为直接发布
  `ProductTemplate`。

当前桥接函数位置：

```
packages/shared-types/src/product-template-compat.ts
```

导出入口：

```
packages/shared-types/src/index.ts
```

### 默认绑定策略

当旧 `PublishedWorkflow` 通过兼容桥接函数被包装为 `ProductTemplate` 时，
系统会自动生成一套最小可用的 preview binding：

- **published inputs → `preview.flow.bindings.inputs`**
  - 每个已发布输入都会映射为一个 `ProductTemplateInput`
  - 同时绑定到 preview flow，target type 为 `published-input`
- **exposed params → `designParams` + `preview.flow.bindings.designParams`**
  - 每个 exposed param 会被提升为共享层的 `designParam`
  - 同时绑定到 preview flow，target type 为 `exposed-param`
- **这只是过渡期策略**
  - 目的是让旧 published workflow 在不改发布模型的前提下，先具备
    `ProductTemplate` 的共享层与绑定语义
- **Production Flow 仍然不自动生成**
  - `production.flow.type` 保持 `none`
  - 不自动推导 production bindings，也不生成生产执行逻辑
- **后续会支持显式配置 bindings**
  - 真正的 `ProductTemplate` 编辑器落地后，bindings 应由模板作者显式配置，
    而不是只依赖兼容桥接默认值

---

## Preview Flow

**Purpose:** Front-end real-time preview rendering.

The Preview Flow drives the canvas inside Prism Editor's dev-tool.
Its output is a `PreviewCanvasSpec` — a specification for how the canvas should
compose layers, handle background, and fit content.

Key characteristics:
- Interactive, fast iteration
- Runs in the browser via `workflow-core`
- Tied to the canvas viewport and visual composition

**Relation to existing code:**
The Preview Flow will initially point at existing Workflows. Over time, a dedicated
preview-optimized workflow variant may be introduced (e.g., lower resolution, simpler nodes).

---

## Production Flow

**Purpose:** Back-end factory-ready output generation.

The Production Flow produces the artifacts that will be delivered to the factory
or end user. Its output is a `ProductionOutputSpec` — a specification for
format, resolution, color profile, and output fields.

Key characteristics:
- High fidelity, potentially different node composition
- May run on the server (`@prism/server`) or in a headless Node.js environment
- Output is production-quality, not preview-quality

**Relation to existing code:**
Currently, production output is implicitly handled by the same workflow used for
preview. In v1, the two flows are allowed to be **completely different workflows**
— they only share inputs, assets, and design parameters.

---

## Shared State: Inputs, Assets, Design Params

Both flows reference the same:

- **`inputs`** — user-provided source materials (images, masks, files)
- **`assets`** — bundled or referenced materials (fonts, materials, overlays)
- **`designParams`** — editorial parameters (color, layout, copy, sizing)

This shared layer is the **consistency contract** between preview and production.
If preview and production diverge, they must do so within the bounds of this shared input.

---

## Flow Binding：共享输入与设计参数如何连接到两条流程

`ProductTemplate.inputs`、`designParams` 和 `assets` 是模板层的**共享数据面**。
它们本身只描述“有哪些输入/参数/资产”，并不直接规定这些数据怎样进入
`preview.flow` 或 `production.flow`。

因此，v1 引入一个显式绑定层：`bindings`。

- **共享层保持唯一来源** — 用户上传内容、关键设计参数、模板资产都定义在
  `ProductTemplate` 顶层。
- **`preview.flow` 和 `production.flow` 可以不同** — 它们可以引用不同的 workflow
  或不同的生产链路，不要求使用同一套运行时对象。
- **`bindings` 描述映射关系** — 每个 flow 自己声明，如何把共享层中的 `inputs`、
  `designParams`、`assets` 绑定到它所使用的节点输入、参数或 exposed entry。
- **支持同一批确认数据驱动两条链路** — 例如同一张设计图同时送入效果图预览和
  生产图流程；同一组位置/缩放参数同时影响 preview 节点参数与 production 节点参数。

概念上可表示为：

```
ProductTemplate
  ├── inputs / designParams / assets   (shared layer)
  │
  ├── preview.flow
  │     └── bindings -> map shared layer to preview targets
  │
  └── production.flow
        └── bindings -> map shared layer to production targets
```

这让 “效果图链路” 和 “生产图链路” 即使完全不同，仍然可以围绕**同一批用户确认的数据**
保持一致性。

---

```
  User Input
       │
  ┌────▼─────────────┐
  │  Shared Inputs  │
  │  Shared Assets  │
  │  Shared Params  │
  └────┬─────────────┘
       │
  ┌────┴────┐
  │         │
Preview   Production
  │         │
  │         └─→ ProductionOutputSpec
  └─→ PreviewCanvasSpec
```

---

## PreviewCanvasSpec

Describes how the preview canvas should render the product.

```typescript
interface PreviewCanvasSpec {
  width?: number;
  height?: number;
  background?: string;
  fit?: 'contain' | 'cover' | 'stretch';
  viewport?: { x?: number; y?: number; zoom?: number };
  layers?: PreviewCanvasLayerBinding[];
}
```

`layers` describe which inputs/assets/params map to which canvas layers,
enabling the dev-tool to render the canvas dynamically from the template definition
rather than requiring a pre-baked workflow.

---

## ProductionOutputSpec

Describes what the production output should look like when sent to the factory.

```typescript
interface ProductionOutputSpec {
  format?: 'png' | 'jpeg' | 'webp' | 'pdf' | 'svg';
  dpi?: number;
  colorProfile?: string;
  size?: { width?: number; height?: number; unit?: 'px' | 'mm' | 'cm' | 'in' };
  outputs?: ProductionOutputField[];
  notes?: string;
}
```

`outputs` enumerates the named fields the factory expects (e.g., `main_image`,
`mask_layer`, `cutting_outline`). Each field has a type and required flag.

---

## v1 Non-Goals (What This Does NOT Change)

The following are explicitly **out of scope** for v1:

- ❌ No change to `workflow-core` execution model
- ❌ No change to node definition registry
- ❌ No change to `image-ops` task scheduler
- ✅ ~~No change to dev-tool UI components~~ → **dev-tool CRUD UI 已完成 (ptl-1)**
- ✅ ~~No change to user-app UI components~~ → **user-app 模板商店和运行页已完成 (ptl-3)**
- ✅ ~~No change to server Prisma schema~~ → **ProductTemplate Prisma 模型已添加 (ptl-2)**
- ✅ ~~No change to published API contracts~~ → **ProductTemplate API routes 已实现 (ptl-2)**
- ❌ No change to the executor

This v1 is a **business concept and data model with runtime support**. The CRUD, API, and user-app consumption layers are now functional.

---

## Future Direction

**v1.1 (Completed 2026-06-11):** user-app consumption layer.

- ProductTemplateRepository: API adapter for loading templates from server
- ProductTemplateListPage: Template store with search, pagination, and grid/list view
- ProductTemplateRunPage: Run page with template metadata display and workflow execution
- Hash-based routing: `#/templates/` and `#/template/:id`

**v2 (TBD):** Bind `ProductTemplate` to the actual publishing pipeline.

- User selects a Product Template to run
- Preview Flow executes in dev-tool
- Production Flow executes server-side and produces factory deliverables
- Shared inputs/params are validated against both flows at publish time

**v3 (TBD):** Template marketplace and versioning.

- Product Templates become versioned, shareable assets
- Different product categories (packaging, labels, signage) have domain-specific template extensions

---

## Type File Location

All v1 types are defined in:

```
packages/shared-types/src/product-template.ts
```

Exported from:

```
packages/shared-types/src/index.ts
```
