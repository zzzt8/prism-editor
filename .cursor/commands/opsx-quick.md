---
name: /opsx-quick
id: opsx-quick
category: Workflow
description: 轻量任务快速执行，自动选择 ECC lane
skill:
  depends_on:
    - openspec-quick
  category: quick
  order: 0
---

委托 `openspec-quick` skill 执行。先过 Quick Gate，再自动选择主 `ECC lane` 做最小实现与验证。
