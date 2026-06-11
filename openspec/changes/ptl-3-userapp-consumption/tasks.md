# Tasks: ptl-3-userapp-consumption

---

## Task 3.1 — user-app ProductTemplateRepository

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/modules/repositories/productTemplateRepository.ts -->

- [ ] 新建 `apps/user-app/src/modules/repositories/productTemplateRepository.ts`
- [ ] 实现：

  - `list()` → GET `/product-templates`
  - `get(id)` → GET `/product-templates/:id`
  - `getAllAsProductTemplate()` → 加载所有 PublishedWorkflow，对每个调用 `createProductTemplateFromPublishedWorkflow()` 桥接为 ProductTemplate

```bash
npx tsc --noEmit apps/user-app/src/modules/repositories/productTemplateRepository.ts
```

---

## Task 3.2 — ProductTemplate list store

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/modules/selection/ -->

- [ ] 新建 `apps/user-app/src/modules/selection/productTemplateStore.ts`（Zustand）
- [ ] 状态：`productTemplates: ProductTemplate[]`、`isLoading`、`error`
- [ ] 操作：`loadProductTemplates()`、`selectProductTemplate(id)`

```bash
npx tsc --noEmit apps/user-app/src/modules/selection/productTemplateStore.ts
```

---

## Task 3.3 — ProductTemplate 列表页（模板选择器）

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/pages/ -->

- [ ] 新建 `apps/user-app/src/pages/ProductTemplateListPage.tsx`
- [ ] 支持搜索（name / description）
- [ ] 支持筛选（category 或 tag）
- [ ] 点击后导航到详情/运行页

```bash
npx tsc --noEmit apps/user-app/src/pages/ProductTemplateListPage.tsx
```

---

## Task 3.4 — ProductTemplate 详情/运行页

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/pages/ -->

- [ ] 新建 `apps/user-app/src/pages/ProductTemplateRunPage.tsx`
- [ ] 展示 ProductTemplate 元信息（name、description、inputs、designParams、preview.canvas）
- [ ] 加载 `preview.flow` 引用的 PublishedWorkflow
- [ ] 复用 `PublishedWorkflowExecutor` 执行
- [ ] 支持 inputs / designParams 的动态表单填充

```bash
npx tsc --noEmit apps/user-app/src/pages/ProductTemplateRunPage.tsx
```

---

## Task 3.5 — 路由注册

<!-- layer: runtime -->
<!-- verify: npx tsc --noEmit apps/user-app/src/ -->

- [ ] 在 `apps/user-app/src/App.tsx` 或路由配置中注册新页面

  - `/product-templates` → ProductTemplateListPage
  - `/product-templates/:id` → ProductTemplateRunPage

```bash
npx tsc --noEmit apps/user-app/src/
```

---

## Task 3.6 — 端到端验证

<!-- layer: runtime -->
<!-- verify: cd apps/user-app && npx vite build -->

- [ ] 启动 user-app，访问 `/product-templates`
- [ ] 确认能看到 ProductTemplate 列表
- [ ] 点击后能展示详情并运行

```bash
cd apps/user-app && npx vite build
```

---

## Task 3.7 — 文档更新

<!-- layer: docs -->
<!-- verify: git diff docs/product-template-v1.md -->

- [ ] 更新 `docs/product-template-v1.md`
- [ ] 标记 `ptl-1` / `ptl-2` / `ptl-3` 完成
- [ ] 补充 v2 实施后的状态说明

```bash
git diff docs/product-template-v1.md
```
