# Proposal: ProductTemplate Lifecycle

**change_class**: `high`

**reason**: 触及 `server` Prisma schema、`server` API 契约、`dev-tool` 多个 store 与 UI 组件、`user-app` 消费层，横跨 5 个 layer，需拆分为 3 个有序子 change。

---

## Why

当前 `ProductTemplate` 只有类型定义（`shared-types`）和兼容桥接函数（`product-template-compat.ts`），没有任何运行时生命周期：

- dev-tool 编辑器无法创建或编辑 `ProductTemplate`
- 没有 server 端持久化（Prisma 无模型，API 无路由）
- dev-tool 发布链只认 `PublishedWorkflow`
- user-app 只加载 `PublishedWorkflow`

用户期望在 dev-tool 里"打开编辑器就能创建和编辑 ProductTemplate，并保存发布"。

---

## What Changes

新增完整的 `ProductTemplate` 生命周期，覆盖以下阶段：

1. **创建** — dev-tool 提供入口，从空白或现有 Workflow 派生 ProductTemplate
2. **编辑** — 编辑元数据、inputs、designParams、assets、preview.canvas、production.output
3. **保存** — IndexedDB 本地持久化（dev-tool 先行）+ server 端持久化（后续子 change）
4. **发布** — 把 ProductTemplate 绑定到已发布的 Workflow，暴露给 user-app

---

## Capabilities

- dev-tool 侧提供 ProductTemplate 创建入口（工具栏或菜单）
- dev-tool 侧提供 ProductTemplate 编辑模态框（name、description、inputs、designParams、assets、preview.canvas 配置）
- IndexedDB 持久化 ProductTemplate（不依赖 server，先行方案）
- dev-tool 发布流程扩展：可以选择发布为 ProductTemplate（或继续发布为 legacy PublishedWorkflow）
- user-app 可以从 ProductTemplate 列表选择并运行
- `createProductTemplateFromPublishedWorkflow()` 桥接函数用于展示已有 PublishedWorkflow 为 ProductTemplate

---

## Impact

| Layer | 路径 | 影响 |
|-------|------|------|
| `shared-types` | `packages/shared-types/src/` | 已有类型完整，新增 repository 接口 |
| `server` | `server/src/routes/`, `server/prisma/schema.prisma` | 新增 ProductTemplate Prisma 模型 + API 路由 |
| `editor` | `apps/dev-tool/src/` | 新增 store、repository、UI 组件、发布流程扩展 |
| `runtime` | `apps/user-app/src/` | 新增 ProductTemplate 列表页、详情/运行页 |
| `docs` | `docs/product-template-v1.md` | 更新文档说明 v2 路线 |

---

## Out of Scope

- ❌ `workflow-core` 执行模型变更
- ❌ 节点定义注册表变更
- ❌ `image-ops` 任务调度器变更
- ❌ Template marketplace（属于 v3）
- ❌ ProductTemplate 版本化（复用 `WorkflowVersion` 模型可后续评估）
- ❌ 真正的 production flow 执行（preview flow 先行，production flow 属于后续迭代）
- ❌ 离线场景的 IndexedDB 先行方案之外的 PWA 支持

---

## Sub-Change 拆分

由于本 change 规模大，拆分为 3 个有序子 change：

| # | 子 change | 主 layer | 依赖 | 目标 |
|---|----------|---------|------|------|
| 1 | `ptl-1-devtool-crud` | `editor` | 无 | dev-tool 本地 CRUD（IndexedDB）|
| 2 | `ptl-2-server-api` | `backend` | 依赖类型契约（子 change 1 后执行）| server Prisma 模型 + REST API |
| 3 | `ptl-3-userapp-consumption` | `runtime` | 依赖子 change 2 | user-app 展示与运行 ProductTemplate |
