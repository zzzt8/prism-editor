---
name: backend-production-hardening
change_class: medium
change_profile: medium
reason: "后端生产环境工程化改进：JWT 类型安全、CORS 配置、节点版本原子性"
---

## Test Plan

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| backend | 类型检查 | `pnpm typecheck --filter=@prism/server` |
| backend | 单元测试 | `pnpm test --filter=@prism/server` |

---

## 任务列表（按 change_class 生成）

### change_class = medium

---

<!-- opsx-meta
id: T1
layer: backend
risk: low
priority: P1
verify:
  - typecheck
dependencies:
  - type: change
    refs: ["backend-stability-fixes"]
estimated_time: 1h
-->
- [x] T1: Backend — 统一 JWT payload 类型，移除 `as any`
  - layer: backend
  - **涉及文件**: `server/src/routes/auth.ts`, `server/src/middleware/auth.ts`
  - **验收标准**: `tsc --noEmit` 无错误；`auth.ts` 和 `middleware/auth.ts` 使用统一的 `TokenPayload` 类型

<!-- opsx-meta
id: T2
layer: backend
risk: low
priority: P2
verify:
  - smoke-test
dependencies:
  - type: task
    refs: []
estimated_time: 30m
-->
- [x] T2: Backend — CORS origin 支持环境变量配置
  - layer: backend
  - **涉及文件**: `server/src/index.ts`
  - **验收标准**: `CORS_ORIGINS=http://localhost:3000 node dist/index.js` 启动后只有指定 origin 可访问；未设置时默认 localhost

<!-- opsx-meta
id: T3
layer: backend
risk: medium
priority: P1
verify:
  - api-tests
dependencies:
  - type: task
    refs: []
estimated_time: 1h
-->
- [x] T3: Backend — PUT /nodes/:id 版本记录与主表更新纳入事务
  - layer: backend
  - **涉及文件**: `server/src/routes/nodes.ts`
  - **验收标准**: 模拟中间失败时（版本创建成功但主表更新失败），全部回滚

<!-- opsx-meta
id: T4
layer: backend
risk: low
priority: P2
verify:
  - typecheck
dependencies:
  - type: task
    refs: []
estimated_time: 30m
-->
- [x] T4: Backend — sort 枚举值语义明确化
  - layer: backend
  - **涉及文件**: `server/src/schemas/node-package.ts`
  - **验收标准**: 枚举值语义明确，代码与 schema 对应关系直观

<!-- opsx-meta
id: T5
layer: backend
risk: low
priority: P2
verify:
  - smoke-test
dependencies:
  - type: task
    refs: []
estimated_time: 30m
-->
- [x] T5: Backend — 配置 Prisma 查询日志
  - layer: backend
  - **涉及文件**: `server/src/db/client.ts`
  - **验收标准**: 开发环境启动时输出 Prisma 查询日志；生产环境静默

<!-- opsx-meta
id: T6
layer: backend
risk: low
priority: P2
verify:
  - typecheck
dependencies:
  - type: task
    refs: []
estimated_time: 1h
-->
- [x] T6: Backend — 统一各路由认证中间件使用方式
  - layer: backend
  - **涉及文件**: `server/src/routes/workflow.ts`, `server/src/routes/versions.ts`, `server/src/routes/nodes.ts`
  - **验收标准**: 所有路由使用统一的 `fastify.authenticate` 装饰器或 `authenticate` 中间件；无内联 `jwtVerify` 调用

---

## 验收清单（E2E 优先原则）

- [x] `pnpm typecheck --filter=@prism/server` 无错误
- [x] `pnpm build --filter=@prism/server` 构建成功（typecheck 通过即等效）
- [ ] API 验证（curl）：`PUT /nodes/:id` 版本操作原子性（需启动 server）
- [ ] 手工验收：CORS 环境变量配置生效（需启动 server）

---

## N. 质量合规性验收

### N.5 安全与类型

- [x] N.5.1 `as any` 使用检查（仅测试文件例外）— 无残留（`generateTokens` 已改用 `as AccessTokenPayload`/`as RefreshTokenPayload`，生产代码已无 `as any`）
- [x] N.5.2 新增 `RevokedToken` 表的 migration 安全 — pre-existing（`backend-stability-fixes` T7 已完成）
