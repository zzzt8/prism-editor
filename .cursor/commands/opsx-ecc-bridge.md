---
name: /opsx-ecc-bridge
id: opsx-ecc-bridge
category: Workflow
description: 查看或应用 OpenSpec 到 ECC lane 的路由规则
skill:
  depends_on:
    - ecc-openspec-bridge
  category: meta
  order: 35
---

委托 `ecc-openspec-bridge` skill 执行，用于说明或应用 OpenSpec `apply / verify` 阶段的 ECC lane 路由规则。
