---
name: openspec-plan
description: 多 change 编排能力。按专家规划派生子 change，非默认能力。
version: "3.0"
category: meta
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-plan
depends_on:
  - openspec-explore
permissions: []
risks: []
verify:
  - typecheck
---

> **前置共享片段：** layer 映射见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## 核心职责

- 接收专家规划文档
- 产出 `change-index.md`：候选子 change 列表 + 依赖
- 批量派生子 change

## 使用门槛

满足以下任一条件，建议使用 `/opsx-plan`：

| 条件 | 说明 |
|------|------|
| 预期需要 3 个以上子 change | change 间需要结构化拆分 |
| 存在 change 间依赖 | 子 change 有执行顺序约束 |
| 涉及共享 contract / migration / rollout | 需要统一协调 |
| 需要批量 apply | 多个 change 需要统一执行 |
| 专家规划文档已存在 | 已有结构化分析，需拆解派生子 change |

不满足以上条件，直接走 `/opsx-propose`。

## 使用方式

```bash
# 完整流程
/opsx-plan <path-to-expert-doc>

# 仅派生
/opsx-plan --derive <meta-change-name>

# 跳过人工确认
/opsx-plan <path-to-expert-doc> --no-confirm
```

## 执行流程

### 阶段 1: 解析专家规划

```bash
openspec new change "<meta-name>"
```

生成：proposal.md、design.md、repo-analysis.md（只扫一遍）、change-index.md。

**change-index.md 结构：**

```markdown
# Change Index

> 本 index 由 meta-change `<name>` 全局分析生成。

## C1 <change-name>

- **goal**: <一句话描述目标>
- **layer**: <engine / backend / editor / runtime / ui-skin>
- **depends_on**: <none / C2 / C3...>
- **reason**: <为什么需要这个 change>
```

**人工确认：**

```
拆分结果：
| # | Child Change | Layer |
|---|--------------|-------|
| C1 | mapper-contract | engine |
| C2 | repository-layer | backend |

- [ ] 范围是否合理？
- [ ] 依赖关系是否正确？
```

### 阶段 2: 批量派生

```bash
openspec new change "<meta-name>/C1-mapper-contract"
openspec new change "<meta-name>/C2-repository-layer"
```

子 change 复用 meta 的 repo-analysis。

## Guardrails

- **强制**只做一次全局 repo-analysis
- **强制**按依赖拓扑顺序创建子 change
- **强制**检测并报错循环依赖
- **禁止**用 mkdir 创建子 change 目录
