# Proposal: ptl-1-devtool-crud

**change_class**: `high`

**reason**: 触及 `dev-tool` store 架构、repository 接口与 UI 组件层，新增 ProductTemplate 独立编辑体验，不依赖 server。

---

## Why

`ProductTemplate` 当前只在 `shared-types` 有类型定义和兼容桥接函数。dev-tool 里没有入口创建/编辑/保存 ProductTemplate，只能通过 `createProductTemplateFromPublishedWorkflow()` 把已有 PublishedWorkflow 包装查看，无法独立管理。

本子 change 在 dev-tool 侧补齐 ProductTemplate 的完整本地生命周期，不依赖 server，为后续子 change 打好对象基础。

---

## What Changes

- 新增 `ProductTemplateRepository`（IndexedDB 持久化）
- 新增 `ProductTemplateStore`（Zustand 状态管理）
- 新增 `ProductTemplateEditor` 模态框（UI 编辑表单）
- 新增 dev-tool 工具栏入口
- 占位发布扩展（绑定 ProductTemplate 到已有 Workflow/PublishedWorkflow）

---

## Capabilities

- 用户可在 dev-tool 创建空白 ProductTemplate
- 用户可编辑 ProductTemplate 的元信息（name、description）
- 用户可配置 inputs / designParams / assets
- 用户可配置 preview.canvas（width、height、background、fit、viewport）
- 用户可配置 production.output（format、dpi、size、outputs）
- 用户可保存 ProductTemplate 到 IndexedDB
- ProductTemplate 可绑定一个已有 Workflow 作为 preview.flow
- dev-tool 发布流程可选择发布为 ProductTemplate（占位）

---

## Impact

| Layer | 路径 | 影响 |
|-------|------|------|
| `shared-types` | `packages/shared-types/src/` | 确认 product-template.ts 已完整，无新增 |
| `editor` | `apps/dev-tool/src/` | 新增 repository、store、UI 组件 |
| `server` | — | 无变更 |
| `runtime` | — | 无变更 |
| `docs` | — | 无变更 |

---

## Out of Scope

- ❌ server 持久化（属于 `ptl-2-server-api`）
- ❌ user-app 消费（属于 `ptl-3-userapp-consumption`）
- ❌ production flow 执行
- ❌ 模板版本化

---

## Dependency

- **依赖**: 无（第一个子 change）
- **被依赖**: `ptl-2-server-api`、`ptl-3-userapp-consumption`
