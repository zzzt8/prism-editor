# Proposal: ptl-3-userapp-consumption

**change_class**: `high`

**reason**: 触及 `user-app` 展示层、路由层和运行时执行层，横跨 `runtime` layer，并通过 API 契约依赖 `backend`。

---

## Why

当前 user-app 只从 `/published` API 加载 `PublishedWorkflow`。用户无法看到和管理 `ProductTemplate`。本子 change 让 user-app 能以 ProductTemplate 为入口选择和运行产品。

---

## What Changes

- user-app 新增 ProductTemplate 列表页（模板选择器）
- user-app 新增 ProductTemplate 详情/运行页
- 调用 `createProductTemplateFromPublishedWorkflow()` 把已有 PublishedWorkflow 展示为 ProductTemplate
- 复用现有 `PublishedWorkflowExecutor` 运行实际 workflow

---

## Capabilities

- user-app 可以浏览 ProductTemplate 列表（从 server 加载）
- user-app 可以搜索/筛选 ProductTemplate
- user-app 可以查看 ProductTemplate 详情（inputs、designParams、preview.canvas）
- user-app 可以运行 ProductTemplate（通过 preview.flow 绑定到 PublishedWorkflow）
- 已有 PublishedWorkflow 自动展示为 ProductTemplate（桥接函数）

---

## Impact

| Layer | 路径 | 影响 |
|-------|------|------|
| `shared-types` | — | 无变更（已使用已有类型） |
| `server` | — | 无变更 |
| `editor` | — | 无变更 |
| `runtime` | `apps/user-app/src/` | 新增页面、repository、store |
| `docs` | `docs/product-template-v1.md` | 更新 v2 状态 |

---

## Out of Scope

- ❌ production flow 执行
- ❌ 模板 marketplace / 分享
- ❌ 模板版本化

---

## Dependency

- **依赖**: `ptl-2-server-api`（需要 server 提供稳定的 `/product-templates` API）
- **被依赖**: 无
