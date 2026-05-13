---
name: _shared-layers
description: OpenSpec Skill 共享层：layer 映射、验证命令。所有 openspec-* skill 必须引用此文件。
---

# Shared Layers

## Layer 映射

|| layer | 路径 | 说明 |
|-------|------|------|
| `engine` | `packages/workflow-core/`, `packages/image-ops/`, `packages/node-definitions/`, `packages/core/` | 工作流执行引擎、图像操作、节点定义、核心工具 |
| `backend` | `server/` | Fastify API、Prisma ORM、SQLite |
| `editor` | `apps/dev-tool/` | 开发者工具 UI |
| `runtime` | `apps/user-app/` | 终端用户运行时 |
| `ui-skin` | `packages/shared-ui/`, `packages/shared-types/` | 设计系统、共享类型 |
| `meta` | `.cursor/` | Cursor skills 和 commands |

### Layer 执行优先级

```
engine > backend > editor > runtime > ui-skin > meta
```

---

## 验证命令参考

### 全量验证

```bash
pnpm typecheck && pnpm test
```

### 按 layer 增量验证

```bash
# engine layer
pnpm typecheck --filter=@prism/workflow-core --filter=@prism/image-ops --filter=@prism/node-definitions --filter=@prism/core
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

# meta layer
pnpm typecheck
```

### turbo fallback（turbo 不可用时） {#turbo-fallback}

```bash
# 替换 pnpm test --filter=<package>
pnpm exec vitest run

# 替换 pnpm typecheck --filter=<package>
pnpm exec tsc --noEmit
```

### Smoke Check（全量验证前先跑）

```bash
pnpm exec vitest run --reporter=verbose 2>&1 | head -20
```

- 所有测试被跳过（0 tests collected）且无编译错误 → 测试框架正常
- 报错 canvas native / module not found / 编译错误 → 环境问题，记录后继续
- 有测试文件且 PASSED → 环境正常
