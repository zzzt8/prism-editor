# Cursor AI Skills

> This folder contains AI agent skills for the Prism Editor project.
> These skills guide the Cursor AI agent to work with the project's
> OpenSpec-based development workflow and ECC bridge.

## Structure

```
.cursor/skills/
├── _shared/
│   ├── SHARED-LAYERS.md            # Layer mapping, validation commands
│   ├── SKILL-INDEX.md              # Auto-generated skill index
│   ├── SKILL-SCHEMA.md             # Metadata schema definition
│   └── generate-skill-index.js     # Index generation script
├── openspec-quick/                 # Lightweight quick task execution
├── openspec-explore/               # Explore codebase structure
├── openspec-propose/               # Create a new change with artifacts
├── openspec-apply/                 # Execute tasks with incremental verification
├── openspec-verify/                # Verify implementation consistency
├── openspec-archive/               # Archive completed changes
├── ecc-openspec-bridge/            # OpenSpec → ECC lane routing
├── ecc-api-design/                 # API / contract / schema lane
├── ecc-tdd-workflow/               # Test-first / feature lane
└── ecc-build-error-resolver/       # build / typecheck / lint / CI repair lane
```

## Skills Overview

### OpenSpec 主流程

| Skill | Purpose |
|-------|---------|
| `openspec-quick` | 轻量任务：Quick Gate → 自动选 ECC lane → 最小实现 + 验证 |
| `openspec-explore` | 探索代码库结构 |
| `openspec-propose` | 创建新 change + artifacts；`change_class` 触发 review / 测试模板 |
| `openspec-apply` | 按 tasks.md checkbox 执行 + 增量验证；failure-handling 诊断 |
| `openspec-verify` | 验证实现一致性（Full + coherence-lite） |
| `openspec-archive` | 归档完成的 change |

### ECC 增强

| Skill | Purpose |
|-------|---------|
| `ecc-openspec-bridge` | 在 apply / verify 阶段按 `task_type` 路由到 ECC lane |
| `ecc-api-design` | API / schema / contract lane（接口先定，实现其次） |
| `ecc-tdd-workflow` | 测试优先 / feature lane（先红→绿→重构） |
| `ecc-build-error-resolver` | build / typecheck / lint / CI 故障 lane（按错误输出最小迭代修复） |

## OpenSpec 与 ECC 协同

OpenSpec 是主流程，ECC 是增强层：

- **OpenSpec** 管理 change 生命周期（proposal / design / tasks / verify / archive）
- **ECC** 只增强 `apply` / `verify` 阶段，不替代 proposal artifacts
- **`task_type` 是路由锚点**：在 `tasks.md` 显式标注可让 `ecc-openspec-bridge` 精准路由

### 桥接命令

- `/opsx-ecc-apply`：执行 `openspec-apply`，按 `task_type` 或 fallback 规则映射到 ECC lane
- `/opsx-ecc-verify`：执行 `openspec-verify`，追加 ECC 风格的 review / failure attribution
- `/ecc-api-design`、`/ecc-tdd-workflow`、`/ecc-build-error-resolver`：手动执行单 lane

### 推荐使用场景

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
`/opsx-*` and `/ecc-*` commands in Cursor (e.g., `/opsx-verify`, `/ecc-api-design`).

See the OpenSpec documentation in `openspec/` for the full workflow.
