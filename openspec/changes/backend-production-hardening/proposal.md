---
name: backend-production-hardening
change_class: medium
reason: "后端生产环境工程化改进：JWT 类型安全、CORS 配置、CORS/节点版本原子性、代码质量清理，提升长期可维护性"
---

## Task Anchor Echo

- **原始任务**: 对后端进行详细审查，修复 bug 频发问题
- **追加内容**: Change 2 聚焦于生产环境工程化和长期风险
- **追加内容类型判定**: 澄清（修复范围 = 全 backend 层）
- **是否改变任务主题**: 否

## Why

在 `backend-stability-fixes` (Change 1) 修复了直接导致数据丢失的问题后，仍有以下中等优先级工程化和长期风险需要处理：

1. **类型安全** (`auth.ts`): JWT payload 使用 `as any` 强制类型，`AuthUser` 接口缺少 `jti` 字段，middleware 和 auth routes 中类型定义不一致。
2. **CORS 硬编码** (`index.ts`): origin 列表 hardcode 为 localhost，无法适配多环境部署。
3. **节点包版本原子性** (`nodes.ts`): 版本记录创建和主表更新非原子。
4. **枚举语义不明确** (`node-package.ts`): `sort` 字段枚举值 `'newest'` 语义不直观。
5. **Prisma 日志缺失** (`client.ts`): 无查询日志、慢查询监控。

## What Changes

1. **`auth.ts`**: 统一 JWT payload 类型定义，移除 `as any`，新增 `RevokedToken` 表
2. **`index.ts`**: CORS origin 支持环境变量配置
3. **`nodes.ts`**: 版本记录和主表更新纳入事务
4. **`node-package.ts`**: `sort` 枚举值改为更明确的语义
5. **`client.ts`**: 配置 Prisma 查询日志（开发环境可见）
6. **代码质量清理**: 统一各路由的认证中间件使用方式、移除冗余 catch 块

## Capabilities

### Modified Capabilities

- **auth-session**: 类型安全改进，token 撤销持久化
- **node-package-management**: 版本历史记录原子性保证

## Impact

- **backend**: `server/src/routes/auth.ts` — 类型统一
- **backend**: `server/src/index.ts` — CORS 环境变量
- **backend**: `server/src/routes/nodes.ts` — 事务原子化
- **backend**: `server/src/schemas/node-package.ts` — 枚举语义改进
- **backend**: `server/src/db/client.ts` — Prisma 日志配置

## Out of Scope

- 不修改数据库提供商（SQLite → PostgreSQL 迁移）
- 不修改 API 路由逻辑（路由行为不变）
- 不修改 CORS 以外的 middleware 逻辑

## Dependencies

- 依赖 `backend-stability-fixes` 中 T7（RevokedToken 表 schema）
