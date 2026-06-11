## 准备工作

- [x] **PRUNE-0: 备份分支**

  ```bash
  git checkout -b feature/prune-excess-features
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-0
    layer: meta
    verify: git branch --show-current | findstr "prune-excess-features"
  ```

---

## Phase 1: 死代码扫描与确认（探索性验证）

- [ ] **PRUNE-1: 扫描所有 orphan imports**

  确认所有被删文件在删除前无任何 living import。

  ```bash
  # 在 apps/dev-tool 目录
  rg "VersionHistory|TemplateCenter|TemplateManager|SKU|PRODUCT_TEMPLATE|NodePackageManager|appStore|workflowStore|indexedDbUserAppStorage" \
    --type tsx --type ts --type tsx \
    -l . \
    | grep -v node_modules \
    | grep -v __snapshots__
  ```

  预期：无输出（所有 dead reference 已清理）

  ```yaml
  opsx-meta:
    id: PRUNE-1
    layer: verify
    verify: |
      rg "VersionHistory|TemplateCenter|TemplateManager|SKU|PRODUCT_TEMPLATE|NodePackageManager|appStore|workflowStore|indexedDbUserAppStorage" \
        --type tsx --type ts \
        -l apps/dev-tool/src server/src packages \
      # 期望：无输出
  ```

---

## Phase 2: 前端删除（apps/dev-tool）

### 2.1 SKU 系统全删

- [ ] **PRUNE-2: 删除 SKU 组件目录**

  ```bash
  # 确认无人 import
  rg "from.*SKU|SkuStore|SkuPanel|SkuRender" --type tsx --type ts -l apps/dev-tool/src
  # 预期：无输出
  rm -rf apps/dev-tool/src/components/SKU*
  rm -rf apps/dev-tool/src/components/SkuPanel*
  rm -rf apps/dev-tool/src/components/SkuRender*
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-2
    layer: frontend
    verify: |
      test ! -d apps/dev-tool/src/components/SKU &&
      rg "SkuStore|SkuPanel|SkuRender" --type tsx --type ts -l apps/dev-tool/src | test -z
  ```

- [ ] **PRUNE-3: 删除 SKU store**

  ```bash
  rm -f apps/dev-tool/src/store/skuStore.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-3
    layer: frontend
    verify: test ! -f apps/dev-tool/src/store/skuStore.ts
  ```

### 2.2 ProductTemplate 系统全删

- [ ] **PRUNE-4: 删除 ProductTemplate 组件目录**

  ```bash
  rm -rf apps/dev-tool/src/components/ProductTemplate*
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-4
    layer: frontend
    verify: test ! -d apps/dev-tool/src/components/ProductTemplate
  ```

- [ ] **PRUNE-5: 删除 ProductTemplate store 和 repository**

  ```bash
  rm -f apps/dev-tool/src/store/productTemplateStore.ts
  rm -f apps/dev-tool/src/modules/repositories/productTemplateRepository.ts
  rm -f apps/dev-tool/src/storage/ProductTemplateApiAdapter.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-5
    layer: frontend
    verify: |
      test ! -f apps/dev-tool/src/store/productTemplateStore.ts &&
      test ! -f apps/dev-tool/src/modules/repositories/productTemplateRepository.ts
  ```

### 2.3 TemplateCenter / TemplateManager 全删

- [ ] **PRUNE-6: 删除 TemplateCenter 组件目录**

  ```bash
  rm -rf apps/dev-tool/src/components/TemplateCenter
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-6
    layer: frontend
    verify: test ! -d apps/dev-tool/src/components/TemplateCenter
  ```

- [ ] **PRUNE-7: 删除 TemplateManager 组件目录**

  ```bash
  rm -rf apps/dev-tool/src/components/TemplateManager
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-7
    layer: frontend
    verify: test ! -d apps/dev-tool/src/components/TemplateManager
  ```

- [ ] **PRUNE-8: 删除 templateStore 和 templateRepository**

  ```bash
  rm -f apps/dev-tool/src/store/templateStore.ts
  rm -f apps/dev-tool/src/modules/repositories/templateRepository.ts
  rm -f apps/dev-tool/src/modules/repositories/templateVersionRepository.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-8
    layer: frontend
    verify: |
      test ! -f apps/dev-tool/src/store/templateStore.ts &&
      test ! -f apps/dev-tool/src/modules/repositories/templateRepository.ts
  ```

### 2.4 Version History UI 全删

