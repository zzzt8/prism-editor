# Phase 0 Baseline Cleanup Design

## Goals

1. **瘦身体系**：删除废弃代码（JWT/User/NodePackage/SKU/WorkflowVersion/user-app）
2. **精简数据模型**：Prisma schema 简化为 ProductTemplate/Workflow/Asset 三表
3. **精简 API 路由**：删除通用 workflow API，保留 templates/render/assets/health
4. **切换认证模式**：从 JWT 改为 mall 信任模式（API Key + CORS）
5. **归档历史文档**：确立 PRD v1.0 为唯一权威基线

## Non-Goals

- 不修改 image-ops 架构（Phase 1 任务）
- 不实现 Composer SDK（Phase 3 任务）
- 不接入 mall 系统（Phase 4 任务）
- 不实现多流 ProductTemplate（Phase 2 任务）

---

## Decisions

### D1: 认证方案选择

**决策**：采用 mall 信任模式（固定 API Key + CORS 白名单）

| 方案 | 优点 | 缺点 |
|------|------|------|
| JWT Auth（现状） | 支持多用户、有过期机制 | 实现复杂、Prism 不需要用户系统 |
| API Key（选择） | 简单、适合 server-to-server | 不支持多用户、无过期机制 |
| OAuth 2.0 | 标准化 | 过度设计 |

**理由**：Prism 是 mall 的图像合成 runtime，不做独立用户产品。mall 内部完全信任，API Key 足够。

### D2: Prisma Provider 保持 SQLite

**决策**：开发环境用 SQLite，生产环境可选 PostgreSQL

**理由**：
- 轻量化，开发环境零配置
- Prisma 原生支持 SQLite/PostgreSQL 切换
- MVP 阶段不需要 PostgreSQL 的高级特性

### D3: Workflow Model 保留 platform 字段

**决策**：Workflow 保留 platform 字段（`'browser'` | `'nodejs'`）

**理由**：为 Phase 1 方案 C（平台能力标记）预留字段。当前阶段不实现 nodejs executor，但 schema 要提前兼容。

### D4: 删除 vs 注释代码

**决策**：直接删除废弃代码，不注释

**理由**：
- 减少代码库体积
- 避免遗留注释造成混淆
- Git 历史可追溯

---

## Architecture Review

### A1: 删除路径确认

```
删除路径（按依赖关系排序）：

1. 删除 middleware/auth.ts（无依赖）
2. 删除 routes/auth.ts（无依赖）
3. 删除 routes/published.ts（依赖 Prisma PublishedWorkflow）
4. 删除 routes/workflow.ts（依赖 Prisma Workflow）
5. 修改 routes/templates.ts（移除 userId 依赖）
6. 删除 Prisma models（User, RevokedToken, NodePackage, SKU, WorkflowVersion）
7. 删除 apps/user-app（无依赖）
8. 删除 shared-types/snippet.ts, user.ts, auth.ts
```

### A2: 数据迁移策略

**决策**：Phase 0 不做数据迁移，Phase 0 完成后如需迁移再单独处理

**理由**：
- MVP 阶段无生产数据
- 开发环境可重建数据库
- 避免复杂迁移脚本增加风险

### A3: API Key 存储策略

```typescript
// server/src/middleware/api-key.ts
const MALL_API_SECRET = process.env.PRISM_API_SECRET || 'dev-secret';

// 开发环境默认 dev-secret，生产环境必须设置环境变量
```

---

## Verification Checklist

| 类别 | 检查项 | 验证方式 |
|------|--------|---------|
| Schema | Prisma schema 验证通过 | `npx prisma validate` |
| Schema | 仅保留 ProductTemplate/Workflow/Asset 三表 | 检查 schema.prisma |
| Build | server 构建成功 | `cd server && npm run build` |
| Build | dev-tool 构建成功 | `cd apps/dev-tool && npm run build` |
| API | /api/health 返回 200 | `curl http://localhost:3000/api/health` |
| API | /api/templates 返回 401（无 secret） | `curl http://localhost:3000/api/templates` |
| API | /api/templates 返回 200（有 secret） | `curl -H "x-prism-secret: dev-secret" http://localhost:3000/api/templates` |
| Typecheck | shared-types 类型检查通过 | `npx tsc --noEmit -p packages/shared-types` |
| Test | 现有测试不因删除而失败 | `npm test`（预期部分测试需清理） |

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 删错依赖文件导致构建失败 | 低 | 高 | 先运行 `npm run build` 验证 |
| 遗漏删除某处对 User/Auth 的引用 | 中 | 中 | TypeScript strict 模式 + typecheck |
| dev-tool 依赖废弃代码 | 中 | 中 | 构建测试 + E2E 测试 |
| 删除 user-app 导致其他 app 引用断裂 | 低 | 中 | 检查 imports |
