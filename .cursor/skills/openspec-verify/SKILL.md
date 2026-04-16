---
name: openspec-verify
description: 验证 OpenSpec change 的实现一致性 — Full 验证 + coherence-lite checklist。
version: "3.1"
category: verify
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-verify
depends_on:
  - openspec-apply
permissions: []
risks: []
verify:
  - typecheck
---

> **前置共享片段：** layer 映射、验证命令见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## 核心原则

**verify 只做检查，不做修复。** 检查发现的问题由 `openspec-apply` 修复后重新 verify。

```
apply 负责：执行 + Incremental 验证（每 task 完成后立即运行）
verify 负责：Full 验证 + coherence-lite 检查（系统性检查）
                 ↓
           发现问题 → 返回 apply 修复 → 重新 verify
```

## 状态读取

> **v3.0 变更：** 状态以 tasks.md checkbox 为主，tasks-state.json 仅作兼容参考。

读取 `openspec/changes/<name>/tasks.md` 中的 checkbox 状态：
- `- [ ]` → todo
- `- [x]` → done

## 两阶段概述

> Incremental 验证在 apply 阶段完成；verify 阶段只执行 Full + coherence-lite。

| 阶段 | 执行内容 | 目标 |
|------|----------|------|
| **Full** | 全量 typecheck + test | 确保无回归 |
| **coherence-lite** | 问答 checklist + Traceability Map | 验证实现与设计一致 |

## 执行流程

### 1. 选择 change

```bash
openspec status --change "<name>" --json
```

### 2. 读取任务状态

读取 `openspec/changes/<name>/tasks.md` 中的 checkbox：
- 扫描所有 `- [ ]` 和 `- [x]`
- 如 tasks-state.json 存在，读取作为兼容参考（冲突时以 checkbox 为准）

### 3. Full 验证

> Full 验证由 `openspec-apply` skill 在所有 tasks 完成后自动触发。
> 如果 apply 阶段已输出 Test Failure Attribution，verify 从 Step 4 开始。
> 如果 apply 阶段未完成归因，必须在此重新完成。

```bash
pnpm typecheck
pnpm test
```

**Full 验证通过标准：**
- 类型检查全部通过
- 所有测试通过

**测试失败归因（必须输出）：**

```markdown
## Test Failure Attribution（verify 阶段）

**apply 阶段归因状态**：已归因 / 未归因 / 部分归因

**本次 Full 验证测试失败归因：**
| 失败测试 | git diff 覆盖？ | pre-existing？ | 已知 flaky？ | 归因级别 |
|---------|---------------|---------------|-------------|---------|
| [TC-xxx] | 是/否 | 是/否/未知 | 是/否 | related / unrelated_proven / flaky_proven / undetermined |

**验证结论：**
- 全部归因完成且无 `related`/`undetermined` → 继续 coherence-lite
- 存在 `related` → 输出"发现 N 个相关测试失败，必须修复后重新 verify"
- 存在 `undetermined` → **硬关卡：禁止给出"可以 archive"结论**，要求用户确认
```

### 4. Full 元数据检查

读取 `openspec/changes/<name>/tasks.md`：

**检查项：**

| 检查项 | 标准 |
|--------|------|
| 所有 task | tasks.md 中 checkbox 全部为 `- [x]` |
| change_class | proposal 顶部必须有 change_class 和 reason |
| 测试设计 | change_class=high 时必须有独立测试章节；change_class=low 时测试并入 tasks 验证命令 |

**Task 静态元数据格式检查：**

| 检查项 | 标准 |
|--------|------|
| `id` 唯一性 | 所有 task 的 id 不能重复 |
| `layer` 有效性 | 必须是 engine / backend / editor / runtime / ui-skin / meta |
| `verify` 取值 | 必须是 unit-tests / golden-fixture / api-tests / smoke-test / visual-check |
| `dependencies` 格式 | type 必须是 task 或 change，refs 是数组 |

