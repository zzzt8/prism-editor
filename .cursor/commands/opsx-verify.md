---
name: /opsx-verify
id: opsx-verify
category: Workflow
description: 验证 OpenSpec change 的实现一致性
skill:
  depends_on:
    - openspec-apply
  category: verify
  order: 4
---

委托 `openspec-verify` skill 执行。