---
name: ecc-tdd-workflow
description: 针对测试优先与功能实现类 task 的项目内 ECC lane，要求先收敛失败用例再做最小实现。
version: "1.0.0"
category: apply
tags:
  - ecc
  - tdd
  - testing
  - layer:meta
aliases:
  - /ecc-tdd-workflow
depends_on:
  - ecc-openspec-bridge
permissions:
  - file-write
verify:
  - unit-tests
  - typecheck
---

## 适用范围

当 `opsx-meta.task_type` 为 `tdd` 或 `feature` 时使用。

典型目标：
- `*.test.ts`
- `*.spec.ts`
- 断言修复、fixture 更新、回归测试补强
- 小到中等范围的功能实现

## SOP

1. **先找最小失败面**
   - 读现有测试、报错、task 验收标准
   - 如果已有失败测试，直接以它为起点
   - 如果没有测试但有明确行为边界，先写最小测试

2. **红灯优先**
   - 让测试或断言准确表达目标行为
   - 避免为了通过测试而削弱断言
   - 只补当前 task 所需的测试面

3. **最小实现**
   - 只写让当前测试通过所需的最少代码
   - 避免顺手重构大段逻辑
   - 如果发现设计问题超出 task 范围，记录为 follow-up

4. **回归验证**
   - 先跑最小相关测试
   - 再跑对应 layer smoke / package typecheck
   - 必要时检查 fixture / snapshot 是否仍表达真实行为

## 产出要求

摘要中必须回答：
- 先改了哪个测试或断言
- 哪个实现被最小化修改
- 跑了哪些测试
- 是否留下 follow-up

## 禁止事项

- 没有行为边界就直接写实现
- 为了过测试降低断言力度
- 顺带修 unrelated 失败测试
