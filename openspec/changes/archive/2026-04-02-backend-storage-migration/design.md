## Context

当前系统架构：
- `apps/dev-tool` 和 `apps/user-app` 使用 `LocalStorageAdapter` 将工作流数据存储在浏览器 localStorage
- `packages/shared-types/src/storage.ts` 定义了 `StorageAdapter` 接口（`save/load/list/delete/createWorkflow/updateWorkflowMeta/import/exportToJson`）
- 现有接口已支持工作流管理，但缺少服务端实现

当前问题：
- localStorage 最大 5-10MB，无法存储大型工作流和历史版本
- 无用户体系，所有数据混杂
- 无跨设备同步
- 发布的工作流依赖 BroadcastChannel 跨 Tab 同步，无法跨设备使用

## Goals / Non-Goals

**Goals:**
- 搭建 Fastify + Prisma + SQLite 服务端骨架，支持工作流 CRUD API
- 实现 `ApiStorageAdapter` 替换 `LocalStorageAdapter`，前端代码零改动
- 支持渐进式迁移：开发环境用 localStorage，生产环境用 API
- 为后续的用户认证、工作流版本管理奠定数据模型基础

**Non-Goals:**
- 不实现用户认证（本提案不含 auth，见 `user-auth-system` 提案）
- 不实现工作流版本管理（见 `workflow-versioning` 提案）
- 不实现团队协作/权限控制
- 不实现服务端执行（算力下沉的核心是客户端执行）
- 不删除 localStorage 代码（保留开发环境 fallback）

## Decisions

### 决策 1: 使用 Fastify 而非 Express

**选择**: Fastify (`fastify@5.x`)

**理由**:
- 原生 TypeScript 支持，schema validation (通过 `@fastify/type-provider-typebox`)
- 插件系统比 Express 更现代，扩展性强
- 内置 JSON Schema 验证，性能优于 Express
- 路由定义简洁，与 StorageAdapter 接口一一对应

**工具文档**:
- Fastify 官方: https://fastify.dev/
- Fastify GitHub: https://github.com/fastify/fastify
- Fastify TypeScript 指南: https://www.fastify.io/docs/latest/Guides/TypeScript/
- Fastify Plugin 系统: https://www.fastify.io/docs/latest/Plugins/

**替代方案**:
- Express: 更流行但无原生 TS 支持，需额外配置类型
- NestJS: 功能完整但过于重型，学习曲线陡，不适合快速迭代

---

### 决策 2: 使用 Prisma ORM 而非原生 SQL

**选择**: Prisma (`prisma@6.x`) + `@prisma/client`

**理由**:
- 类型安全的数据库访问，Schema 即类型定义
- 自动生成 migrations，无需手写 SQL
- 支持 SQLite（开发）到 PostgreSQL（生产）的无缝迁移
- 活跃社区，文档完善

**工具文档**:
- Prisma 官方: https://www.prisma.io/docs
- Prisma GitHub: https://github.com/prisma/prisma
- Prisma + Fastify 集成: https://www.prisma.io/docs/orm/overview/databases/fastify
- Prisma Schema 参考: https://www.prisma.io/docs/orm/reference/prisma-schema-reference

**替代方案**:
- 原生 SQL (better-sqlite3): 性能更好但类型安全差，迁移复杂
- Drizzle ORM: 更轻量，但生态系统不如 Prisma 完善

---

### 决策 3: 数据库使用 SQLite → PostgreSQL 路径

**选择**: 开发环境 SQLite (`prisma/dev.db`)，生产环境 PostgreSQL

**理由**:
- 开发环境零配置，Prisma 内置 SQLite 支持
- SQLite 单文件数据库，适合中小规模（10万用户级别够用）
- PostgreSQL 迁移路径清晰，当规模扩大时只需改 `DATABASE_URL`
- Prisma schema 一处定义，两套数据库通用

**工具文档**:
- Prisma + SQLite: https://www.prisma.io/docs/orm/overview/databases/sqlite
- Prisma + PostgreSQL: https://www.prisma.io/docs/orm/overview/databases/postgresql
- SQLite vs PostgreSQL 对比: https://www.prisma.io/docs/orm/overview/databases

---

### 决策 4: API StorageAdapter 渐进迁移策略

**选择**: 三阶段渐进迁移

**阶段 1: 双写模式（开发阶段）**
```
用户操作 → ApiStorageAdapter → 写 API + 写 localStorage
```
- 同时写入 API 和 localStorage
- 优先从 API 读取（如果可用），否则 fallback localStorage
- 开发环境验证 API 正确性

