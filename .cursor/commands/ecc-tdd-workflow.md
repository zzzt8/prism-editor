---
name: /ecc-tdd-workflow
id: ecc-tdd-workflow
category: Workflow
description: 执行测试优先与功能实现类型 task 的 ECC lane
skill:
  depends_on:
    - ecc-openspec-bridge
    - ecc-tdd-workflow
  category: apply
  order: 32
---

委托 `ecc-tdd-workflow` skill 执行测试优先 lane 的 SOP。
