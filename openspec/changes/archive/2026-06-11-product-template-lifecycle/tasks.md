# Tasks: ProductTemplate Lifecycle

---

## Sub-change 1: `ptl-1-devtool-crud`

> dev-tool 本地 CRUD（IndexedDB），不依赖 server

### Layer: `editor`

#### Task 1.1 — 类型导入确认

- [x] 确认 `packages/shared-types/src/product-template.ts` 已导出 `ProductTemplate` 相关类型
- [x] 确认 `packages/shared-types/src/product-template-compat.ts` 已导出 `createProductTemplateFromPublishedWorkflow`

```bash
# 验证
npx tsc --noEmit packages/shared-types/src/index.ts
```

#### Task 1.2 — ProductTemplateRepository（IndexedDB）

- [x] 新建 `apps/dev-tool/src/modules/repositories/productTemplateRepository.ts`
- [x] 实现接口 `IProductTemplateRepository`（CRUD 方法）
- [x] 实现 `save(ProductTemplate)` → IndexedDB
- [x] 实现 `load(id)` → ProductTemplate
- [x] 实现 `list()` → ProductTemplateSummary[]
- [x] 实现 `delete(id)`

```bash
# 验证
npx tsc --noEmit apps/dev-tool/src/modules/repositories/productTemplateRepository.ts
```

#### Task 1.3 — ProductTemplateStore（Zustand）

- [x] 新建 `apps/dev-tool/src/store/productTemplateStore.ts`
- [x] 状态：`currentProductTemplate`、`productTemplateList`、`isDirty`
- [x] 操作：`newProductTemplate()`、`loadProductTemplate(id)`、`updateProductTemplate(patch)`、`saveProductTemplate()`
- [x] `newProductTemplate()` 行为：生成 id、初始化 `name='Untitled Product'`、初始化空 inputs/designParams/assets/preview.canvas/production.output

```bash
# 验证
npx tsc --noEmit apps/dev-tool/src/store/productTemplateStore.ts
```

#### Task 1.4 — ProductTemplate 编辑模态框（UI）

- [x] 新建 `apps/dev-tool/src/components/ProductTemplateEditor/index.tsx`
- [x] 表单字段：`name`、`description`、`inputs`（可添加/删除/配置 ProductTemplateInput）、`designParams`（可添加/删除/配置 DesignParam）、`assets`（可添加/删除/配置 ProductTemplateAsset）
- [x] `preview.canvas` 配置区块（width/height/background/fit/viewport）
- [x] `production.output` 配置区块（format/dpi/size/outputs）
- [x] 保存时调用 `ProductTemplateStore.saveProductTemplate()`

```bash
# 验证
npx tsc --noEmit apps/dev-tool/src/components/ProductTemplateEditor/
```

#### Task 1.5 — ProductTemplate 入口（工具栏或菜单）

- [x] 在 dev-tool Header 或工具栏添加"新建 ProductTemplate"入口
- [x] 点击后弹出 `ProductTemplateEditor` 模态框
- [x] 保存后可以继续在 Workflow 编辑器中编辑（ProductTemplate 和 Workflow 是两个独立对象）

#### Task 1.6 — dev-tool 发布流程扩展（可选在本子 change 先做占位）

- [x] `PublishDialog` 扩展：新增"发布为 ProductTemplate"选项卡
- [x] 选择 ProductTemplate → 选择绑定哪个 Workflow 作为 preview.flow
- [x] 验证绑定完整性（inputs / designParams 都已绑定）
- [x] 占位发布逻辑（先不做 server 持久化，只在 IndexedDB 记录发布状态）

---

## Sub-change 2: `ptl-2-server-api`

> server Prisma 模型 + REST API（依赖子 change 1 稳定后的类型契约）

### Layer: `backend`

#### Task 2.1 — Prisma schema 新增模型

<!-- layer: backend -->
<!-- verify: cd server && npx prisma validate -->