**阶段 2: 强制读 API（功能验证完成后）**
```
用户操作 → ApiStorageAdapter → 写 API
读取 → ApiStorageAdapter → 读 API（不再读 localStorage）
```
- 所有操作走 API
- localStorage 作为备份数据源（仅用于历史数据迁移）

**阶段 3: 数据迁移 + 清理**
```
将 localStorage 中的历史数据批量迁移到服务端
完成后删除 localStorage 相关代码（可选）
```

**理由**: 避免一次性切换导致数据丢失风险。渐进式迁移确保每一阶段都能回滚。

---

### 决策 5: Request/Response Validation 使用 Zod

**选择**: `zod@3.x`

**理由**:
- 与 Fastify 生态无缝集成
- TypeScript 推断类型，比 JSON Schema 更易读
- 比 Yup 更小更快
- StorageAdapter 接口的参数天然适合 zod schema

**工具文档**:
- Zod 官方: https://zod.dev/
- Zod GitHub: https://github.com/colinhacks/zod
- Fastify + Zod 集成示例: https://fastify.dev/ecosystem/

**替代方案**:
- `@sinclair/typebox`: 与 Fastify 原生兼容，但 zod 更流行
- JSON Schema: Fastify 原生支持，但过于冗长

---

### 决策 6: CORS 使用 @fastify/cors

**选择**: `@fastify/cors`

**理由**:
- Fastify 官方插件，与 Fastify 5 兼容
- 开发环境允许所有来源（`origin: true`）
- 生产环境配置允许的前端域名列表

**工具文档**:
- @fastify/cors: https://github.com/fastify/fastify-cors
- CORS 机制: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

### 决策 7: 服务端入口点使用 tsx 热重载

**选择**: `tsx` 运行 TypeScript 文件 + `tsx watch`

**理由**:
- 无需编译，直接运行 `.ts` 文件
- 支持 ESM 和 CommonJS 混合
- 比 `ts-node` 更快
- 与 Fastify 原生 TypeScript 支持配合良好

**工具文档**:
- tsx 官方: https://github.com/privatenumber/tsx
- Node.js ESM: https://nodejs.org/api/esm.html

**替代方案**:
- `tsx watch`: 简洁，支持热重载
- `tsx --watch` + `node --watch`: 更细粒度但配置复杂

---

## Data Model

