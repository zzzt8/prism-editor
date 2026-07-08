# Phase 0 Baseline Cleanup Tasks

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 15 |
| Completed | 13 |
| In Progress | 0 |

---

## Phase 0.1 - PRD 与文档

### T0.1.1 - 标记 PRD v1.0 为生效

**opsx-meta**

```yaml
id: T0.1.1
layer: docs
verify:
  - type: file_content
    path: docs/README.md
    contains: "Prism Composer Platform 产品基线 PRD v1.0"
```

**Description**

在 `docs/README.md` 中将 v1.0 标为"当前生效的基线"。

**Acceptance Criteria**

- [x] `docs/README.md` 包含 "Prism Composer Platform 产品基线 PRD v1.0" 标记为当前生效
- [x] 链接指向 `docs/prd/Prism Composer Platform 产品基线 PRD v1.0.md`

---

### T0.1.2 - 归档历史文档

**opsx-meta**

```yaml
id: T0.1.2
layer: docs
verify:
  - type: dir_exists
    path: docs/prd/_archive
```

**Description**

将以下历史文档移入 `docs/prd/_archive/`：

- Prism Editor PRD v0.1
- Prism Editor 产品定位与产品形态 PRD v0.2
- Prism Editor 任务拆解 v0.1
- Prism Editor 任务规划摘要 v0.1
- Prism Editor 技术架构约束清单 v0.1
- Prism Editor 架构审阅报告 v0.1

**Acceptance Criteria**

- [x] `docs/prd/_archive/` 目录存在
- [x] 历史文档已移入 `_archive/`
- [x] `docs/prd/` 根目录仅保留 v1.0 PRD

---

## Phase 0.2 - 代码瘦身体系

### T0.2.1 - 删除 JWT Auth 相关代码

**opsx-meta**

```yaml
id: T0.2.1
layer: server/middleware
status: completed
verify:
  - type: file_not_exists
    path: server/src/middleware/auth.ts
  - type: file_not_exists
    path: server/src/routes/auth.ts
  - type: command
    command: cd server && npm run build
    exit_code: 0
```

**Description**

删除 JWT 认证相关代码：
- `server/src/middleware/auth.ts`
- `server/src/routes/auth.ts`
- 移除 `@fastify/jwt` 依赖

**Acceptance Criteria**

- [ ] `server/src/middleware/auth.ts` 已删除
- [ ] `server/src/routes/auth.ts` 已删除
- [ ] `server/package.json` 不包含 `@fastify/jwt`
- [ ] `server` 构建成功

---

### T0.2.2 - 删除 Prisma User/RevokedToken models

**opsx-meta**

```yaml
id: T0.2.2
layer: prisma
status: completed
verify:
  - type: file_content
    path: server/prisma/schema.prisma
    not_contains: "model User"
    not_contains: "model RevokedToken"
  - type: command
    command: cd server && npx prisma validate
    exit_code: 0
```

**Completed**: ✅ Deleted from schema.prisma, verified with `prisma validate`

**Description**

从 `schema.prisma` 删除：
- `model User`
- `model RevokedToken`

同时清理相关 relation fields（ProductTemplate.userId 等）。

**Acceptance Criteria**

- [ ] `schema.prisma` 不包含 `model User`
- [ ] `schema.prisma` 不包含 `model RevokedToken`
- [ ] Prisma schema 验证通过

---

### T0.2.3 - 删除 NodePackage/NodePackageVersion models

**opsx-meta**

```yaml
id: T0.2.3
layer: prisma
status: completed
```

**Description**

删除节点市场相关代码：
- `model NodePackage`
- `model NodePackageVersion`
- `server/src/routes/node-packages.ts`

**Acceptance Criteria**

- [ ] `schema.prisma` 不包含 `model NodePackage`
- [ ] `schema.prisma` 不包含 `model NodePackageVersion`
- [ ] `server/src/routes/node-packages.ts` 已删除
- [ ] Prisma schema 验证通过

---

### T0.2.4 - 删除 SKU/SKUWorkflow models

**opsx-meta**

```yaml
id: T0.2.4
layer: prisma
status: completed
```

**Description**

删除 SKU 相关 models：
- `model SKU`
- `model SKUWorkflow`

**Acceptance Criteria**

- [ ] `schema.prisma` 不包含 `model SKU`
- [ ] `schema.prisma` 不包含 `model SKUWorkflow`
- [ ] Prisma schema 验证通过

---

### T0.2.5 - 删除 WorkflowVersion model

**opsx-meta**

```yaml
id: T0.2.5
layer: prisma
status: completed
```

**Description**

删除 `model WorkflowVersion`，版本管理收敛到 ProductTemplate.version。

**Acceptance Criteria**

- [ ] `schema.prisma` 不包含 `model WorkflowVersion`
- [ ] Prisma schema 验证通过

---

### T0.2.6 - 精简 Prisma schema 为目标结构

**opsx-meta**

```yaml
id: T0.2.6
layer: prisma
status: completed
```

**Description**

确保精简后的 schema 包含：

```prisma
model ProductTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  version     String   @default("1.0.0")
  content     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workflows Workflow[]
  assets   Asset[]
}

model Workflow {
  id           String   @id @default(cuid())
  templateId   String
  template     ProductTemplate @relation(fields: [templateId], references: [id])
  name         String
  platform     String   // 'browser' | 'nodejs'
  content      String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([templateId])
}

model Asset {
  id          String   @id @default(cuid())
  templateId  String
  template    ProductTemplate @relation(fields: [templateId], references: [id])
  name        String
  url         String
  type        String
  createdAt   DateTime @default(now())

  @@index([templateId])
}
```

