---
name: _skill-index
description: 所有 Skill 的索引目录。按 category 组织。
---

# Skill Index

## 快速导航

[explore](#explore) · [propose](#propose) · [apply](#apply) · [verify](#verify) · [archive](#archive)

---

## explore

### openspec-explore

探索模式。先结构分析，再深入问题。量化切换标准，安全过渡到 propose。

| 属性 | 值 |
|------|----|
| name | `openspec-explore` |
| category | `explore` |
| version | `"3.1"` |
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
| version | `"3.3"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-propose` |
| depends_on | `openspec-explore` |

```bash
/opsx-propose
```

---

## apply

### openspec-apply

执行 OpenSpec change 的 tasks。断点续传，增量验证。|

| 属性 | 值 |
|------|----|
| name | `openspec-apply` |
| category | `apply` |
| version | `"3.5"` |
| tags | `openspec`, `layer:meta` |
| aliases | `/opsx-apply` |
| depends_on | `openspec-propose` |

```bash
/opsx-apply
```

---

## verify

### openspec-verify

验证 OpenSpec change 的实现一致性。

| 属性 | 值 |
|------|----|
| name | `openspec-verify` |
| category | `verify` |
| version | `"3.3"` |
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