- [ ] **PRUNE-9: 删除 VersionHistory 组件目录**

  ```bash
  rm -rf apps/dev-tool/src/components/VersionHistory
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-9
    layer: frontend
    verify: test ! -d apps/dev-tool/src/components/VersionHistory
  ```

### 2.5 独立 NodePackageManager 全删

- [ ] **PRUNE-10: 删除独立 NodePackageManager 目录**

  ```bash
  rm -rf apps/dev-tool/src/components/NodePackageManager
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-10
    layer: frontend
    verify: test ! -d apps/dev-tool/src/components/NodePackageManager
  ```

### 2.6 死 stores 全删

- [ ] **PRUNE-11: 删除 appStore**

  ```bash
  rm -f apps/dev-tool/src/store/appStore.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-11
    layer: frontend
    verify: test ! -f apps/dev-tool/src/store/appStore.ts
  ```

- [ ] **PRUNE-12: 删除 workflowStore**

  ```bash
  rm -f apps/dev-tool/src/store/workflowStore.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-12
    layer: frontend
    verify: test ! -f apps/dev-tool/src/store/workflowStore.ts
  ```

### 2.7 孤立组件和 utility 全删

- [ ] **PRUNE-13: 删除 ParamsSection**

  ```bash
  rm -f apps/dev-tool/src/components/params/ParamsSection.tsx
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-13
    layer: frontend
    verify: test ! -f apps/dev-tool/src/components/params/ParamsSection.tsx
  ```

- [ ] **PRUNE-14: 删除 indexedDbUserAppStorage adapter**

  ```bash
  rm -f apps/dev-tool/src/storage/indexedDbUserAppStorage.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-14
    layer: frontend
    verify: test ! -f apps/dev-tool/src/storage/indexedDbUserAppStorage.ts
  ```

- [ ] **PRUNE-15: 清理 WorkflowsView 中的 Grid 死按钮状态**

  移除 `viewMode` 状态和相关死 UI。

  ```yaml
  opsx-meta:
    id: PRUNE-15
    layer: frontend
    verify: rg "viewMode.*=.*'grid'" apps/dev-tool/src/components/WorkflowsView.tsx | test -z
  ```

### 2.8 清理 App.tsx 路由

- [ ] **PRUNE-16: 审查 App.tsx 路由**

  确认无任何指向被删组件的路由。

  ```yaml
  opsx-meta:
    id: PRUNE-16
    layer: frontend
    verify: rg "VersionHistory|TemplateCenter|TemplateManager|SKU|ProductTemplate" apps/dev-tool/src/App.tsx | test -z
  ```

---

## Phase 3: 服务端删除（server/src）

### 3.1 SKU 系统全删

- [ ] **PRUNE-17: 删除 SKU routes**

  ```bash
  rm -f server/src/routes/skus.ts
  rm -f server/src/routes/sku.ts
  rm -f server/src/routes/sku-render.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-17
    layer: backend
    verify: |
      test ! -f server/src/routes/skus.ts &&
      test ! -f server/src/routes/sku.ts &&
      test ! -f server/src/routes/sku-render.ts
  ```

- [ ] **PRUNE-18: 删除 SKU schemas**

  ```bash
  rm -f server/src/schemas/sku.ts
  rm -f server/src/schemas/sku-render.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-18
    layer: backend
    verify: |
      test ! -f server/src/schemas/sku.ts &&
      test ! -f server/src/schemas/sku-render.ts
  ```

- [ ] **PRUNE-19: 删除 SKU test files**

  ```bash
  rm -f server/src/routes/skus.test.ts
  rm -f server/src/routes/sku.test.ts
  rm -f server/src/routes/sku-render.test.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-19
    layer: backend
    verify: test ! -f server/src/routes/skus.test.ts
  ```

### 3.2 ProductTemplate 全删

- [ ] **PRUNE-20: 删除 product-template route 和 schema**

  ```bash
  rm -f server/src/routes/product-template.ts
  rm -f server/src/schemas/product-template.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-20
    layer: backend
    verify: test ! -f server/src/routes/product-template.ts
  ```

### 3.3 NodePackage / OSS 全删

- [ ] **PRUNE-21: 删除 nodes route 和 schema**

  ```bash
  rm -f server/src/routes/nodes.ts
  rm -f server/src/routes/nodes.test.ts
  rm -f server/src/schemas/node-package.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-21
    layer: backend
    verify: |
      test ! -f server/src/routes/nodes.ts &&
      test ! -f server/src/routes/nodes.test.ts
  ```

