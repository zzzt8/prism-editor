---
name: Commands Index
description: Cursor Commands 索引，按 category 组织。v3.2 精简为 5 个命令。
---

# Commands Index

## 快速导航

[explore](#explore) · [propose](#propose) · [apply](#apply) · [verify](#verify) · [archive](#archive)

---

## explore

### /opsx-explore

探索模式。先结构分析，再深入问题。量化切换标准，安全过渡到 propose。

| 属性 | 值 |
|------|----|
| category | `explore` |
| order | 1 |
| depends_on | — |

```bash
/opsx-explore
```

---

## propose

### /opsx-propose

创建 change，自动生成 artifacts。根据 change_class 推断结果自动插入 review checklist 和测试分层模板。支持 change-splitting 多 change 编排。

| 属性 | 值 |
|------|----|
| category | `propose` |
| order | 2 |
| depends_on | `openspec-explore` |

```bash
/opsx-propose <change-name>
```

---

## apply

### /opsx-apply

实现 OpenSpec change 的任务。断点续传基于 tasks.md checkbox，内置 failure-handling 诊断。

| 属性 | 值 |
|------|----|
| category | `apply` |
| order | 3 |
| depends_on | `openspec-propose` |

```bash
/opsx-apply <change-name>
```

---

## verify

### /opsx-verify

验证 OpenSpec change 的实现一致性。Full 验证 + coherence-lite checklist。

| 属性 | 值 |
|------|----|
| category | `verify` |
| order | 4 |
| depends_on | `openspec-apply` |

```bash
/opsx-verify <change-name>
```

---

## archive

### /opsx-archive

归档已完成的 OpenSpec change。

| 属性 | 值 |
|------|----|
| category | `archive` |
| order | 5 |
| depends_on | `openspec-verify` |

```bash
/opsx-archive <change-name>
```

---

## 执行顺序

```
explore → propose → apply → verify → archive
```

---

## 相关文件

- [.cursor/skills/_shared/SKILL-INDEX.md](../skills/_shared/SKILL-INDEX.md) — 完整 Skill 索引
- [.cursor/skills/_shared/SKILL-SCHEMA.md](../skills/_shared/SKILL-SCHEMA.md) — 元数据规范
