---
name: /ecc-build-error-resolver
id: ecc-build-error-resolver
category: Workflow
description: 执行 build / typecheck / lint / CI 修复类型 task 的 ECC lane
skill:
  depends_on:
    - ecc-openspec-bridge
    - ecc-build-error-resolver
  category: debug
  order: 33
---

委托 `ecc-build-error-resolver` skill 执行构建故障修复 lane 的 SOP。
