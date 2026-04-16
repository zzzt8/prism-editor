---
name: openspec-archive
description: 归档已完成的 OpenSpec change。直接调用官方 CLI，增加 git 干净度和最终确认。
version: "3.0"
category: archive
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-archive
depends_on:
  - openspec-verify
permissions: []
risks: []
verify:
  - typecheck
---

## 核心职责

> **v3.0 变更：** Archive 只做收尾动作，不再重复 verify 的检查（已由 verify 阶段完成）。
> 状态以 tasks.md checkbox 为主。

- 确认用户已确认（最后一次人工检查点）
- 检查 git 工作区干净度
- 调用官方 CLI
- 显示归档摘要

## 执行流程

### 1. 检查完成状态

读取 `tasks.md`，确认所有 checkbox 为 `- [x]`（done）。

### 2. Git 工作区检查

> **v3.0 变更：** 区分 tracked 和 untracked 文件。

```bash
# 检查 change 目录的 git 状态
git status --porcelain

# 区分检查
git diff --cached --name-only  # 应该有内容（已 staged）
git diff --name-only          # 应该为空（或者用户确认只做 staged commit）
```

**检查规则：**

| 情况 | 处理 |
|------|------|
| 有未 staged 的 tracked 文件 | **警告并阻断**，先 commit 再归档 |
| 有 untracked 的敏感文件（.env, *.db） | **警告**但不阻断 |
| 有 untracked 的生成物（node_modules/.cache/） | 忽略 |

### 3. 用户最终确认

> **v3.0 变更：** 移除对 tasks-state.json 的引用，改为读 checkbox。

```
## Archive 最终确认 — <change-name>

tasks.md checkbox 确认：所有 task 为 - [x]（done）
Git 工作区：干净（已 commit）

请确认：
- [ ] 所有代码改动已 commit
- [ ] verify 阶段已通过
- [ ] 没有需要保留的未提交改动

输入 "archive" 完成归档，或输入 "cancel" 取消。
```

### 4. 调用官方 CLI

```bash
openspec archive --change <name> --yes
```

### 5. 显示摘要

- 归档位置
- spec 同步状态
- git commit 对应
- 警告信息（如有）

## Guardrails

- **禁止**手搓 `mkdir` + `mv` 命令
- **强制**使用官方 `openspec archive` 命令
- **强制**在归档前检查 git 工作区
- **强制**无 git commit 时提示用户先 commit 再归档
- **强制**在归档前调用 verify（由 depends_on 保证）
- **禁止**在 archive 中重复 verify 的检查（职责分离）
- **强制**状态检查以 tasks.md checkbox 为准（不是 tasks-state.json）