- [ ] **PRUNE-22: 删除 OSS service**

  ```bash
  rm -f server/src/services/oss.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-22
    layer: backend
    verify: test ! -f server/src/services/oss.ts
  ```

### 3.4 Version History API 全删

- [ ] **PRUNE-23: 删除 versions route**

  ```bash
  rm -f server/src/routes/versions.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-23
    layer: backend
    verify: test ! -f server/src/routes/versions.ts
  ```

### 3.5 render/composite 全删

- [ ] **PRUNE-24: 删除 render route**

  ```bash
  rm -f server/src/routes/render.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-24
    layer: backend
    verify: test ! -f server/src/routes/render.ts
  ```

### 3.6 迁移脚本清理

- [ ] **PRUNE-25: 删除迁移脚本**

  ```bash
  rm -f server/src/scripts/migrate.ts
  rm -f server/src/scripts/migrate-versions.ts
  rm -f server/src/scripts/migrate-published-v2.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-25
    layer: backend
    verify: test ! -f server/src/scripts/migrate.ts
  ```

### 3.7 app.ts cleanup

- [ ] **PRUNE-26: 审查 app.ts 路由注册**

  确认所有被删 routes 从 registerRoutes 中移除。

  ```yaml
  opsx-meta:
    id: PRUNE-26
    layer: backend
    verify: |
      rg "skus|sku-render|nodes|versions|render\.ts|product-template" server/src/app.ts | test -z
  ```

---

## Phase 4: 共享包清理

- [ ] **PRUNE-27: 删除 snippet types**

  ```bash
  rm -f packages/shared-types/src/snippet*
  rm -f packages/shared-types/src/storage/indexedDbUserAppStorage.ts
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-27
    layer: shared
    verify: |
      test ! -f packages/shared-types/src/snippet.ts &&
      test ! -f packages/shared-types/src/storage/indexedDbUserAppStorage.ts
  ```

- [ ] **PRUNE-28: 清理 shared-types index.ts**

  确认导出中无 snippet 相关内容。

  ```yaml
  opsx-meta:
    id: PRUNE-28
    layer: shared
    verify: rg "snippet" packages/shared-types/src/index.ts | test -z
  ```

---

## Phase 5: user-app 同步审查

- [ ] **PRUNE-29: 扫描 user-app 对被删 API 的依赖**

  ```bash
  rg "skus|sku-render|nodes|versions|product-template" apps/user-app/src --type ts --type tsx -l
  ```

  如有结果，对应删除或替换。

  ```yaml
  opsx-meta:
    id: PRUNE-29
    layer: user-app
    verify: |
      rg "skus|sku-render|nodes|versions|product-template" apps/user-app/src --type ts --type tsx -l \
        # 期望：无输出，或仅有明确的已知消费者
  ```

---

## Phase 6: 构建验证

- [ ] **PRUNE-30: typecheck**

  ```bash
  pnpm typecheck
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-30
    layer: verify
    verify: pnpm typecheck
  ```

- [ ] **PRUNE-31: build**

  ```bash
  pnpm build
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-31
    layer: verify
    verify: pnpm build
  ```

- [ ] **PRUNE-32: lint**

  ```bash
  pnpm lint
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-32
    layer: verify
    verify: pnpm lint
  ```

- [ ] **PRUNE-33: test**

  ```bash
  pnpm test
  ```

  ```yaml
  opsx-meta:
    id: PRUNE-33
    layer: verify
    verify: pnpm test
  ```

- [ ] **PRUNE-34: Prisma generate**

  ```bash
  cd server && npx prisma generate
  ```

  验证 Prisma Client 不再包含被删模型的 query 方法。

  ```yaml
  opsx-meta:
    id: PRUNE-34
    layer: verify
    verify: cd server && npx prisma generate
  ```

---

## Phase 7: 代码行数统计（对比）

- [ ] **PRUNE-35: 统计删除行数**

  ```bash
  # 统计前（before，使用 git diff --stat base-branch..HEAD）
  # 统计后，手动记录
  echo "=== Deleted lines summary ==="
  ```

  记录以下文件/目录的删除行数：
  - 前端组件删除量
  - 服务端 routes/schema 删除量
  - 共享包删除量

  ```yaml
  opsx-meta:
    id: PRUNE-35
    layer: meta
    verify: manual
  ```
