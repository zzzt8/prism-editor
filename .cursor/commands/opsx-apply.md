---
name: /opsx-apply
id: opsx-apply
category: Workflow
description: 实现 OpenSpec change 的任务
skill:
  depends_on:
    - openspec-propose
    - openspec-plan
  category: apply
  order: 3
---

委托 `openspec-apply` skill 执行。
