---
name: Commands Index
description: Cursor Commands 索引，按 category 组织。v4.0 在 5 个 OpenSpec 命令基础上叠加 ECC Bridge + 3 个 lane 命令。
---

# Commands Index

## 快速导航

[quick](#quick) · [explore](#explore) · [propose](#propose) · [apply](#apply) · [verify](#verify) · [archive](#archive) · [ecc-bridge](#ecc-bridge) · [ecc-lanes](#ecc-lanes)

---

## quick

### /opsx-quick

轻量任务快速执行。先过 Quick Gate，再自动选择主 ECC lane 做最小实现与验证。

| 属性 | 值 |
|------|----|
| category | `quick` |
| order | 0 |
| depends_on | `openspec-quick` |

```bash
/opsx-quick
```

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

## ecc-bridge

### /opsx-ecc-bridge

查看或应用 OpenSpec 到 ECC lane 的路由规则。

| 属性 | 值 |
|------|----|
| category | `meta` |
| order | 35 |
| depends_on | `ecc-openspec-bridge` |

```bash
/opsx-ecc-bridge
```

### /opsx-ecc-apply

用 OpenSpec + ECC Bridge 执行 change tasks。

| 属性 | 值 |
|------|----|
| category | `apply` |
| order | 3 |
| depends_on | `openspec-apply`, `ecc-openspec-bridge` |

```bash
/opsx-ecc-apply <change-name>
```

### /opsx-ecc-verify

用 OpenSpec + ECC Bridge 做 full verify。

| 属性 | 值 |
|------|----|
| category | `verify` |
| order | 4 |
| depends_on | `openspec-verify`, `ecc-openspec-bridge` |

```bash
/opsx-ecc-verify <change-name>
```

---

## ecc-lanes

### /ecc-api-design

手动执行 API / contract / schema lane。

| 属性 | 值 |
|------|----|
| category | `apply` |
| order | 31 |
| depends_on | `ecc-openspec-bridge`, `ecc-api-design` |

```bash
/ecc-api-design
```

### /ecc-tdd-workflow

手动执行测试优先 / feature lane。

| 属性 | 值 |
|------|----|
| category | `apply` |
| order | 32 |
| depends_on | `ecc-openspec-bridge`, `ecc-tdd-workflow` |

```bash
/ecc-tdd-workflow
```

### /ecc-build-error-resolver

手动执行 build / typecheck / lint / CI 修复 lane。

| 属性 | 值 |
|------|----|
| category | `debug` |
| order | 33 |
| depends_on | `ecc-openspec-bridge`, `ecc-build-error-resolver` |

```bash
/ecc-build-error-resolver
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
