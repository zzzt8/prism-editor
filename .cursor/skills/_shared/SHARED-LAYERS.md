---
name: _shared-layers
description: OpenSpec Skill 共享层：layer 映射、验证命令。所有 openspec-* skill 必须引用此文件。
---

# Shared Layers

## Layer 映射

| layer | 路径 | 说明 |
|-------|------|------|
| `engine` | `packages/workflow-core/`, `packages/image-ops/`, `packages/node-definitions/` | 工作流执行引擎、图像操作、节点定义 |
| `backend` | `server/`, `server/prisma/` | Fastify API、Prisma ORM、SQLite |
| `editor` | `apps/dev-tool/` | 开发者工具 UI |
| `runtime` | `apps/user-app/` | 终端用户运行时 |
| `ui-skin` | `packages/shared-ui/` | 设计系统和共享 UI 组件 |

### Layer 执行优先级

按优先级从高到低执行：

```
engine > backend > editor > runtime > ui-skin > meta
```

---

## 验证命令参考

### 全量验证

```bash
pnpm typecheck
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

# runtime layer
pnpm typecheck --filter=@prism/user-app
pnpm test --filter=@prism/user-app

# ui-skin layer
pnpm typecheck --filter=@prism/shared-ui
```
