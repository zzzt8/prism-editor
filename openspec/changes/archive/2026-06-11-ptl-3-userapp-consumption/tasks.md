# Tasks: ptl-3-userapp-consumption

---

## Task 3.1 — user-app ProductTemplateRepository

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/modules/repositories/productTemplateRepository.ts -->

- [x] 新建 `apps/user-app/src/modules/repositories/productTemplateRepository.ts`
- [x] 实现：

  - `list()` → GET `/product-templates`
  - `get(id)` → GET `/product-templates/:id`
  - `getAllAsProductTemplate()` → 加载所有 PublishedWorkflow，对每个调用 `createProductTemplateFromPublishedWorkflow()` 桥接为 ProductTemplate

```bash
npx tsc --noEmit apps/user-app/src/modules/repositories/productTemplateRepository.ts
```

---

## Task 3.2 — ProductTemplate list store

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/modules/ -->

- [x] ProductTemplateRepository 已包含 `list()` 方法，store 逻辑内聚在 repository 中
- [x] 状态管理通过 repository 层的 Promise/async 模式处理 `isLoading`、`error`

```bash
npx tsc --noEmit apps/user-app/src/modules/
```

---

## Task 3.3 — ProductTemplate 列表页（模板选择器）

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/pages/ -->

- [x] 新建 `apps/user-app/src/pages/ProductTemplateListPage.tsx`
- [x] 支持搜索（name / description）
- [x] 支持筛选（category 或 tag）
- [x] 点击后导航到详情/运行页

```bash
npx tsc --noEmit apps/user-app/src/pages/ProductTemplateListPage.tsx
```

---

## Task 3.4 — ProductTemplate 详情/运行页

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/pages/ -->

- [x] 新建 `apps/user-app/src/pages/ProductTemplateRunPage.tsx`
- [x] 展示 ProductTemplate 元信息（name、description、inputs、designParams、preview.canvas）
- [x] 加载 `preview.flow` 引用的 PublishedWorkflow
- [x] 复用 `PublishedWorkflowExecutor` 执行
- [x] 支持 inputs / designParams 的动态表单填充

```bash
npx tsc --noEmit apps/user-app/src/pages/ProductTemplateRunPage.tsx
```

---

## Task 3.5 — 路由注册

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/ -->

- [x] 在 `apps/user-app/src/App.tsx` 中注册新页面

  - `#/templates/` → ProductTemplateListPage
  - `#/template/:id` → ProductTemplateRunPage

```bash
npx tsc --noEmit apps/user-app/src/
```

---

## Task 3.6 — 端到端验证

<!-- layer: runtime -->
<!-- verify: cd apps/user-app && npx vite build -->

- [x] 启动 user-app，访问 `#/templates/`
- [x] 确认能看到 ProductTemplate 列表
- [x] 点击后能展示详情并运行

```bash
cd apps/user-app && npx vite build
```

---

## Task 3.7 — 文档更新

<!-- layer: docs -->
<!-- verify: git diff docs/product-template-v1.md -->

- [x] 更新 `docs/product-template-v1.md`
- [x] 标记 `ptl-1` / `ptl-2` / `ptl-3` 完成
- [x] 补充 v2 实施后的状态说明

```bash
git diff docs/product-template-v1.md
```
