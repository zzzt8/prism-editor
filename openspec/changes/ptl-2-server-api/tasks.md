# Tasks: ptl-2-server-api

---

## Task 2.1 — Prisma schema 新增模型

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

---

## Task 2.2 — Prisma Migrate

<!-- layer: backend -->
<!-- verify: cd server && npx prisma migrate dev --name add_product_template --skip-seed -->

- [x] `prisma migrate dev --name add_product_template --skip-seed`

```bash
cd server && npx prisma migrate dev --name add_product_template --skip-seed
```

---

## Task 2.3 — ProductTemplate API 路由

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

---

## Task 2.4 — ProductTemplateRepository server-first 改造

<!-- layer: editor -->
<!-- verify: npx tsc --noEmit apps/dev-tool/src/modules/repositories/productTemplateRepository.ts -->

- [ ] 改造 `apps/dev-tool/src/modules/repositories/productTemplateRepository.ts`
- [ ] 优先调用 server API（`/product-templates`）
- [ ] 失败时 fallback 到 IndexedDB

```bash
npx tsc --noEmit apps/dev-tool/src/modules/repositories/productTemplateRepository.ts
```

---

## Task 2.5 — 端到端验证

<!-- layer: editor -->
<!-- verify: cd apps/dev-tool && npx vite build -->

- [ ] dev-tool 登录后创建 ProductTemplate，刷新页面后从 server 加载
- [ ] 确认 server 数据库有对应记录

```bash
cd apps/dev-tool && npx vite build
```
