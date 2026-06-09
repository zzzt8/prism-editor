---
name: openspec-apply
description: 执行 OpenSpec change 的 tasks。断点续传，增量验证。
version: "4.0"
category: apply
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-apply
depends_on:
  - openspec-propose
verify:
  - typecheck
---

> **前置共享片段：** layer 映射、验证命令见 [\_shared/SHARED-LAYERS.md](../../_shared/SHARED-LAYERS.md)。

## 状态

只读 `tasks.md` checkbox：`-[ ]` = todo，`-[x]` = done。不读 tasks-state.json。

## 执行路径分支

读取 `openspec/changes/<name>/.openspec.yaml`，获取 `change_class`（在 `schema:` 字段下），决定执行路径：

| change_class | 执行路径 |
|---|---|
| `low` | Fast 路径（见下方） |
| `medium` / `high` | Standard 路径（当前 7 步循环） |

### Fast 路径（low）

- 不做 layer 优先级排序，按 tasks.md 顺序执行
- 不做 logical commit 分组，每完成 1-2 个 task commit 一次（同类改动合组）
- 不做增量验证（跳过"单个 task 执行循环"第 5 步"增量验证"）
- 改为"快速检查"：每 2 个 task commit 后跑 `pnpm typecheck`，失败才停
- commit message 仍用 `task: <id>` 格式
- 全量验证同 Standard 路径

## 收集可执行 tasks

### Standard 路径额外步骤：预验证（resume 时）

如果 change 之前执行过（存在已完成 commit），resume 进入 Standard 路径时：

1. 读 tasks.md，收集所有 `[x]` 的 task
2. 对每个 `[x]` task，尝试重新运行其 verify 命令：
   - `grep "console\.log"` 类 → 确认无残留
   - 文件字段存在性 → 用 grep/find 确认
   - 不可自动验证的项 → 跳过（信任 checkbox）
3. verify 通过 → 信任 checkbox，继续
4. verify 失败 → 标记回 `[ ]`，记入摘要 "T1 验收未通过，已重置"

### 执行

从 tasks.md 收集所有 `-[ ]` 的 task，逐个检查依赖：

- `type: task` 依赖未 `-[x]` → 跳过，记为 blocked
- `type: change` 依赖未 completed → 跳过，记为 blocked

剩余可执行 tasks 按以下顺序：

1. 优先执行有依赖的 task（dep 非空的优先）
2. 其余按 layer 优先级排序（建议，非强制）：

   ```
   engine > backend > editor > runtime > ui-skin > meta
   ```
3. 同 layer 按 task id 字母序。

## 批量分组（logical commit）

相邻的同类改动可以一次 commit。判断标准：

- **允许合组**：同一文件的多个改动、相邻文件的同类改动（同一 task 内自然产生）
- **强制分开**：不同 layer 的改动必须分开 commit

合组后一个 commit 对应多个 task checkbox 都更新。**不得把无关改动合到一个 commit 里**。

## 单个 task 执行循环

对于每个可执行的 task：

```
1. 确认目标
   - 读 task 的 opsx-meta 块：layer、verify
   - 读 task 描述和验收标准
   - 读文件路径（task 描述中应有相对 repo root 的路径）

2. 定位代码
   - 按 task 描述中的文件路径直接定位
   - 路径不存在 → 用 grep 搜关键字 → 最多读 5 个匹配文件
   - 搜不到 → 进入 Blocked 策略

3. 修改代码
   - 用 str_replace 做修改
   - 不要大段重写，只改最小相关区域

3.5 选择 ECC lane（推荐，复杂 task 必做）
   - 读 task 标题、layer、verify、目标路径
   - 依据 `ecc-openspec-bridge` 确定 lane
   - 记录一句：`ECC lane = <lane>`
   - 后续实现与验证遵循该 lane 的 SOP

4. 提交
   - git add -A
   - git commit -m "task: <id> <一句话描述>"
   - 不得跳过 commit（没有 commit 就没法 git diff）

5. 更新 checkbox
   - tasks.md 中 `- [ ] <id>` → `- [x] <id>`
   - 不要改其他 checkbox
```

## Layer 级别自动冒烟

> 每个 layer 的 task 全部完成后，立即跑该 layer 的 smoke test。
> 失败则停在该 layer，进入 Failure-Handling。不等待所有 layer 跑完才发现问题。

### Layer Smoke 命令映射

| Layer | Smoke 命令 |
|-------|-----------|
| engine | `pnpm typecheck --filter=@prism/workflow-core --filter=@prism/image-ops --filter=@prism/node-definitions --filter=@prism/core && pnpm test --filter=@prism/workflow-core --run && pnpm test --filter=@prism/image-ops --run` |
| backend | `pnpm typecheck --filter=@prism/server && pnpm test --filter=@prism/server --run` |
| editor | `pnpm typecheck --filter=@prism/dev-tool` |
| runtime | `pnpm typecheck --filter=@prism/user-app` |
| ui-skin | `pnpm typecheck --filter=@prism/shared-ui` |
| meta | 无需 smoke（typecheck 已覆盖） |

### 判断当前 layer 何时完成

- 每完成一个 task commit 后，检查 tasks.md 中该 layer 剩余 `-[ ]` 的 task 数量
- 剩余 0 个 → 该 layer 完成，触发 smoke test
- 如果当前 task 是最后一个待 commit 的，且剩余 task 全部是 blocked（依赖未满足）→ 也触发 smoke test

### 失败策略

- smoke 失败 → 输出失败命令 + 报错摘要，停在当前 layer
- Agent 自动进入 Failure-Handling：定位错误文件，修复，commit，retry smoke
- retry 通过 → 继续下一个 layer
- retry 失败 2 次 → 停止，报告具体问题

## 验证命令 fallback

> turbo 不可用时 fallback 命令见 [SHARED-LAYERS.md - turbo fallback](../../_shared/SHARED-LAYERS.md#turbo-fallback)。
> 不得在 skill 内联重复。权威来源唯一。

## 全量验证

所有 layer smoke 通过后，执行全量验证：

```bash
pnpm typecheck && pnpm test --run
```

- 通过 → apply 完成
- 失败 → 进入 Failure-Handling

## Blocked 策略

根据 blocked 原因决定动作：

| 原因 | 动作 |
|------|------|
| **依赖未满足**（T2 未完成，T3 跳） | 跳过，记入摘要。继续执行不依赖它的 tasks。 |
| **无法定位目标**（路径/关键字搜不到） | **停下来**，告诉用户"找不到目标，请确认文件路径"。不更新 checkbox。 |

## Failure-Handling

**typecheck 失败？**
- 读报错信息，定位到文件和行，修复类型错误，commit，回到该 layer 的 smoke 重试

**test 失败？**
- 失败测试在本次改动的文件中 → related：修复代码，commit，重跑该 layer 的 smoke
- 失败测试不在本次改动的文件中 → unrelated：记录，归因完成，继续下一个 layer
- 无法判断 → 输出警告，继续（不阻断 archive）

## 完成后输出摘要

```markdown
## Apply 完成

- 完成：T1, T2, T3
- 跳过（blocked）：T4（T2 未完成）
- Layer smoke：engine ✓ / backend ✓ / editor ✓
- 全量验证：通过 / 失败
```
