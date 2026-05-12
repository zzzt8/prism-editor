---
name: openspec-apply
description: 执行 OpenSpec change 的 tasks。断点续传，增量验证。
version: "3.3"
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

## 启动检查

顺序执行，有一项失败就停。

```bash
openspec list --json
test -f "openspec/changes/<name>/proposal.md"
test -f "openspec/changes/<name>/design.md"
test -f "openspec/changes/<name>/tasks.md"
```

失败 → 输出缺失的 artifact → 停止。不得自行创建。

## 收集可执行 tasks

从 tasks.md 收集所有 `-[ ]` 的 task，逐个检查依赖：

- `type: task` 依赖未 `-[x]` → 跳过，记为 blocked
- `type: change` 依赖未 completed → 跳过，记为 blocked

剩余可执行 tasks 按 layer 优先级排序：

```
engine > backend > editor > runtime > ui-skin > meta
```

同 layer 按 task id 字母序。

## 单个 task 执行循环

对于每个可执行的 task：

```
1. 确认目标
   - 读 task 的 opsx-meta 块：layer、verify
   - 读 task 描述和验收标准

2. 定位代码
   - 按 task 描述中的文件名直接定位（不从搜索开始）
   - 如果文件名不确定，用 grep 搜关键字 → 最多读 5 个匹配文件
   - 搜不到 → 停下来，告诉用户"找不到目标，请确认文件路径"

3. 修改代码
   - 用 str_replace 做修改
   - 不要大段重写，只改最小相关区域

4. 提交
   - git add -A
   - git commit -m "task: <id> <一句话描述>"
   - 不得跳过 commit（没有 commit 就没法 git diff）

5. 增量验证
   - git diff --name-only HEAD~1
   - 根据改动文件路径判断 layer（见 SHARED-LAYERS.md）
   - 跑对应的验证命令（见 SHARED-LAYERS.md）
   - 验证失败 → 停止，进入 Failure-Handling

6. 更新 checkbox
   - tasks.md 中 `- [ ] <id>` → `- [x] <id>`
   - 不要改其他 checkbox
```

## 全量验证（所有 tasks 完成后）

```bash
pnpm typecheck && pnpm test
```

通过 → apply 完成。失败 → 进入 Failure-Handling。

## Failure-Handling

**测试失败？**
- 失败测试在本次改动的文件中 → related：修复代码，commit，git diff，回到第 5 步重新验证
- 失败测试不在本次改动的文件中 → unrelated：记录，归因完成，继续
- 无法判断 → 停止，告诉用户"无法归因，请人工确认"

**命令失败（exit code ≠ 0）？**
- typecheck 失败 → 读报错信息，定位到文件和行，修复类型错误，回到第 5 步
- test 失败 → 看上方"测试失败？"分支
- CLI 失败 → 输出一句话诊断，告诉用户检查什么，停止

**找不到目标代码？**
→ 停下来，告诉用户 task 描述中的目标文件/关键字无法定位，需要人工确认路径。

**依赖未满足？**
→ 跳过该 task，记录在摘要中。执行不依赖它的 tasks。完成后告诉用户 blocked tasks 列表。

## 完成后输出摘要

```markdown
## Apply 完成

- 完成：T1, T2, T3
- 跳过（blocked）：T4（T2 未完成）
- 全量验证：通过 / 失败
```
