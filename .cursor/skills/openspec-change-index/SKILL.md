---
name: openspec-change-index
description: 从 meta-change 的 change-index.md 批量派生子 change，所有子 change 均创建在 meta-change 的目录下，目录名带 C# 编号前缀（如 C1-mapper-contract）。
---

> **前置共享片段：** layer 映射见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## 核心约束

- **所有子 change 必须创建在 meta-change 的目录下**，目录命名格式：`C#-<change-name>`（编号保留自 change-index）
- 例如 meta-change 为 `architecture-convergence`，子 change 应为：
  - `architecture-convergence/C1-mapper-contract/`
  - `architecture-convergence/C2-repository-layer/`
  - `architecture-convergence/C3-canvas-store-slices/`
  - ...以此类推
- 子 change 文件内的标题也需保留 C# 编号（如 `# C1: Mapper 契约定义`）

## 核心职责

- 读取 meta-change 的 `change-index.md`
- 按用户选择过滤（全部 / 仅 P0 / Phase 范围 / 跳过 blocked）
- 批量创建子 change（调用 `openspec new change <name>`）
- 为每个子 change 生成标准 artifacts（proposal / design / tasks），复用 meta-change 的 repo-analysis
- 显示创建摘要

## 前置条件

- 必须存在一个已完成的 meta-change
- 该 meta-change 下必须有 `change-index.md`
- 所有子 change 的 `depends_on` 必须在 change-index 中存在

## 执行流程

### 1. 确认 meta-change 名称

如果用户在命令中未指定 meta-change 名称：
- 列出所有包含 `change-index.md` 的 active changes
- 供用户选择

### 2. 读取 change-index.md

```bash
openspec instructions apply --change "<meta-change-name>" --json
```

Fallback：
```bash
cat openspec/changes/<meta-change-name>/change-index.md
```

### 3. 解析并过滤

读取 change-index.md，按以下条件过滤：

| 过滤条件 | 效果 |
|---------|------|
| `--all` | 创建全部子 change（按依赖顺序） |
| `--priority P0` | 只创建 P0 优先级的 change |
| `--phase 1` | 只创建 Phase 1 的 change |
| `--no-blocked` | 跳过 `blocked_by` 未满足的 change |
| `--skip C3` | 跳过指定 change |

**依赖拓扑排序：**
- 按 `depends_on` 关系拓扑排序，确保依赖在前、被依赖在后
- 如果有循环依赖 → 报错并指出哪个 change 形成循环

### 4. 批量创建子 change（在同一 meta-change 目录下）

按拓扑顺序依次执行：

```bash
# 对于每个子 change（按依赖顺序）
# 子 change 目录名格式：C#-<change-name>，放在 meta-change 目录下
mkdir -p openspec/changes/<meta-change>/C1-mapper-contract
mkdir -p openspec/changes/<meta-change>/C2-repository-layer
mkdir -p openspec/changes/<meta-change>/C3-canvas-store-slices
...
```

例如 meta-change 为 `architecture-convergence`：
```
openspec/changes/architecture-convergence/C1-mapper-contract/
openspec/changes/architecture-convergence/C2-repository-layer/
openspec/changes/architecture-convergence/C3-canvas-store-slices/
openspec/changes/architecture-convergence/C4-published-workflow-v2/
openspec/changes/architecture-convergence/C5-user-app-store-split/
openspec/changes/architecture-convergence/C6-version-server-side/
openspec/changes/architecture-convergence/C7-node-package-security/
openspec/changes/architecture-convergence/C8-worker-offload/
openspec/changes/architecture-convergence/C9-docs-cleanup/
```

### 5. 为每个子 change 生成 artifacts

每个子 change 复用 meta-change 的全局 `repo-analysis.md`：

**proposal.md**：
- goal / what changes / impact
- **关键**：从 change-index 的 `reason` 字段继承过来
- 标注"派生自 meta-change: `<meta-name>`"

**design.md**：
- 按 change-index 的 scope 范围聚焦
- **关键**：引用 meta-change 的 design.md 中的拆分原则
- 如果涉及协议变更，引用 meta-change 中定义的协议

**tasks.md**：
- 按 change-index 的 scope 和 layer 生成 implementation tasks
- 每个 task 带 `<!-- opsx-meta -->` 块
- 如果有 `depends_on`，在 tasks.md 顶部注明前置 change

**重要**：`tasks.md` 中**不重复**做 repo-analysis，改为引用：
```markdown
> **Repo Analysis**：见 [`<meta-change>/repo-analysis.md`](../../<meta-change>/repo-analysis.md)
```

### 6. 显示创建摘要

```
## Change Index Execution Summary

Meta-change: <meta-name>
Changes created: N
Changes skipped: N (blocked / filtered)
Execution order: C1 → C3 → C2 → ...

| Change | Layer | Priority | Status | Depends On |
|--------|-------|----------|--------|-----------|
| C1 | engine, backend | P0 | active | none |
| C2 | editor | P1 | active | C1 |
| C3 | runtime | P2 | active | none |

下一步：
- 对每个 active change 运行 /opsx-apply 开始实现
- 使用 /opsx-batch-apply 可自动按依赖顺序批量 apply
```

## 批量派生的自动化空间

本 skill 为以下自动化能力奠定基础（可后续扩展）：

| 能力 | 描述 |
|------|------|
| `/opsx-batch-apply` | 按 change-index 依赖顺序自动执行所有子 change 的 apply |
| `/opsx-batch-verify` | 批量 verify 所有子 change |
| `/opsx-plan-summary` | 从 change-index 生成项目级甘特图/时间线 |
| `/opsx-index-sync` | 当 meta-change 变更时，同步更新所有子 change |

## Guardrails

- **强制**按依赖拓扑顺序创建子 change
- **强制**所有子 change 创建在 meta-change 的目录下，目录名带 `C#-` 前缀
- **强制**检测并报错循环依赖
- **强制**每个子 change 的 tasks.md 引用 meta repo-analysis（不复扫）
- **禁止**创建不在 change-index 中的 change
- **禁止**在子 change 的 design.md 中违背 meta-change 的拆分原则
- **强制**blocked_by 未满足时提示用户，并提供 `--force` 覆盖选项
