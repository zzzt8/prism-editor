# Tasks: ptl-1-devtool-crud

---

## Task 1.1 — 类型导入确认

<!-- layer: shared-types -->
<!-- verify: npx tsc --noEmit packages/shared-types/src/index.ts -->

- [ ] 确认 `packages/shared-types/src/product-template.ts` 已导出所有 ProductTemplate 相关类型
- [ ] 确认 `packages/shared-types/src/product-template-compat.ts` 已导出 `createProductTemplateFromPublishedWorkflow`

```bash
npx tsc --noEmit packages/shared-types/src/index.ts
```

---

## Task 1.2 — IProductTemplateRepository 接口

<!-- layer: editor -->
<!-- verify: npx tsc --noEmit apps/dev-tool/src/modules/repositories/interfaces.ts -->

- [ ] 在 `apps/dev-tool/src/modules/repositories/interfaces.ts` 新增 `IProductTemplateRepository` 接口

```typescript
export interface IProductTemplateRepository {
  list(): Promise<ProductTemplateSummary[]>;
  get(id: string): Promise<ProductTemplate>;
  save(template: ProductTemplate): Promise<void>;
  delete(id: string): Promise<void>;
}
```

```bash
npx tsc --noEmit apps/dev-tool/src/modules/repositories/interfaces.ts
```

---

## Task 1.3 — ProductTemplateRepository 实现（IndexedDB）

<!-- layer: editor -->
<!-- verify: npx tsc --noEmit apps/dev-tool/src/modules/repositories/productTemplateRepository.ts -->

- [ ] 新建 `apps/dev-tool/src/modules/repositories/productTemplateRepository.ts`
- [ ] 复用 `IndexedDBStorageAdapter` 的 `openDB` / `wrapRequest` 基础设施
- [ ] 实现 `list()` → 扫描所有 ProductTemplate，返回摘要列表
- [ ] 实现 `get(id)` → 读取完整 ProductTemplate JSON
- [ ] 实现 `save(template)` → 序列化后存入 IndexedDB
- [ ] 实现 `delete(id)` → 删除对应记录

```bash
npx tsc --noEmit apps/dev-tool/src/modules/repositories/productTemplateRepository.ts
```

---

## Task 1.4 — ProductTemplateStore（Zustand）

<!-- layer: editor -->
<!-- verify: npx tsc --noEmit apps/dev-tool/src/store/productTemplateStore.ts -->

- [ ] 新建 `apps/dev-tool/src/store/productTemplateStore.ts`
- [ ] 状态字段：

  ```typescript
  currentProductTemplate: ProductTemplate | null
  productTemplateList: ProductTemplateSummary[]
  isDirty: boolean
  isLoading: boolean
  ```

- [ ] 操作：

  - `newProductTemplate()` — 创建空白 ProductTemplate，设置 id、name='Untitled Product'、version='1.0.0'、空 inputs/DesignParams/Assets、默认 preview.canvas / production.output
  - `loadProductTemplate(id)` — 调用 repository.get() 加载
  - `updateProductTemplate(patch)` — 浅合并 patch 到 currentProductTemplate
  - `saveProductTemplate()` — 调用 repository.save()，成功后将 isDirty=false
  - `deleteProductTemplate(id)` — 调用 repository.delete()，成功后刷新列表

```bash
npx tsc --noEmit apps/dev-tool/src/store/productTemplateStore.ts
```

---

## Task 1.5 — ProductTemplate 编辑模态框（UI）

<!-- layer: editor -->
<!-- verify: npx tsc --noEmit apps/dev-tool/src/components/ProductTemplateEditor/ -->

- [ ] 新建 `apps/dev-tool/src/components/ProductTemplateEditor/index.tsx`
- [ ] 模态框结构（分 Tab）：

  - **基础信息 Tab**: `name`（文本框）、`description`（文本框）
  - **Inputs Tab**: 列表展示 `inputs`，可添加/删除/编辑 ProductTemplateInput（id、name、type、label、required）
  - **Design Params Tab**: 列表展示 `designParams`，可添加/删除/编辑 DesignParam（id、name、type、label、defaultValue、options）
  - **Assets Tab**: 列表展示 `assets`，可添加/删除/编辑 ProductTemplateAsset（id、name、type、description）
  - **Preview Canvas Tab**: `width`、`height`（数字）、`background`（颜色选择）、`fit`（select: contain/cover/stretch）、`viewport`（x、y、zoom）
  - **Production Output Tab**: `format`（select: png/jpeg/webp/pdf/svg）、`dpi`（数字）、`size.width`、`size.height`、`outputs` 列表

- [ ] 保存按钮调用 `ProductTemplateStore.saveProductTemplate()`
- [ ] 关闭按钮放弃更改（如果 isDirty，弹出确认）

```bash
npx tsc --noEmit apps/dev-tool/src/components/ProductTemplateEditor/
```

---

## Task 1.6 — 工具栏入口

<!-- layer: editor -->
<!-- verify: npx tsc --noEmit apps/dev-tool/src/components/ -->

- [ ] 在 dev-tool Header 或工具栏添加"新建 ProductTemplate"按钮（图标用 `FilePlus` 或类似）
- [ ] 点击后弹出 `ProductTemplateEditor` 模态框
- [ ] 保存后可以在编辑器中继续操作（ProductTemplate 和 Workflow 是独立对象）

```bash
npx tsc --noEmit apps/dev-tool/src/components/
```

---

## Task 1.7 — 绑定 Preview Flow（关联 Workflow）

<!-- layer: editor -->
<!-- verify: npx tsc --noEmit apps/dev-tool/src/components/ProductTemplateEditor/ -->

- [ ] 在 ProductTemplateEditor 的基础信息或 Preview Canvas Tab 增加"绑定 Workflow"下拉框
- [ ] 加载 IndexedDB 中的所有 Workflow 列表供选择
- [ ] 选择后设置 `currentProductTemplate.preview.flow.workflowId`
- [ ] 允许清除绑定（设为 undefined）

```bash
npx tsc --noEmit apps/dev-tool/src/components/ProductTemplateEditor/
```

---

## Task 1.8 — 发布流程占位（可选，本子 change 做完可做）

<!-- layer: editor -->
<!-- verify: npx tsc --noEmit apps/dev-tool/src/components/ -->

- [ ] 在 `PublishDialog` 中增加"发布为 ProductTemplate"入口（如果当前已有正在编辑的 ProductTemplate）
- [ ] 发布时验证 inputs / designParams 都已配置
- [ ] 在 IndexedDB 中记录发布状态（published=true, publishedAt=now）

```bash
npx tsc --noEmit apps/dev-tool/src/components/PublishDialog.tsx
```
