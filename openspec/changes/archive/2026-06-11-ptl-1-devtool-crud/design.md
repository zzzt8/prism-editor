# Design: ptl-1-devtool-crud

## Goals

- dev-tool 可以独立于 server 创建、编辑、保存 ProductTemplate
- 不改动现有 `canvasStore` 和 `useWorkflowStore`
- 复用现有 IndexedDB 基础设施，不引入新存储依赖

## Non-Goals

- 不依赖 server 端持久化
- 不实现 production flow 执行
- 不实现模板版本化

---

## Decisions

### 1. 独立 `ProductTemplateStore` 而非扩展 `canvasStore`

`canvasStore` 职责已饱和（nodes、edges、groups、viewport、execution）。ProductTemplate 是业务层对象，不属于 canvas 状态。

决策：新增 `ProductTemplateStore`，与 `canvasStore` 并列，通过 `preview.flow` 引用关系协同工作。

### 2. IndexedDB 先行，Repository 接口先行

已有 `IndexedDBStorageAdapter` 封装了 IndexedDB 读写。复用相同的 `openDB` / `wrapRequest` 模式。

决策：新增 `ProductTemplateRepository`，接口与 `WorkflowRepository` / `TemplateRepository` 一致，实现用 IndexedDB。

### 3. UI 采用模态框而非独立页面

dev-tool 已有很多模态框（PublishDialog、VersionHistory 等）。新增一个 ProductTemplateEditor 模态框符合现有交互模式。

决策：使用模态框承载 ProductTemplate 编辑。

### 4. 预览 flow 绑定通过下拉选择已有 Workflow

用户需要把 ProductTemplate 和具体 Workflow 关联起来。

决策：在 ProductTemplateEditor 中提供"绑定 Preview Flow"下拉框，列出当前 IndexedDB 中的所有 Workflow，让用户选择一个作为 `preview.flow`。

---

## Review Checklist

- [ ] `ProductTemplateStore` 是否与 `canvasStore` 职责清晰分离
- [ ] IndexedDB repository 是否复用现有基础设施
- [ ] 编辑模态框是否覆盖了所有 ProductTemplate 字段
- [ ] 绑定 preview.flow 的交互是否直观
- [ ] 保存后 IndexedDB 数据是否正确持久化