### Prisma Schema 设计

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String   // bcrypt 哈希
  workflows Workflow[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Workflow {
  id          String   @id @default(cuid())
  name        String
  description String?
  version     String   @default("1.0.0")
  status     WorkflowStatus @default(DRAFT)
  category   String?

  // 存储工作流的完整 JSON 内容
  content    String   // 序列化的 Workflow JSON

  userId     String
  user       User     @relation(fields: [userId], references: [id])

  // 元数据
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // 发布状态
  publishedAt DateTime?
  published   PublishedWorkflow?

  @@index([userId])
  @@index([status])
}

model PublishedWorkflow {
  id          String   @id @default(cuid())
  workflowId  String   @unique
  workflow    Workflow @relation(fields: [workflowId], references: [id])

  // 发布的完整配置
  content     String   // 序列化的 PublishedWorkflow JSON

  publishedBy String?
  publishedAt DateTime @default(now())
}

enum WorkflowStatus {
  DRAFT
  PUBLISHED
}
```

### 字段映射

| Prisma Model | 存储内容 | 对应 localStorage Key |
|---|---|---|
| `Workflow.content` | 序列化 `Workflow` JSON | `prism:workflow:{id}` |
| `Workflow` (元数据) | id, name, version, status 等 | `prism:meta:{id}` |
| `Workflow[]` | 所有 workflow ids | `prism:workflows` index |
| `PublishedWorkflow.content` | 序列化 `PublishedWorkflow` JSON | `prism:published:{sourceId}` |

## API Endpoints

### Auth Routes (占位，供后续提案扩展)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | 用户注册（future） |
| POST | `/api/auth/login` | 用户登录（future） |

### Workflow Routes

| Method | Path | Description | StorageAdapter 方法 |
|---|---|---|---|
| GET | `/api/workflows` | 列表（支持分页、搜索） | `list()` |
| POST | `/api/workflows` | 创建工作流 | `createWorkflow()` |
| GET | `/api/workflows/:id` | 详情 | `load()` |
| PUT | `/api/workflows/:id` | 更新 | `save()` |
| DELETE | `/api/workflows/:id` | 删除 | `delete()` |
| POST | `/api/workflows/import` | 导入 JSON | `importFromJson()` |
| GET | `/api/workflows/:id/export` | 导出 JSON | `exportToJson()` |
| PATCH | `/api/workflows/:id/meta` | 更新元数据 | `updateWorkflowMeta()` |

### Published Workflow Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/published` | 列表已发布的工作流 |
| GET | `/api/published/:id` | 详情 |
| POST | `/api/published` | 发布工作流 |
| DELETE | `/api/published/:id` | 取消发布 |

## Project Structure

```
prism-editor/
├── server/
│   ├── src/
│   │   ├── index.ts           # 服务端入口
│   │   ├── app.ts             # Fastify 实例配置
│   │   ├── db/
│   │   │   └── client.ts      # Prisma Client 单例
│   │   ├── routes/
│   │   │   ├── workflow.ts    # 工作流 CRUD 路由
│   │   │   └── published.ts  # 发布工作流路由
│   │   ├── schemas/
│   │   │   ├── workflow.ts   # Zod schemas
│   │   │   └── published.ts
│   │   └── middleware/
│   │       └── auth.ts        # 占位：后续添加 auth
│   ├── prisma/
│   │   ├── schema.prisma      # 数据模型
│   │   └── dev.db            # SQLite 数据库文件
│   ├── package.json
│   └── tsconfig.json
├── apps/
│   ├── dev-tool/
│   │   └── src/storage/
│   │       ├── ApiStorageAdapter.ts  # 新增
│   │       └── index.ts              # 导出切换
│   └── user-app/
│       └── src/storage/
│           ├── ApiStorageAdapter.ts  # 新增
│           └── index.ts
└── packages/
    └── shared-types/
        └── src/
            └── storage.ts     # 扩展 API 相关类型
```

## Migration Plan

### Phase 1: 服务端骨架 (Week 1)
1. 初始化 `server/` 目录和 `package.json`
2. 配置 Prisma schema 和 SQLite 数据库
3. 实现基础的 workflow CRUD routes
4. 启动脚本验证

### Phase 2: API 完整实现 (Week 2)
1. 实现所有 API endpoints
2. 添加 Zod validation
3. 实现 CORS 配置
4. 测试 API endpoints

### Phase 3: 前端存储层 (Week 3)
1. 创建 `ApiStorageAdapter` 实现 `StorageAdapter` 接口
2. 在 dev-tool 入口切换存储适配器
3. 实现双写策略
4. 验证数据一致性

### Phase 4: User App 适配 (Week 4)
1. User App 切换到 `ApiStorageAdapter`
2. 移除 BroadcastChannel（改为服务端推送）
3. 端到端测试
4. 部署到 staging

### Rollback Strategy
- 每个 phase 完成后可独立回滚
- Phase 3/4 回滚：切换回 `LocalStorageAdapter`
- Phase 1/2 回滚：停止服务端，前端无感知

## Risks / Trade-offs

[Risk] SQLite 并发写入限制
→ Mitigation: 开发环境够用，生产环境迁移到 PostgreSQL，Prisma schema 无需改动

[Risk] 一次性删除 localStorage 可能导致历史数据丢失
→ Mitigation: 分三阶段迁移，每个阶段都有 localStorage fallback

[Risk] API 延迟影响用户体验（相比 localStorage 同步读取）
→ Mitigation: 实现乐观更新 UI，失败时回滚；关键操作保持同步

[Risk] 多人同时编辑同一工作流（无乐观锁）
→ Mitigation: 基础版不加并发控制，后续提案添加版本号/ETag 支持

[Risk] CORS 配置错误导致 API 无法访问
→ Mitigation: 开发环境设置 `origin: true`，生产环境使用白名单

## Open Questions

1. **用户认证放在哪个提案？** 本提案不含 auth，建议单独提案 `user-auth-system`，依赖本提案。
2. **published workflow 的 API 是否需要单独服务？** 当前设计放在同一服务中，如果规模扩大可拆分为 `workflow-service` 和 `publish-service`。
3. **工作流内容（`Workflow.content`）存储为 JSON string 还是 PostgreSQL JSONB？** 当前用 SQLite，所以存为 string。迁移到 PostgreSQL 后可改为 JSONB 获得更好的查询能力。
4. **是否需要实现服务端缓存（如 Redis）？** 10万用户级别 SQLite + Prisma 缓存足够，暂不考虑。
5. **Dev Tool 和 User App 是否共用同一个 API？** 是，共用 `server/` 服务，通过不同的 token 区分用户角色。
