## Goals

- 消除数据一致性和数据丢失风险
- 确保所有 API 响应格式一致、可预测
- 保证关键操作的原子性
- 提升服务进程健壮性

## Non-Goals

- 不做数据库迁移或 schema 变更
- 不做性能优化（列表分页、缓存等）
- 不做安全审计（全量渗透测试）

## Decisions

### D1: `PATCH /api/published/:id` 返回完整 workflow 数据

**问题**: 原实现在事务外更新 workflow name，只返回 `{ success: true }`，调用方无法确认更新结果。

**决定**: 将 workflow name 更新纳入事务，查询并返回更新后的完整 workflow 数据。

**替代方案**:
- 只返回 `{ success: true, name: newName }`（简单但信息量少）
- 返回 `{ success: true }` + 调用方自行刷新（当前问题，调用方无法确认）

### D2: `GET /api/published` 列表接口移除 `content` 字段

**问题**: 列表接口返回 `content` 字段导致响应体积膨胀（大型 workflow 的 JSON 可能数 MB）。

**决定**: 列表接口不返回 `content`；前端详情加载使用 `GET /api/published/:id`。

**替代方案**:
- 列表接口支持 `?fields=...` 参数（过度设计）
- 保持现状（性能问题）

### D3: `PUT /api/workflows/:id` 服务端控制版本号

**问题**: 客户端可注入任意版本号，破坏语义版本。

**决定**: 移除 `version` 输入，服务端自动递增版本号。

**替代方案**:
- 允许客户端指定但校验格式（`\d+\.\d+\.\d+`）（仍有注入风险）
- 保持现状（当前问题）

### D4: 版本快照与 workflow update 使用事务

**问题**: 原实现在事务外创建 `WorkflowVersion` 记录，可能导致快照与主表不一致。

**决定**: 使用 `prisma.$transaction` 将快照创建和主表更新打包。

### D5: Prisma graceful shutdown

**决定**: 在 `index.ts` 的 `start()` 中注册 `SIGTERM`/`SIGINT` handler，先关闭 Fastify 再断开 Prisma。

### D6: Refresh token 黑名单持久化

**问题**: 内存 `setTimeout` 在进程重启后丢失，且高并发下存在竞态。

**决定**: 在 Prisma 中新增 `RevokedToken` 表（或复用 User 表），记录 `jti` + `revokedAt`，每次 token 验证时检查。

## Architecture Review（变更后）

```
Fastify Server
├── JWT Auth Middleware
├── Rate Limit (auth routes)
└── Route Handlers
    ├── /api/auth/*          — auth.ts
    ├── /api/workflows/*     — workflow.ts
    │                         └─ uses Prisma $transaction for version snapshot
    ├── /api/published/*     — published.ts
    │                         └─ PATCH/DELETE return consistent { data: ... }
    │                         └─ List excludes content field
    ├── /api/nodes/*         — nodes.ts
    └── /api/workflows/:id/versions/* — versions.ts
                                    └─ Diff engine (pure function)
```

## Review Checklist

| 检查项 | 预期结果 |
|--------|----------|
| `PATCH /api/published/:id` 返回更新后 workflow 数据 | `{ data: { id, workflowId, workflow: { name, ... } } }` |
| `DELETE /api/published/:id` 返回 `{ success: true }` | 格式与 PATCH 一致 |
| `GET /api/published` 列表不返回 `content` | 列表响应体积 < 100KB（无 content） |
| `PUT /api/workflows/:id` 禁止传入 `version` | schema 中移除 version 字段 |
| 版本快照创建和 workflow update 在同一事务中 | 失败时全部回滚 |
| Server 收到 SIGTERM 后优雅关闭 | Prisma 连接池正确关闭 |
| Refresh token 撤销记录持久化到 DB | 进程重启后黑名单仍有效 |
