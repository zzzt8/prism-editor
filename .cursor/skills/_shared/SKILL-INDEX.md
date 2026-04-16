---
name: _skill-index
description: 所有 Skill 的索引目录。按 category 组织。
---

# Skill Index

> 本 index 由生成脚本自动维护。所有 Skill 必须遵循 [SKILL-SCHEMA.md](./SKILL-SCHEMA.md) 定义的元数据 schema。

## 快速导航

[explore](#explore) · [propose](#propose) · [meta](#meta) · [apply](#apply) · [verify](#verify) · [archive](#archive) · [debug](#debug)

---

## explore

### openspec-explore

探索模式。先结构分析，再深入问题。量化切换标准，安全过渡到 propose。

| 属性 | 值 |
|------|----|
| name | `openspec-explore` |
| category | `explore` |
| version | `"3.0"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-explore` |
| depends_on | `[]` |

```bash
/opsx-explore
```

---

## propose

### openspec-propose

创建 change，自动生成 artifacts。

| 属性 | 值 |
|------|----|
| name | `openspec-propose` |
| category | `propose` |
| version | `"3.0"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-propose` |
| depends_on | `openspec-explore` |

```bash
/opsx-propose
```

---

## meta

### openspec-plan

多 change 编排能力。按专家规划派生子 change，非默认能力。

| 属性 | 值 |
|------|----|
| name | `openspec-plan` |
| category | `meta` |
| version | `"3.0"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-plan` |
| depends_on | `openspec-explore` |

```bash
/opsx-plan
```

---

### openspec-skill

Skill 系统维护工具。合并了 skill-list / skill-deps / skill-validate / skill-index 功能。不默认暴露，仅维护时使用。

| 属性 | 值 |
|------|----|
| name | `openspec-skill` |
| category | `meta` |
| version | `"2.0"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-skill` |
| depends_on | `[]` |

```bash
/opsx-skill
```

---

## apply

### openspec-apply

实现 OpenSpec change 的任务。支持断点续传、增量验证、依赖调度。

| 属性 | 值 |
|------|----|
| name | `openspec-apply` |
| category | `apply` |
| version | `"3.0"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-apply` |
| depends_on | `openspec-propose`, `openspec-plan` |

```bash
/opsx-apply
```

---

## verify

### openspec-verify

验证 OpenSpec change 的实现一致性 — Full 验证 + coherence-lite checklist。

| 属性 | 值 |
|------|----|
| name | `openspec-verify` |
| category | `verify` |
| version | `"3.0"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-verify` |
| depends_on | `openspec-apply` |

```bash
/opsx-verify
```

---

## archive

### openspec-archive

归档已完成的 OpenSpec change。直接调用官方 CLI，增加 git 干净度和最终确认。

| 属性 | 值 |
|------|----|
| name | `openspec-archive` |
| category | `archive` |
| version | `"3.0"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-archive` |
| depends_on | `openspec-verify` |

```bash
/opsx-archive
```

---

## debug

### openspec-debug

调试 apply 阶段遇到的问题。环境自适应诊断，支持多类错误模式。

| 属性 | 值 |
|------|----|
| name | `openspec-debug` |
| category | `debug` |
| version | `"3.0"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-debug` |
| depends_on | `openspec-apply`, `openspec-verify` |

```bash
/opsx-debug
```

---

## 搜索示例

### 按 tag 搜索

```
layer:meta    → 所有 OpenSpec 相关 skill
layer:engine  → 工作流/图像操作相关
layer:backend → 服务端/数据库相关
```

### 按 category 搜索

```
propose → openspec-propose
apply   → openspec-apply
verify  → openspec-verify
archive → openspec-archive
debug   → openspec-debug
meta    → openspec-plan, openspec-skill
```

## 相关文件

- [SKILL-SCHEMA.md](./SKILL-SCHEMA.md) — 元数据字段规范
- [SHARED-LAYERS.md](./SHARED-LAYERS.md) — Layer 映射和验证命令
