# Design: ptl-3-userapp-consumption

## Goals

- user-app 可以从 ProductTemplate 列表选择并运行
- 不改变现有 PublishedWorkflow 的运行逻辑
- 通过桥接函数复用已有 PublishedWorkflow 数据

## Non-Goals

- 不实现 production flow 执行
- 不实现模板 marketplace / 分享

---

## Decisions

### 1. 在现有 user-app 页面体系中新增路由

参照现有 `WorkflowCatalogStore` / `WorkflowRunPage` 的模式，新增：

- `GET /product-templates` 加载列表
- `GET /product-templates/:id` 加载详情
- ProductTemplate 详情页内部使用 `createProductTemplateFromPublishedWorkflow` 桥接到现有 `PublishedWorkflowExecutor`

### 2. 复用 PublishedWorkflowExecutor

ProductTemplate 的 `preview.flow` 引用了 `PublishedWorkflow`。运行时只需要取 `publishedWorkflowId`，交给现有的 executor 执行。

### 3. 模板列表默认展示已有 PublishedWorkflow（桥接）

user-app 加载时，对每个已加载的 PublishedWorkflow 调用 `createProductTemplateFromPublishedWorkflow`，在列表页展示为 ProductTemplate。无需等待用户显式创建 ProductTemplate。

---

## Review Checklist

- [ ] user-app 是否能加载和展示 ProductTemplate 列表
- [ ] 是否复用了现有 executor 而不引入新的执行路径
- [ ] 桥接函数是否正确映射了 PublishedWorkflow → ProductTemplate
- [ ] 文档是否同步更新
