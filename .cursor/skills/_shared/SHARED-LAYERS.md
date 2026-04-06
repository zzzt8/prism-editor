---
name: _shared-layers
description: OpenSpec Skill 共享层：layer 映射、验证命令、增量测试策略。所有 openspec-* skill 必须引用此文件。
---

## Layer 映射

| layer | 路径 | 说明 |
|-------|------|------|
| `engine` | `packages/workflow-core/`, `packages/image-ops/`, `packages/node-definitions/` | 工作流执行引擎、图像操作、节点定义 |
| `backend` | `server/`, `server/prisma/` | Fastify API、Prisma ORM、SQLite |
| `editor` | `apps/dev-tool/` | 开发者工具 UI |
| `runtime` | `apps/user-app/` | 终端用户运行时 |
| `ui-skin` | `packages/shared-ui/` | 设计系统和共享 UI 组件 |

## 验证命令参考

### 全量验证

```bash
# 类型检查（全量，较慢）
pnpm typecheck

# 全量测试（较慢）
pnpm test
```

### 按 layer 增量验证

```bash
# engine layer
pnpm typecheck --filter=@prism/workflow-core --filter=@prism/image-ops --filter=@prism/node-definitions
pnpm test --filter=@prism/workflow-core
pnpm test --filter=@prism/image-ops

# backend layer
pnpm typecheck --filter=@prism/server
pnpm test --filter=@prism/server
pnpm --filter=@prism/server exec prisma migrate status

# editor layer
pnpm typecheck --filter=@prism/dev-tool
pnpm test --filter=@prism/dev-tool
pnpm build --filter=@prism/dev-tool --dry-run

# runtime layer
pnpm typecheck --filter=@prism/user-app
pnpm test --filter=@prism/user-app

# ui-skin layer
pnpm typecheck --filter=@prism/shared-ui
```

## 增量测试策略

> 目的：避免每次改动都跑全量测试，在正确性和速度之间取得平衡。

**决策树：**

```
改动涉及哪些文件？
│
├─ 只改 packages/workflow-core/
│    └─ pnpm test --filter=@prism/workflow-core
│
├─ 只改 packages/image-ops/
│    └─ pnpm test --filter=@prism/image-ops
│
├─ 只改 server/prisma/ 或 server/src/
│    └─ pnpm test --filter=@prism/server
│    └─ pnpm --filter=@prism/server exec prisma migrate status
│
├─ 只改 apps/dev-tool/
│    └─ pnpm typecheck --filter=@prism/dev-tool
│    └─ pnpm build --filter=@prism/dev-tool
│
├─ 跨多个 layer
│    └─ 按 layer 优先级分别验证（见各 Skill 的执行流程）
│
└─ 无法判断改动范围
     └─ 回退全量验证
```

**增量原则：**
- 单个文件/单层改动 → 优先增量测试
- 跨层或复杂改动 → 按 layer 优先级逐步验证
- 无法判断 → 全量验证（宁可慢，不要漏）

## Prisma / 数据库环境检查

> 本项目使用 Fastify + Prisma + SQLite，以下命令用于验证数据库环境健康状态。

```bash
# 检查 Prisma Client 是否已生成
ls server/node_modules/.prisma/client/

# 检查数据库文件是否存在
ls server/prisma/*.db

# 检查 Prisma schema 是否同步
pnpm --filter=@prism/server exec prisma migrate status

# 重新生成 Prisma Client（如遇类型错误）
pnpm --filter=@prism/server exec prisma generate

# 环境变量检查
cat server/.env
```

**常见数据库问题及修复：**

| 症状 | 诊断命令 | 修复方案 |
|------|----------|----------|
| `Cannot find module '@prisma/client'` | `pnpm --filter=@prism/server exec prisma generate` | 重新生成 Prisma Client |
| `Can't open database` | `ls server/prisma/*.db` | 运行 `pnpm --filter=@prism/server exec prisma migrate dev` |
| `Migration missing` | `pnpm --filter=@prism/server exec prisma migrate status` | 确认 migration 历史一致 |
| `.env` 缺失 | `cat server/.env` | 复制 `.env.example` 并填写变量 |
