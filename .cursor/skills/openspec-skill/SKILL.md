---
name: openspec-skill
description: Skill 系统维护工具。合并了 skill-list / skill-deps / skill-validate / skill-index 功能。不默认暴露，仅维护时使用。
version: "2.0"
category: meta
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-skill
depends_on: []
permissions: []
risks: []
verify:
  - typecheck
---

> **重要：** 本 skill 不默认暴露给普通用户，仅在维护 Skill 系统时使用。

## 核心职责

合并了以下四个原独立命令的功能：

| 原命令 | 功能 |
|--------|------|
| `opsx-skill-list` | 列出所有 skills |
| `opsx-skill-deps` | 显示 skill 依赖关系 |
| `opsx-skill-validate` | 验证 skill 格式 |
| `opsx-skill-index` | 重新生成索引 |

## 使用方式

```bash
# 列出所有 skills
/opsx-skill list

# 按 category 过滤
/opsx-skill list --category propose

# 按 tag 搜索
/opsx-skill list --tag layer:engine

# 显示依赖关系
/opsx-skill deps <skill-name>
/opsx-skill deps --all

# 验证所有 skills 格式
/opsx-skill validate
/opsx-skill validate --fix  # 自动修复可修复的问题

# 重新生成索引
/opsx-skill index
```

## 子命令详解

### list

列出所有注册的 Skills，按 category 分组。

```bash
/opsx-skill list
/opsx-skill list --category propose
/opsx-skill list --tag openspec
```

**输出格式：**

```
## Skill Index

### propose
| Skill | Description | depends_on |
|-------|-------------|------------|
| openspec-propose | 创建 change，生成 artifacts | openspec-explore |
| openspec-plan | 从规划到批量派生 | openspec-explore |

### apply
| Skill | Description | depends_on |
|-------|-------------|------------|
| openspec-apply | 实现 tasks，支持断点续传 | openspec-propose, openspec-plan |
```

### deps

显示 skill 之间的依赖关系。

```bash
/opsx-skill deps openspec-apply
/opsx-skill deps --all
/opsx-skill deps --dot  # 输出 Graphviz DOT 格式
```

**输出格式（单 skill）：**

```
## Skill Dependencies: openspec-apply

前置依赖：
├─ openspec-propose
│    └─ openspec-explore
└─ openspec-plan
     └─ openspec-explore

后继依赖：
└─ openspec-verify
```

**输出格式（--all）：**

```
## All Skill Dependencies

| Skill | depends_on |
|-------|-------------|
| openspec-explore | — |
| openspec-propose | openspec-explore |
| openspec-plan | openspec-explore |
| openspec-apply | openspec-propose, openspec-plan |
| openspec-verify | openspec-apply |
| openspec-archive | openspec-verify |
| openspec-debug | openspec-apply, openspec-verify |
```

### validate

验证所有 Skill 文件的 frontmatter 和内容格式。

```bash
/opsx-skill validate
/opsx-skill validate --fix
```

**检查项：**

| 检查项 | 说明 |
|--------|------|
| frontmatter 完整性 | name, description, category 必填 |
| category 有效性 | 必须是有效值 |
| depends_on 有效性 | 引用的 skill 必须存在 |
| 循环依赖 | depends_on 不允许循环 |
| version 格式 | 遵循 semver |
| Guardrails 存在 | 每个 skill 应有 Guardrails 章节 |

**输出格式：**

```
## Skill Validation Report

| Skill | Status | Issues |
|-------|--------|--------|
| openspec-apply | ✓ | — |
| openspec-verify | ✗ | Missing Guardrails section |
| openspec-propose | ✓ | — |

Found 1 issue:
- [openspec-verify] Missing Guardrails section
```

### index

重新生成 SKILL-INDEX.md。

```bash
/opsx-skill index
```

**执行内容：**
1. 扫描 `.cursor/skills/` 下所有 SKILL.md
2. 解析 frontmatter
3. 按 category 分组
4. 生成 SKILL-INDEX.md

---

## 与原独立命令的关系

| 原命令 | 新位置 |
|--------|--------|
| `/opsx-skill-list` | `/opsx-skill list` |
| `/opsx-skill-deps` | `/opsx-skill deps` |
| `/opsx-skill-validate` | `/opsx-skill validate` |
| `/opsx-skill-index` | `/opsx-skill index` |

---

## Guardrails

- **禁止**在日常开发中调用 `/opsx-skill`（不默认暴露）
- **强制**validate 检查循环依赖
- **强制**index 使用标准 YAML 解析器（非手写正则）
- **强制**list 按 category 排序输出
