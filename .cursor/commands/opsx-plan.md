---
name: /opsx-plan
id: opsx-plan
category: Workflow
description: 多 change 编排能力。按专家规划派生子 change，非默认能力。
skill:
  depends_on:
    - openspec-explore
  category: meta
  order: 2
---

委托 `openspec-plan` skill 执行。

## 使用门槛

满足以下任一条件，建议使用 `/opsx-plan`：

| 条件 | 说明 |
|------|------|
| 预期需要 3 个以上子 change | change 间需要结构化拆分 |
| 存在 change 间依赖 | 子 change 有执行顺序约束 |
| 涉及共享 contract / migration / rollout | 需要统一协调 |
| 需要批量 apply | 多个 change 需要统一执行 |
| 专家规划文档已存在 | 已有结构化分析，需拆解派生子 change |

## 使用方式

```bash
# 完整流程（从专家规划文档开始）
/opsx-plan <path-to-expert-doc>

# 仅派生（meta-change 已存在）
/opsx-plan --derive <meta-change-name>

# 跳过人工确认
/opsx-plan <path-to-expert-doc> --no-confirm
```
