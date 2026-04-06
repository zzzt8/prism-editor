---
name: openspec-archive
description: 归档已完成的 OpenSpec change。直接调用官方 CLI，增加 git 干净度和最终检查清单。
---

## 核心职责

- 检查完成状态
- 检查 git 工作区干净度
- 调用官方 CLI
- 显示归档摘要

## 执行流程

### 1. 检查完成状态

```bash
openspec status --change "<name>" --json
```

- 检查 artifacts 是否全部完成
- 检查 tasks 是否全部勾选（`- [x]` 或 `status: done`）

### 2. Git 工作区检查

```bash
git status
```

- 如果有未提交的代码 → **警告并阻断**，先 commit 再归档
- 如果只有 untracked 文件（如 `node_modules/.cache/` 等生成物）→ 可忽略
- 如果有 untracked 的敏感文件（如 `.env`、`*.db`）→ 警告但不阻断

**为什么要检查 git：**
归档的 change 应该对应一个完整的 git commit，避免归档内容和代码库历史脱节。

### 3. 最终检查清单

在调用 CLI 之前，逐项确认：

```
最终检查清单 — <change-name>
│
├─ [ ] Completeness：tasks.md 所有 task 都是 - [x] 或 status: done
├─ [ ] Completeness：architecture-review 章节已填写（当需要时）
├─ [ ] Completeness：test-plan 章节已填写（当需要时）
├─ [ ] Correctness：相关 layer 的测试全部通过（见 SHARED-LAYERS.md 增量验证策略）
├─ [ ] Coherence：design.md 的每个技术决策都有对应实现
├─ [ ] Git：工作区干净，无未提交的代码（git status 干净）
├─ [ ] No Secrets：没有 .env 或凭据混入 change
└─ [ ] User Confirm：用户确认上述检查结果
```

如有任意项未通过：
- 显示 `❌ 未通过的检查项`
- 列出具体问题
- 询问用户是继续修复还是强制归档（用户需明确确认）

### 4. 提示确认（如有未完成任务）

如果有未完成任务：
- 显示警告
- 等待用户确认是否继续归档

### 5. 调用官方 CLI

```bash
openspec archive --change <name> --yes
```

官方 archive 命令会：
- 验证所有 artifacts 完成
- 合并 delta specs（如有）
- 移动到 archive 目录

### 6. 显示摘要

- 归档位置
- spec 同步状态
- git commit 对应（如有）
- 警告信息（如有）

## Guardrails

- **禁止**手搓 `mkdir` + `mv` 命令
- **强制**使用官方 `openspec archive` 命令
- **必须**在归档前检查任务完成状态
- **必须**在归档前检查 git 工作区（未提交的代码应先 commit）
- **必须**逐项执行最终检查清单
- **必须**处理未完成任务警告
- **强制**无 git commit 时提示用户先 commit 再归档