### 5. coherence-lite 检查

> **v3.0 变更：** 三阶段简化为 coherence-lite（问答 checklist + Traceability Map），并入 Full verify。

**第一轨 — 问答式 checklist（轻量）：**

```markdown
## Coherence Check
> 轻量级一致性检查

- [ ] tasks.md 中每个已完成 task 是否有对应的代码改动？
- [ ] design.md 中的关键技术决策是否在代码中得到体现？
- [ ] specs/ 中的 ADDED / MODIFIED 语义是否有对应的实现？
```

**第二轨 — 最小可执行映射（避免流于口头）：**

```markdown
## Traceability Map
> 从 goal 到 code 的最小可执行核对

| Proposal Goal | Design Decision | Task | Code/Test | 测试状态 |
|--------------|-----------------|------|-----------|---------|
| [goal-1] | [decision-1] | T1 | [file:func] | ✓ / ✗ / N/A |
| [goal-2] | [decision-2] | T2 | [file:func] | ✓ / ✗ / N/A |

自动核对规则（可执行）：
- 是否存在 goal 无对应 design decision？
- 是否存在 design decision 无对应 task？
- 是否存在 task 无对应代码文件？
- **是否存在已完成 task 但相关测试失败且未归因？**
```

**新增 coherence-lite 核对项：**

```markdown
## Cross-Artifact Trace Check

- [ ] explore 阶段的 Task Anchor 声明是否与 proposal 主题一致？
- [ ] propose 阶段的 Anchor Echo 是否在 artifacts 中有对应体现？
- [ ] apply 阶段的 Test Failure Attribution 是否有完整的归因记录？
- [ ] 是否存在越权（explore/propose/verify 阶段发生代码变更）但未报告？
```

**高风险 change 的 coherence-lite 额外检查：**

> change_class = high 时额外执行：

```markdown
## High-Risk Traceability
> 适用于 change_class = high

- [ ] 是否存在 specs 改了但没有对应 task？
- [ ] 是否存在 design 提到的关键路径但代码没有落点？
- [ ] 是否存在已完成 task 却未合并到主分支的代码？
```

### 6. 输出结果

```markdown
## Verify Result

| 检查项 | 状态 | 详情 |
|--------|------|------|
| Full 元数据检查 | ✓/✗ | N/N tasks done |
| Full 验证 | ✓/✗ | typecheck + test passed, N errors |
| **Test Failure Attribution** | ✓/✗/阻断 | N/N 已归因，N 个 undetermined |
| Coherence Check | ✓/✗ | N/N consistency checks passed |
| Traceability | ✓/✗ | N/N goals traceable |
| Cross-Artifact Trace | ✓/✗ | Anchor 声明一致，无越权未报 |

发现的问题：
1. [归因] T2: 4 个测试失败，2 个 undetermined，禁止 archive
2. [越权] apply 阶段在某 task 执行中有非预期文件变更

下一步：
- 全部通过 → 可以 archive
- 有归因阻断 → 必须修复后重新 verify
- 有越权未报 → 要求用户确认越权原因
```

## Guardrails

- **强制**在 archive 前执行 verify
- **禁止**跳过 verify 直接 archive
- **强制**Full 元数据检查所有 checkbox 已完成
- **强制**coherence-lite 执行 Traceability Map 核对
- **强制**change_class=high 时执行 High-Risk Traceability
- **禁止**在 verify 阶段修复代码，只负责发现问题
- **强制**coherence-lite 失败时返回 apply 修复，不在 verify 阶段尝试修复
- **强制**Full 验证出现测试失败时输出 Test Failure Attribution
- **强制**归因结论必须包含具体证据（git diff / pre-existing baseline / flaky 历史）
- **强制**coherence-lite 中新增 Cross-Artifact Trace Check
- **强制**存在 `undetermined` 时禁止给出"可以 archive"结论
- **强制**verify 阶段发现越权未报时，要求用户确认
