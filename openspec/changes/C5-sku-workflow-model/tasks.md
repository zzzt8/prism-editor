# tasks: sku-workflow-model

---

- [x] **Task 1: shared-types 新增 `sku.ts` 类型定义**

  ```yaml
  opsx-meta:
    id: task-1
    layer: pkg.shared-types
    verify: |
      npm run typecheck --workspace=@prism/shared-types
  ```

  - 创建 `packages/shared-types/src/sku.ts`
  - 定义 `SKU`、`SKUInputSchema`、`SKUInputField`、`SKUOutputSpec` 接口
  - `SKUInputField.type` 包含：`'string' | 'number' | 'select' | 'color' | 'boolean' | 'image'`
  - `image` 类型字段包含约束：`accept`、`maxSizeMB`、`aspectRatio`、`minWidth`、`minHeight`、`multiple`
  - 定义 assetId 引用语义（`string` 类型字段作为 assetId，不做实现，只在类型注释说明解析规则）
  - 在 `packages/shared-types/src/index.ts` 导出
  - 验收：`npm run typecheck --workspace=@prism/shared-types`

---

- [x] **Task 2: Prisma schema 新增 SKU model**

  ```yaml
  opsx-meta:
    id: task-2
    layer: app.server
    verify: |
      cd server; npx prisma generate
  ```

  - 在 `server/prisma/schema.prisma` 新增 `SKU` model
  - 新增 `SKUWorkflow` 连接表（SKU N:M Workflow）
  - `Workflow` model 新增 `skuId?` 字段（可选关联）
  - 验收：`cd server; npx prisma generate`

---

- [x] **Task 3: Prisma migration 生成**

  ```yaml
  opsx-meta:
    id: task-3
    layer: app.server
    verify: |
      Test-Path "server/prisma/migrations"
  ```

  - 运行 `cd server; npx prisma migrate dev --name add_sku_model`
  - 验收：`Test-Path "server/prisma/migrations"`

---

- [x] **Task 4: server 新增 SKU CRUD 路由**

  ```yaml
  opsx-meta:
    id: task-4
    layer: app.server
    verify: |
      npm run typecheck --workspace=@prism/server
  ```

  - 创建 `server/src/routes/sku.ts`
  - 实现 POST/GET/PUT/DELETE /api/skus
  - 实现 POST/DELETE /api/skus/:id/workflows（workflow 关联）
  - 验收：`npm run typecheck --workspace=@prism/server`

---

- [x] **Task 5: SKU 路由单元测试**

  ```yaml
  opsx-meta:
    id: task-5
    layer: app.server
    verify: |
      npm run test --workspace=@prism/server -- --run --testPathPattern=sku
  ```

  - 验收：`npm run test --workspace=@prism/server -- --run --testPathPattern=sku`

---

- [ ] **Task 6: 完整 typecheck**

  ```yaml
  opsx-meta:
    id: task-6
    layer: pkg.shared-types
    verify: |
      npm run typecheck --workspace=@prism/shared-types && npm run typecheck --workspace=@prism/server
  ```

  - 验收：`npm run typecheck --workspace=@prism/shared-types && npm run typecheck --workspace=@prism/server`