- [x] 编辑 `server/prisma/schema.prisma`，新增 `ProductTemplate` 模型：

  ```prisma
  model ProductTemplate {
    id          String   @id @default(cuid())
    name        String
    description String?
    version     String   @default("1.0.0")
    content     String   // 完整的 ProductTemplate JSON
    userId      String
    publishedId String?  // optional: FK to PublishedWorkflow
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    user        User    @relation(fields: [userId], references: [id])
    published   PublishedWorkflow? @relation(fields: [publishedId], references: [id])
  }
  ```

- [x] 验证 schema 语法

```bash
cd server && npx prisma validate
```

#### Task 2.2 — Prisma Migrate

<!-- layer: backend -->
<!-- verify: cd server && npx prisma migrate dev --name add_product_template --skip-seed -->

- [x] `prisma migrate dev --name add_product_template --skip-seed`

```bash
cd server && npx prisma migrate dev --name add_product_template --skip-seed
```

#### Task 2.3 — ProductTemplate API 路由

<!-- layer: backend -->
<!-- verify: cd server && npm run build -->

- [x] 新建 `server/src/routes/product-template.ts`
- [x] 实现：

  - `GET /product-templates` — 列表（public read，带分页）
  - `GET /product-templates/:id` — 详情（public read）
  - `POST /product-templates` — 创建（auth required）
  - `PATCH /product-templates/:id` — 更新（auth required，验证 userId 匹配）
  - `DELETE /product-templates/:id` — 删除（auth required，验证 userId 匹配）
  - `POST /product-templates/:id/publish` — 绑定到 PublishedWorkflow（auth required）

- [x] 注册路由到 `server/src/app.ts`

```bash
cd server && npm run build
```

#### Task 2.4 — ProductTemplateRepository server-first 改造

<!-- layer: editor -->
<!-- verify: npx tsc --noEmit apps/dev-tool/src/modules/repositories/productTemplateRepository.ts -->

- [x] 改造 `apps/dev-tool/src/modules/repositories/productTemplateRepository.ts`
- [x] 优先调用 server API（`/product-templates`）
- [x] 失败时 fallback 到 IndexedDB

```bash
npx tsc --noEmit apps/dev-tool/src/modules/repositories/productTemplateRepository.ts
```

#### Task 2.5 — 端到端验证

<!-- layer: editor -->
<!-- verify: cd apps/dev-tool && npx vite build -->

- [x] dev-tool 登录后创建 ProductTemplate，刷新页面后从 server 加载
- [x] 确认 server 数据库有对应记录

```bash
cd apps/dev-tool && npx vite build
```

---

## Sub-change 3: `ptl-3-userapp-consumption`

> user-app 展示与运行 ProductTemplate（依赖子 change 2 稳定 API）

### Layer: `runtime`

#### Task 3.1 — user-app ProductTemplateRepository

- [x] 新建 `apps/user-app/src/modules/repositories/productTemplateRepository.ts`
- [x] 实现 `list()`、`get(id)`（从 `/product-templates` API 加载）
- [x] 调用 `createProductTemplateFromPublishedWorkflow()` 将已有 PublishedWorkflow 展示为 ProductTemplate

```bash
# 验证
npx tsc --noEmit apps/user-app/src/modules/repositories/productTemplateRepository.ts
```

#### Task 3.2 — ProductTemplate 列表页

- [x] user-app 新增 `ProductTemplateListPage`（模板商店）
- [x] 支持分类筛选（通过 `category` 字段或 tag）
- [x] 支持搜索（name / description）
- [x] 点击进入详情/运行页

#### Task 3.3 — ProductTemplate 详情/运行页

- [x] user-app 新增 `ProductTemplateRunPage`
- [x] 展示 template 元信息（inputs、designParams、preview.canvas）
- [x] 读取并展示 `preview.flow` 引用的 `PublishedWorkflow`
- [x] 复用现有 `PublishedWorkflowExecutor` 运行
- [x] 支持 `inputs` / `designParams` 的动态表单填充

```bash
# 验证
cd apps/user-app && npx vite build
```

#### Task 3.4 — 文档更新

- [x] 更新 `docs/product-template-v1.md`，补充 v2 实施状态
- [x] 标记 v1 Non-Goals 中"dev-tool UI"、"server Prisma schema"、"user-app" 已完成
- [x] 补充 `ptl-3` 后的状态说明

```bash
# 验证
git diff docs/product-template-v1.md
```