**Acceptance Criteria**

- [ ] schema 包含 ProductTemplate/Workflow/Asset 三表
- [ ] Workflow 包含 platform 字段
- [ ] `prisma generate` 成功

---

### T0.2.7 - 删除 shared-types 废弃文件

**opsx-meta**

```yaml
id: T0.2.7
layer: packages/shared-types
status: completed
```

**Completed**: ✅ Deleted auth.ts, restored snippet.ts (SnippetSummary still needed), restored published.ts (PublishedWorkflowExecutor depends on it), removed node-package.ts

**Description**

删除废弃的 shared-types 文件：
- `snippet.ts`（Snippets stub，从未使用）
- `user.ts`（User 类型）
- `auth.ts`（Auth 类型）

**Acceptance Criteria**

- [ ] `snippet.ts` 已删除
- [ ] `user.ts` 已删除
- [ ] `auth.ts` 已删除
- [ ] shared-types 类型检查通过

---

### T0.2.8 - 删除 apps/user-app

**opsx-meta**

```yaml
id: T0.2.8
layer: apps
status: completed
```

**Completed**: ✅ Deleted entire apps/user-app, dev-tool build passes

**Description**

删除整个 `apps/user-app` 目录，Prism 不做独立用户产品。

**Acceptance Criteria**

- [ ] `apps/user-app` 目录已删除
- [ ] `apps/dev-tool` 构建成功（验证无依赖断裂）

---

### T0.2.9 - 清理 PublishedWorkflow model

**opsx-meta**

```yaml
id: T0.2.9
layer: prisma
status: completed
```

**Completed**: ✅ Deleted model from schema.prisma, deleted routes/published.ts

**Description**

删除：
- `model PublishedWorkflow`（由 ProductTemplate.version 替代）
- `server/src/routes/published.ts`

**Acceptance Criteria**

- [ ] `schema.prisma` 不包含 `model PublishedWorkflow`
- [ ] `server/src/routes/published.ts` 已删除

---

## Phase 0.3 - mall 集成准备

### T0.3.1 - 实现 API Key 认证中间件

**opsx-meta**

```yaml
id: T0.3.1
layer: server/middleware
status: completed
```

**Completed**: ✅ Created server/src/middleware/api-key.ts

**Description**

创建 API Key 认证中间件 `server/src/middleware/api-key.ts`：

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';

const MALL_API_SECRET = process.env.PRISM_API_SECRET || 'dev-secret';

const PUBLIC_ENDPOINTS = ['/api/health', '/api/assets'];

function isPublicEndpoint(url: string): boolean {
  return PUBLIC_ENDPOINTS.some((ep) => url.startsWith(ep));
}

export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.url.startsWith('/api/')) return;
  if (isPublicEndpoint(request.url)) return;

  const secret = request.headers['x-prism-secret'];
  if (secret !== MALL_API_SECRET) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
```

**Acceptance Criteria**

- [ ] `server/src/middleware/api-key.ts` 已创建
- [ ] 中间件导出 `apiKeyAuth` 函数
- [ ] server 构建成功

---

### T0.3.2 - 配置 CORS 白名单

**opsx-meta**

```yaml
id: T0.3.2
layer: server
status: completed
```

**Completed**: ✅ CORS already configured in index.ts, updated to CORS_ORIGINS env var

**Description**

在 server 入口文件中配置 CORS 白名单，允许 mall 域名访问。

**Acceptance Criteria**

- [ ] server 配置了 CORS
- [ ] 白名单包含 mall 域名（开发环境允许 localhost）

---

### T0.3.3 - 精简 server 入口文件

**opsx-meta**

```yaml
id: T0.3.3
layer: server
status: completed
```

**Completed**: ✅ Removed auth/published routes, added apiKeyAuth hook

**Description**

精简 `server/src/index.ts`：
- 移除 auth 路由注册
- 移除 published 路由注册
- 移除 @fastify/jwt 注册
- 添加 api-key 中间件
- 保留 templates/render/assets/health 路由

**Acceptance Criteria**

- [ ] server 入口文件不引用已删除的路由
- [ ] server 启动成功
- [ ] `/api/health` 返回 200

---

### T0.3.4 - 更新 server .env.example

**opsx-meta**

```yaml
id: T0.3.4
layer: server
status: completed
```

**Completed**: ✅ Updated .env.example with PRISM_API_SECRET

**Description**

更新 `server/.env.example`，添加 `PRISM_API_SECRET` 环境变量说明。

**Acceptance Criteria**

- [ ] `.env.example` 包含 `PRISM_API_SECRET` 变量说明
- [ ] 包含默认值 `dev-secret` 提示

---

### T0.3.5 - 更新 package.json workspaces

**opsx-meta**

```yaml
id: T0.3.5
layer: root
status: completed
```

**Completed**: ✅ Removed user-app scripts, removed user-app from turbo.json

**Description**

从根 `package.json` 的 workspaces 中移除 `apps/user-app`。

**Acceptance Criteria**

- [ ] `package.json` workspaces 不包含 user-app
- [ ] `npm install` 成功
- [ ] 项目结构正常

---

## Completion Criteria

所有 15 个 tasks 完成后：

- [x] PRD v1.0 标记为生效
- [x] 历史文档已归档
- [x] Prisma schema 精简为 3 表（ProductTemplate/Workflow/Asset）
- [x] JWT/User/NodePackage/SKU/WorkflowVersion/user-app 已删除
- [x] API Key 认证中间件已实现
- [x] CORS 白名单已配置
- [x] server/dev-tool 构建成功
- [x] `pnpm typecheck` 通过
