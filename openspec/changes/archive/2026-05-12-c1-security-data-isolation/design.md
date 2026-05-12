## Context

当前 `server/src/routes/published.ts` 和 `server/src/routes/nodes.ts` 的所有端点都没有 `@authenticate` 装饰器，未登录用户可以自由增删改查所有 published workflows 和 node packages。此外 Prisma schema 的 `PublishedWorkflow` model 与 `Workflow` 的 relation 缺少 cascade delete，删除 workflow 后 published 记录残存。

## Goals / Non-Goals

**Goals:**
- 所有 published 和 nodes 端点必须携带有效 JWT
- 数据归属隔离：用户只能访问自己创建的资源
- 跨用户访问返回 404（避免泄漏 ID 存在性）
- Prisma cascade delete 修复

**Non-Goals:**
- 不实现 admin 权限体系
- 不实现细粒度权限（所有登录用户对自有资源有 CRUD）
- 不做安全策略 UI

## Decisions

### 1: Auth decorator 应用范围

在 `published` 和 `nodes` 的所有端点加上 `@authenticate`，确保每个请求都携带有效 JWT。

### 2: 数据隔离策略

查询时强制注入 `userId = currentUser.id`：
- `published`: `where: { workflow: { userId } }`
- `nodes`: `where: { authorId: userId }`
- DELETE/PUT 操作前先查归属，归属不符返回 404

### 3: 跨用户修改防护

用户 A 尝试 `DELETE /published/:id`（属于用户 B）→ Prisma 查不到 → 404（不返回 403，避免泄漏 ID 是否存在）

### 4: Cascade delete

```prisma
model PublishedWorkflow {
  workflow   Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  // onDelete: Cascade 补上
}
```

## Risks / Trade-offs

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 现有前端代码未带 token 导致 401 | 高 | API 无法调用 | dev-tool / user-app 的 API 调用已带 token，只需确认 auth.ts 登录流程正常 |
| 未登录用户发布的内容变成不可见 | 中 | 存量数据归属丢失 | seed 数据统一归属到一个 seed 用户 |
| auth middleware 签名不匹配导致 TS 报错 | 低 | 编译失败 | 修 auth.ts 的 export 类型 |

---

## Architecture Review（技术方案评审）

### 目标

在 API 层实现"谁创建谁管理"的最小数据隔离，不依赖前端，纯后端强制。

### 约束

- 技术约束：JWT 验证已有基础设施，只需复用；Prisma schema 迁移需要处理已有数据
- 时间约束：纯后端改动，不动前端代码
- 不变量：已有登录用户的 token 格式不变

### 候选方案

#### 方案 A：全部路由加装饰器 + 注入 userId
在每个 handler 里从 `request.currentUser` 取 userId，注入到 Prisma where 条件。

**Pros**: 实现简单，完全可控
**Cons**: 大量 handler 要改，重复代码多

#### 方案 B：封装带归属检查的 Repository 层
在 Repository 层统一加 `where: { userId }` 过滤，所有 route 调 repository。

**Pros**: 改动集中，API 端点改动少
**Cons**: 引入 repository 层需要较大重构，属于 C2 范围

### 决策

选择方案 A，原因：
1. 改动边界清晰，只动 route handler，不涉及架构重构
2. C2 才会做 store/repository 重构，不在 C1 引入额外复杂度
3. 每个 handler 2-3 行代码的改动，可审计性强

### 风险与回滚

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| handler 遗漏未加鉴权 | 中 | 安全漏洞 | 逐个端点核对，写测试覆盖 |
| Prisma migration 丢失数据 | 低 | 数据丢失 | migration 前 backup SQLite 文件 |

**回滚方案**: `git revert` + `prisma migrate deploy` 回退 schema；route handler 改动直接 revert

### Migration Strategy（迁移策略）

1. `prisma migrate dev --name add_cascade_published_workflow`
2. 确认 migration 成功（`prisma migrate status`）
3. 前端带 token 访问各端点验证 200
4. 停掉 token，验证各端点返回 401

---

## 评审清单

> 适用于 change_class = high

- [ ] 方案是否覆盖了 proposal 中的所有 goal 和 acceptance criteria？
- [ ] 是否存在更简单的替代方案？简要对比：已在 design.md 中选择方案 A
- [ ] 最坏情况的回退路径是什么？`git revert` + migration 回退
- [ ] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED 语义变化？
  - PublishedWorkflow API: 访问控制从公开变为需登录
  - NodePackage API: 访问控制从公开变为需登录
- [ ] Layer 间是否有隐式依赖未在设计层面显式声明？
  - 依赖 dev-tool / user-app 的登录流程（已实现）
  - 依赖 auth middleware（已实现）
