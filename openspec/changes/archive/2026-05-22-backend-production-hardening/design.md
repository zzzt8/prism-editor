## Goals

- 统一类型定义，消除 `as any` 使用
- 配置外部化，支持多环境部署
- 保证节点包版本操作的原子性
- 提升代码可维护性

## Non-Goals

- 不做性能优化或数据库迁移
- 不做全量安全审计
- 不修改 API 行为

## Decisions

### D1: JWT Payload 类型统一

**问题**: `middleware/auth.ts` 定义 `AuthUser = { userId, type }`，但 `auth.ts` 生成的 token 包含额外 `jti` 字段，类型不一致。

**决定**: 统一为 `TokenPayload` 类型，middleware 和 routes 使用同一接口；使用 `fastify.jwt.verify<T>()` 的泛型参数而非 `as any`。

### D2: CORS Origin 环境变量配置

**问题**: origin 列表硬编码，无法适配不同部署环境。

**决定**: 支持 `CORS_ORIGINS` 环境变量，逗号分隔的 URL 列表；开发环境默认 `localhost:3000,localhost:3002`。

### D3: 节点包版本操作事务化

**问题**: `PUT /nodes/:id` 中版本记录和主表更新非原子。

**决定**: 使用 `prisma.$transaction` 打包两个操作。

### D4: sort 枚举值语义明确化

**问题**: `'newest'` 作为 sort 值不直观。

**决定**: 改为 `'createdAt:desc'` 形式，或保持 `'newest'` 但添加注释说明。

### D5: Prisma 日志分级配置

**决定**: 通过 `LOG_LEVEL` 环境变量控制 Prisma 查询日志，测试/开发环境开启，生产环境关闭。

## Review Checklist

| 检查项 | 预期结果 |
|--------|----------|
| `auth.ts` 中无 `as any` | `tsc --noEmit` 无错误 |
| CORS origin 从环境变量读取 | `CORS_ORIGINS=...` 启动后跨域请求正常 |
| `PUT /nodes/:id` 版本记录在事务中 | 中间失败时全部回滚 |
| Prisma 日志在开发环境可见 | `LOG_LEVEL=query` 时输出 SQL |
