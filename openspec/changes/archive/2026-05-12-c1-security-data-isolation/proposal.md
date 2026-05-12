---
name: c1-security-data-isolation
change_class: high
change_profile: high
reason: "后端 API 接口缺失 JWT 鉴权，published 和 nodes 路由允许未登录访问；涉及 Prisma schema cascade delete 和 API contract 变更"
---

## Task Anchor Echo

- **原始任务**: 修复 prism-editor 全部硬伤，分多步走
- **change 名称**: `c1-security-data-isolation`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] 不做安全策略配置 UI，只做后端鉴权和数据隔离
  - [ ] 不改前端业务逻辑，只修 API 层

## Why

当前 `published` 和 `nodes` 的所有路由完全没有 JWT 鉴权，任何人无需登录即可增删改查所有数据。此外 Prisma schema 的 `PublishedWorkflow` 缺少 cascade delete，删 workflow 时 published 记录成为孤儿记录。

## What Changes

1. `published` 路由全量加 `@authenticate` 装饰器，查询/操作强制带上 `userId = currentUser.id`
2. `nodes` 路由全量加 `@authenticate` 装饰器，强制带上 `authorId = currentUser.id`
3. 删除所有默认用户 fallback（`password: 'default'` 等），未登录请求直接 401
4. `versions` 路由（version list / diff / rollback）加鉴权和用户归属检查
5. Prisma schema 的 `PublishedWorkflow` relation 补上 `onDelete: Cascade`
6. `nodes.ts` 的 `manifest: false` bug 修复（改为 `manifest: true` 或不 select 该字段）
7. `scripts/seed.ts` 和 `scripts/migrate.ts` 中的默认密码改为从环境变量读取，不硬编码

## Capabilities

### Modified Capabilities

- **Published Workflow API**: 从公开访问变为必须登录，且用户只能操作自己的 published workflows
- **Node Package API**: 从公开访问变为必须登录，且用户只能操作自己上传的 node packages

## Impact

- `server/prisma/schema.prisma`
- `server/src/routes/published.ts`
- `server/src/routes/nodes.ts`
- `server/src/routes/versions.ts`
- `server/src/middleware/auth.ts`（签名可能需调整以支持当前 user 对象传递）
- `server/src/scripts/seed.ts`（默认密码改环境变量）
- `server/src/scripts/migrate.ts`（默认密码改环境变量）

## Out of Scope

- 安全策略配置 UI（如白名单管理界面）
- Node package 签名验证 UI
- 权限分级（admin vs 普通用户）
- rate limiting（本放在 C4）
- token revocation（本放在 C4）
- `scripts/seed.ts` / `scripts/migrate.ts` 的默认密码改为环境变量（本 task T8）
