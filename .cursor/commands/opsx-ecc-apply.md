---
name: /opsx-ecc-apply
id: opsx-ecc-apply
category: Workflow
description: 用 OpenSpec + ECC Bridge 执行 change tasks
skill:
  depends_on:
    - openspec-apply
    - ecc-openspec-bridge
  category: apply
  order: 3
---

委托 `openspec-apply` 执行，并在每个 task 上应用 `ecc-openspec-bridge` 的 lane 路由规则。
