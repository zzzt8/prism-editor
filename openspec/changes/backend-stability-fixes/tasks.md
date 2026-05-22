---
name: backend-stability-fixes
change_class: high
change_profile: high
reason: "修复后端数据一致性、原子性、返回格式等严重 bug，防止数据丢失和不一致"
---

## Test Plan

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| backend | API 集成测试 | 手工测试（curl/Postman） |
| backend | 单元测试 | `pnpm test --filter=@prism/server` |

### Test Cases

#### TC-1: PATCH published workflow 返回完整数据
- **Given**: 已发布的工作流，用户已登录
- **When**: `PATCH /api/published/:id` 发送 `{ name: "新名称" }`
- **Then**: 响应 body 包含 `{ data: { id, workflowId, workflow: { name: "新名称" } } }`

#### TC-2: DELETE published workflow 返回值格式
- **Given**: 已发布的工作流，用户已登录
- **When**: `DELETE /api/published/:id`
- **Then**: 响应 body 为 `{ success: true }`，状态码 200

#### TC-3: 列表接口不返回 content
- **Given**: 多个已发布工作流
- **When**: `GET /api/published?page=1&limit=20`
- **Then**: 响应 body 中每个 item 无 `content` 字段

#### TC-4: PUT workflow 不接受 version 参数
- **Given**: 已登录，有草稿工作流
- **When**: `PUT /api/workflows/:id` 发送包含 `version` 的 body
- **Then**: `version` 字段被忽略，workflow 版本号自动递增

#### TC-5: 版本快照与 workflow update 原子性
- **Given**: 已登录，有草稿工作流
- **When**: `PUT /api/workflows/:id` 更新 content
- **Then**: 快照记录和主表更新要么同时成功，要么同时失败

### Backward Compatibility

- [x] `DELETE /api/published/:id` 返回格式变更（从无返回值到 `{ success: true }`）—— 兼容，因为原返回 200 空 body 也可解析
- [x] `GET /api/published` 移除 `content` 字段—— 兼容，调用方不依赖此字段
- [x] `PUT /api/workflows/:id` 忽略 `version` 输入—— 兼容，原可传任意值

---

## 任务列表（按 change_class 生成）

### change_class = high

使用 opsx-meta 块（保留完整格式）：

```html
<!-- opsx-meta
id: T1
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: []
-->
- [ ] T1: 修复 PATCH /api/published/:id — 事务保护 + 返回完整 workflow 数据
  - layer: backend
  - **验收标准**: `PATCH /api/published/:id` 响应 body 包含 `{ data: { id, workflowId, workflow: { name, ... } } }`
```

---

<!-- opsx-meta
id: T1
layer: backend
risk: high
priority: P0
verify:
  - api-tests
dependencies:
  - type: task
    refs: []
estimated_time: 30m
-->
- [x] T1: Backend — 修复 PATCH /api/published/:id（事务保护 + 返回完整 workflow 数据）
  - layer: backend
  - **涉及文件**: `server/src/routes/published.ts`
  - **验收标准**: `PATCH /api/published/:id` 响应 body 中包含 `data` 对象，内含 `workflow` 字段，值为更新后的完整 workflow 记录

<!-- opsx-meta
id: T2
layer: backend
risk: low
priority: P0
verify:
  - api-tests
dependencies:
  - type: task
    refs: []
estimated_time: 15m
-->
- [x] T2: Backend — 统一 DELETE /api/published/:id 返回格式
  - layer: backend
  - **涉及文件**: `server/src/routes/published.ts`
  - **验收标准**: `DELETE /api/published/:id` 响应 body 为 `{ success: true }`

<!-- opsx-meta
id: T3
layer: backend
risk: low
priority: P0
verify:
  - api-tests
dependencies:
  - type: task
    refs: []
estimated_time: 15m
-->
- [x] T3: Backend — GET /api/published 列表接口移除 content 字段
  - layer: backend
  - **涉及文件**: `server/src/routes/published.ts`
  - **验收标准**: `GET /api/published` 响应 body 的每个 item 不包含 `content` 字段

<!-- opsx-meta
id: T4
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
- [x] T4: Backend — PUT /api/workflows/:id 服务端控制版本号
  - layer: backend
  - **涉及文件**: `server/src/routes/workflow.ts`, `server/src/schemas/workflow.ts`
  - **验收标准**: `UpdateWorkflowSchema` 移除 `version` 字段；版本号由服务端自动递增

<!-- opsx-meta
id: T5
layer: backend
risk: medium
priority: P1
verify:
  - unit-tests
dependencies:
  - type: task
    refs: ["T4"]
estimated_time: 1h
-->
- [x] T5: Backend — PUT /api/workflows/:id 版本快照与 update 原子化（事务）
  - layer: backend
  - **涉及文件**: `server/src/routes/workflow.ts`
  - **验收标准**: `workflowVersion.create` 和 `workflow.update` 在同一 `prisma.$transaction` 中；模拟中间失败场景时全部回滚

<!-- opsx-meta
id: T6
layer: backend
risk: low
priority: P0
verify:
  - smoke-test
dependencies:
  - type: task
    refs: []
estimated_time: 30m
-->
- [ ] T6: Backend — 添加 Prisma graceful shutdown hook
  - layer: backend
  - **涉及文件**: `server/src/index.ts`
  - **验收标准**: 进程收到 SIGTERM/SIGINT 后，先调用 `fastify.close()` 再调用 `prisma.$disconnect()`，无报错

<!-- opsx-meta
id: T7
layer: backend
risk: medium
priority: P1
verify:
  - api-tests
dependencies:
  - type: task
    refs: []
estimated_time: 2h
-->
- [ ] T7: Backend — refresh token 黑名单持久化到数据库
  - layer: backend
  - **涉及文件**: `server/src/routes/auth.ts`, `server/src/db/client.ts`
  - **涉及文件**: `server/prisma/schema.prisma`（新增 RevokedToken 表）
  - **验收标准**: `RevokedToken` 表记录 jti + revokedAt；token 验证时检查表；进程重启后黑名单仍有效

---

## 验收清单（E2E 优先原则）

> 机器能做的先让机器做：E2E 测试 > 单元测试 > 命令行验证 > 人工验收。

- [ ] `pnpm typecheck --filter=@prism/server` 无错误
- [ ] `pnpm build --filter=@prism/server` 构建成功
- [ ] API 验证（curl）：`PATCH /api/published/:id` 返回完整 workflow 数据
- [ ] API 验证（curl）：`DELETE /api/published/:id` 返回 `{ success: true }`
- [ ] API 验证（curl）：`GET /api/published` 列表无 content 字段
- [ ] API 验证（curl）：`PUT /api/workflows/:id` 不接受 version 参数
- [ ] 手工验收：Server 关闭时 Prisma 连接池正确关闭（查看日志）

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。
> **选择性应用**：只添加与 change 直接相关的 N.x 章节，无关的不写。

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查（仅测试文件例外）
- [ ] N.5.2 Prisma schema 新增 `RevokedToken` 表的 migration 安全（`pnpm --filter=@prism/server exec prisma migrate status`）
