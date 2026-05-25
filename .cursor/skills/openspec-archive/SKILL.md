---
name: openspec-archive
description: 归档已完成的 OpenSpec change。直接调用官方 CLI，自动完成。
version: "4.0"
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

## 核心原则

- **自动完成**：不询问用户，不等待确认
- **检查 + 调用 CLI**：Agent 自动完成所有检查，有问题输出警告但不阻断
- 状态以 tasks.md checkbox 为主

## 执行流程

### 1. 检查完成状态

读取 `tasks.md`，统计 checkbox 状态：

```
- [x] 完成数量 / 总数
- [ ] 未完成数量
```

- 如果有 `[ ]` checkbox：输出警告 `"X 个 task 未完成，建议返回 apply"` 但继续归档
- 如果全部 `[x]`：正常继续

### 2. Git 工作区检查

```bash
git status --porcelain
git diff --name-only
```

**处理规则：**

| 情况 | 处理 |
|------|------|
| 有未 staged 的 tracked 文件 | 输出警告 "有未 commit 的改动"，建议先 commit，但继续归档 |
| 有敏感 untracked 文件（.env, *.db） | 输出警告，但不阻断 |
| 有生成物（node_modules/.cache/） | 忽略 |

### 3. 调用官方 CLI

```bash
openspec archive --change <name> --yes
```

### 4. 显示摘要

```markdown
## Archive 完成

- change：<name>
- 归档位置：openspec/changes/archive/<date>-<name>/
- tasks：<done>/<total> 完成
- 警告：<如有>
```

## Guardrails

- **禁止**手搓 `mkdir` + `mv` 命令
- **强制**使用官方 `openspec archive` 命令
- **强制**在归档前检查 git 工作区
- **禁止**人工确认环节
- 状态检查以 tasks.md checkbox 为准
