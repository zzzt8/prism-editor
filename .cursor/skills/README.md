# Cursor AI Skills

> This folder contains AI agent skills for the Prism Editor project.
> These skills guide the Cursor AI agent to work with the project's
> OpenSpec-based development workflow.

## Structure

```
.cursor/skills/
├── _shared/
│   ├── SHARED-LAYERS.md       # Layer mapping, validation commands
│   ├── SKILL-INDEX.md         # Auto-generated skill index
│   ├── SKILL-SCHEMA.md        # Metadata schema definition
│   └── generate-skill-index.js # Index generation script
├── openspec-explore/           # Explore codebase structure
├── openspec-propose/          # Create a new change with artifacts
├── openspec-apply/            # Execute tasks with incremental verification
├── openspec-verify/           # Verify implementation consistency
└── openspec-archive/          # Archive completed changes
```

## Skills Overview

| Skill | Purpose |
|-------|---------|
| `openspec-explore` | Explore codebase structure |
| `openspec-propose` | Create a new change with artifacts; change_class triggers templates |
| `openspec-apply` | Execute tasks with incremental verification; checkbox-based checkpointing |
| `openspec-verify` | Verify implementation consistency (Full + coherence-lite) |
| `openspec-archive` | Archive completed changes |

## 适配 ECC Bridge

本项目在保留 OpenSpec 主流程的基础上，额外提供 `ecc-openspec-bridge`：

- `/opsx-ecc-apply`：执行 `openspec-apply`，并按 `task_type` 或 fallback 规则映射到 ECC lane
- `/opsx-ecc-verify`：执行 `openspec-verify`，并追加 ECC 风格的 review / failure attribution
- `/ecc-api-design`：手动执行 API / contract / schema lane
- `/ecc-tdd-workflow`：手动执行测试优先 / feature lane
- `/ecc-build-error-resolver`：手动执行 build / typecheck / lint / CI 修复 lane

推荐在以下场景使用 ECC Bridge：
- API / schema / contract 变更
- 测试优先或断言修复
- build / type / lint / CI 故障处理
- 安全、认证、输入校验
- 关键 UI 主链路与 E2E 验证
- 高风险架构任务先拆 lane 再 apply

推荐在新的 `tasks.md` 中显式写 `opsx-meta.task_type`，减少自动推断噪音。

See `.cursor/skills/ecc-openspec-bridge/SKILL.md` for routing rules.

## Usage

When working in this project, the Cursor AI agent will automatically
read and follow these skill files. You can invoke them via the
`/opsx-*` commands in Cursor (e.g., `/opsx-verify`).

See the OpenSpec documentation in `openspec/` for the full workflow.
