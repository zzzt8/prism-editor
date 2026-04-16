---
name: /opsx-debug
id: opsx-debug
category: Workflow
description: 调试 apply 阶段遇到的问题
skill:
  depends_on:
    - openspec-apply
    - openspec-verify
  category: debug
  order: 3
---

委托 `openspec-debug` skill 执行。