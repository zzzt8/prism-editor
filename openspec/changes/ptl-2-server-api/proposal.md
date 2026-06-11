# Proposal: ptl-2-server-api

**change_class**: `high`

**reason**: 触及 `server` Prisma schema、REST API 路由、`dev-tool` 的 server-first 持久化改造，横跨 `backend` 和 `editor` 两个 layer。

---

## Why

`ptl-1-devtool-crud` 在 IndexedDB 中建立了 ProductTemplate 的本地生命周期。但产品最终需要 server 端持久化和多端共享。本子 change 在 server 侧建立 ProductTemplate 的 Prisma 模型和 REST API。

---

## What Changes

- Prisma schema 新增 `ProductTemplate` 模型
- Prisma migrate 生成数据库迁移
- server 新增 `/product-templates` CRUD API 路由
- dev-tool `ProductTemplateRepository` 改造为 server-first（IndexedDB 降为 fallback）

---

## Capabilities

- server 存储 ProductTemplate（持久化）
- dev-tool 登录后可将 ProductTemplate 保存到 server
- dev-tool 可以从 server 加载 ProductTemplate 列表
- 可将 ProductTemplate 绑定到已发布的 PublishedWorkflow
- 所有写操作需认证（JWT）

---

## Impact

| Layer | 路径 | 影响 |
|-------|------|------|
| `shared-types` | — | 无变更 |
| `server` | `server/prisma/`, `server/src/routes/` | 新增 Prisma 模型 + API 路由 |
| `editor` | `apps/dev-tool/src/` | repository 改为 server-first |
| `runtime` | — | 无变更 |
| `docs` | — | 无变更 |

---

## Out of Scope

- ❌ user-app 消费（属于 `ptl-3-userapp-consumption`）
- ❌ production flow 执行
- ❌ 模板版本化

---

## Dependency

- **依赖**: `ptl-1-devtool-crud`（需要稳定的产品类型定义和 ProductTemplate 结构）
- **被依赖**: `ptl-3-userapp-consumption`
