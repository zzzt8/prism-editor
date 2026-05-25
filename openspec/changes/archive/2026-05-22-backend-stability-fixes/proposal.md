---
name: backend-stability-fixes
change_class: high
reason: "修复后端数据一致性、原子性、返回格式等严重 bug，防止数据丢失和不一致，backend 层直接暴露给所有前端调用方，修复优先级最高"
---

## Task Anchor Echo

- **原始任务**: 对后端进行详细审查，修复 bug 频发问题
- **追加内容**: 无追加
- **追加内容类型判定**: 澄清（修复范围 = 全 backend 层）
- **是否改变任务主题**: 否

## Why

当前后端存在多个严重的数据一致性和健壮性问题：

1. **数据丢失风险** (`published.ts`): `PATCH /api/published/:id` 更新 workflow name 后不返回新数据，调用方无法确认更新结果；版本快照与 workflow update 操作非原子。
2. **响应格式不一致** (`published.ts`): `DELETE /api/published/:id` 返回 `{ success: true }`，与其他端点格式不统一；`GET /api/published` 列表接口返回 `content` 字段，导致大型列表响应膨胀。
3. **进程稳定性** (`index.ts` + `client.ts`): 无 Prisma graceful shutdown，进程收到 SIGTERM 时数据库连接池未优雅关闭，可能导致写入截断。
4. **版本号安全** (`workflow.ts`): `PUT /api/workflows/:id` 允许客户端直接指定版本号，可能导致语义版本混乱。
5. **Token 安全** (`auth.ts`): refresh token 黑名单机制依赖内存 `setTimeout`，高并发下存在竞态窗口。

## What Changes

1. **`PATCH /api/published/:id`**: 事务保护 name 更新，返回完整的 workflow 数据
2. **`DELETE /api/published/:id`**: 统一返回 `{ success: true, data: ... }` 格式
3. **`GET /api/published`**: 列表接口移除 `content` 字段，详情走 `GET /api/published/:id`
4. **`PUT /api/workflows/:id`**: 移除客户端指定版本号的能力，服务端自动递增
5. **`PUT /api/workflows/:id`**: 版本快照创建与 workflow update 纳入同一事务
6. **Server 启动/关闭**: 添加 Prisma graceful shutdown hook
7. **`auth.ts`**: 移除黑名单 `setTimeout` 竞态，使用数据库持久化 token 撤销记录

## Capabilities

### Modified Capabilities

- **published-workflow-management**: rename 操作返回完整更新后数据；列表加载性能提升（不再返回 content）
- **workflow-save**: 版本号由服务端控制，防止客户端注入；快照写入与主表更新原子化
- **auth-session**: refresh token 撤销机制改为持久化存储

## Impact

- **backend**: `server/src/routes/published.ts` — PATCH/DELETE 返回值修复，列表接口优化
- **backend**: `server/src/routes/workflow.ts` — 版本号安全 + 事务原子化
- **backend**: `server/src/index.ts` — graceful shutdown
- **backend**: `server/src/db/client.ts` — Prisma 日志配置（debug 用）
- **backend**: `server/src/routes/auth.ts` — token 黑名单持久化

## Out of Scope

- 不修改 Prisma schema（数据模型不变）
- 不修改 CORS 配置（留给 Change 2）
- 不修改 SQLite 数据库（留给 Change 2 评估）
- 不修改 `POST /workflows/:id/versions` 的服务端版本生成逻辑（已有事务）
