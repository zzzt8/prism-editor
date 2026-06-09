---
name: /opsx-ecc-verify
id: opsx-ecc-verify
category: Workflow
description: 用 OpenSpec + ECC Bridge 做 full verify
skill:
  depends_on:
    - openspec-verify
    - ecc-openspec-bridge
  category: verify
  order: 4
---

委托 `openspec-verify` 执行，并追加 `ecc-openspec-bridge` 的 review / failure attribution lanes。
