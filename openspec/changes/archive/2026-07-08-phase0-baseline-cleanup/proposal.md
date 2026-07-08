# Phase 0 Baseline Cleanup Proposal

## Metadata

| Field | Value |
|-------|-------|
| change_class | **high** |
| reason | 触及 Prisma schema 核心变更、删除认证系统、精简 API 路由，影响 server/、prisma/、apps/ 多个 layer |
| created | 2026-07-08 |
| PRD baseline | Prism Composer Platform PRD v1.0 |

---

## Why

根据 PRD v1.0 §8 和 §11，Phase 0 的目标是：

1. **PRD 生效 + 历史代码清理**：作废 6 份历史文档，确立 v1.0 为唯一权威基线
2. **瘦身体系**：删除 JWT Auth、User、NodePackage、SKU、WorkflowVersion、user-app 等废弃代码
3. **mall 集成准备**：精简 API 路由为 templates/render/assets/health，改为 API Key + CORS 白名单认证

当前代码库仍包含大量废弃代码，增加了维护负担和潜在安全风险。

---

## What Changes

### 删除的 Prisma Models

| Model | 文件位置 | 理由 |
|-------|---------|------|
| User | schema.prisma | Prism 不做独立用户产品，改为 mall 信任模式 |
| RevokedToken | schema.prisma | 随 JWT Auth 删除 |
| NodePackage | schema.prisma | 节点市场不在 v1.0 范围 |
| NodePackageVersion | schema.prisma | 随 NodePackage 删除 |
| SKU | schema.prisma | SKU 模型不在 v1.0 范围 |
| SKUWorkflow | schema.prisma | 随 SKU 删除 |
| WorkflowVersion | schema.prisma | 版本管理收敛到 ProductTemplate.version |

### 精简后的 Prisma Models

```prisma
model ProductTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  version     String   @default("1.0.0")
  content     String   // 完整的 ProductTemplate JSON
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
  content      String   // workflow JSON
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
  type        String   // 'image' | 'font' | 'other'
  createdAt   DateTime @default(now())

  @@index([templateId])
}
```

### 删除的 Server Routes

| Route | 文件位置 | 理由 |
|-------|---------|------|
| Auth | `server/src/routes/auth.ts` | 删除 JWT 认证 |
| Published Workflow | `server/src/routes/published.ts` | 删除 user-app 相关 API |
| Workflow CRUD | `server/src/routes/workflow.ts` | 保留 templates/render/assets，删除通用 workflow API |

### 精简后的 API Routes

```
/api/templates
  ├── GET    /api/templates           # 列出所有 ProductTemplate
  ├── GET    /api/templates/:id       # 获取单个 ProductTemplate
  ├── POST   /api/templates           # 创建设类配置
  ├── PUT    /api/templates/:id       # 更新品类配置
  └── DELETE /api/templates/:id       # 删除品类配置

/api/render
  └── POST   /api/render              # 触发生产渲染

/api/assets
  ├── POST   /api/assets/upload        # 上传素材
  └── GET    /api/assets/:id          # 获取素材

/api/health
  └── GET    /api/health              # 健康检查
```

### 删除的 Apps

| App | 理由 |
|-----|------|
| apps/user-app | Prism 不做独立用户产品 |

### 删除的 Files

| File | 理由 |
|------|------|
| `packages/shared-types/src/snippet.ts` | Snippets stub，从未使用 |
| `packages/shared-types/src/user.ts` | User 类型，随 User model 删除 |
| `packages/shared-types/src/auth.ts` | Auth 类型，随 JWT 删除 |

### 新增的安全配置

```typescript
// server/src/middleware/api-key.ts
const MALL_API_SECRET = process.env.PRISM_API_SECRET || 'dev-secret';

fastify.addHook('preHandler', async (request, reply) => {
  if (request.url.startsWith('/api/')) {
    const secret = request.headers['x-prism-secret'];
    if (secret !== MALL_API_SECRET) {
      if (!isPublicEndpoint(request.url)) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }
  }
});
```

### PRD 文档整理

| 任务 | 说明 |
|------|------|
| 标记 v1.0 为生效 | 在 docs/README.md 中标记 |
| 归档历史文档 | 将 v0.1/v0.2/任务拆解等移入 `_archive/` |

---

## Capabilities

1. **Prisma schema 精简**：ProductTemplate / Workflow / Asset 三表，满足 §6.2 数据模型
2. **API 路由精简**：templates / render / assets / health 四组路由
3. **认证方案切换**：从 JWT 改为 API Key + CORS 白名单
4. **代码库清理**：删除废弃代码，减少维护负担
5. **PRD 文档归档**：确立 v1.0 为唯一权威基线

---

## Impact

| Layer | Impact |
|-------|--------|
| `prisma/` | 删除 7 个 models，保留 3 个核心 models |
| `server/routes/` | 删除 3 个路由文件，新增 API Key 中间件 |
| `server/middleware/` | 删除 Auth 中间件，新增 API Key 验证 |
| `apps/user-app/` | 整体删除 |
| `packages/shared-types/` | 删除 snippet.ts, user.ts, auth.ts |
| `packages/image-ops/` | 无影响（保留） |
| `packages/workflow-core/` | 无影响（保留） |
| `apps/dev-tool/` | 无影响（保留） |

---

## Out of Scope

- **Phase 1 架构重构**：image-ops/core/browser/nodejs 分层（T1.1-T1.6）
- **Phase 2 ProductTemplate 多流化**：多 Preview/Production Flow 支持
- **Phase 3 Composer SDK**：PS 风格交互组件
- **Phase 4 mall 集成**：mall admin-web / frontend 接入
- **节点市场**：完全删除，不做插件化改造
- **Snippets 可视化编辑**：snippet.ts 直接删除
- **JWT Auth 替代方案**：采用 mall 信任模式，不需要 JWT
