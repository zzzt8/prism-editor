---
name: openspec-propose
description: 创建 change，自动生成 artifacts。
version: "3.3"
category: propose
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-propose
depends_on:
  - openspec-explore
verify:
  - typecheck
---

## 启动检查（失败就停）

```bash
openspec list --json
```

确认 change 名称不与现有 active change 重复。

## 获取 change name

从用户输入推断 kebab-case name。直接创建，不需要用户确认。

如果推断结果明显不对，用户会纠正。Agent 直接继续。

## 创建 change

```bash
openspec new change "<name>"
```

CLI 失败 → 停止，告诉用户检查 CLI 配置。不要自己造 artifact。

## 推断 change_class

根据改动范围推断：

| 条件 | change_class |
|------|-------------|
| 仅样式/文案/UI布局，不影响逻辑 | `low` |
| 单页面交互增强，局部 UI 变更 | `medium` |
| 触及 store / API / node schema / engine 层 / 跨包接口 | `high` |
| 无法明确判断 | `high`（默认保守） |

## 生成 artifacts

按 change_class 决定内容深度：

**proposal.md**（所有 class 必须）：
- 顶部：change_class + reason
- 包含 Why / What Changes / Capabilities / Impact / Out of Scope
- 用户追加的约束必须写入 Out of Scope

**design.md**（所有 class 必须）：
- Goals / Non-Goals
- Decisions
- `low`：简要设计说明（1-3句）+ 替代方案考虑
- `medium`：Architecture Review（精简候选方案）+ 简化评审清单
- `high`：完整 Architecture Review + 正式评审清单

**tasks.md**（所有 class 必须）：
- `low`：纯 checkbox，**不生成** opsx-meta 块。验收标准必须包含具体验证命令。
- `medium`：`low` 格式 + 质量合规章节。**不生成** opsx-meta 块。
- `high`：每个 task 含 opsx-meta 块（id、layer、verify）。验收标准必须可自动化验证。

## change-splitting（可选）

满足以下任一时，才执行拆分：
- 预期需要 3 个以上子 change
- 存在 change 间依赖

拆分后输出子 change 清单（子 change 名 + 主要 layer + 依赖关系 + 一句话描述）。

## 完成后输出摘要

```markdown
## Propose 完成

- change：<name>（change_class: <class>）
- artifacts：proposal.md, design.md, tasks.md
- 子 change 拆分：<有/无>
```
