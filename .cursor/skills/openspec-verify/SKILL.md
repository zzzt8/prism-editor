---
name: openspec-verify
description: 验证 OpenSpec change 的实现一致性。
version: "3.3"
category: verify
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-verify
depends_on:
  - openspec-apply
verify:
  - typecheck
---

> **verify 模板来源：** ../../openspec/schemas/prism-workflow/templates/verify.md

## 核心原则

verify 只做检查，不做修复。发现问题 → 返回 apply 修复 → 重新 verify。

## 执行步骤

```
1. 读 verify.md 模板
2. 读 tasks.md checkbox 状态
3. Full Verification：pnpm typecheck && pnpm test
   - 通过 → 继续 Coherence Check
   - 失败 → 输出 Test Failure Attribution
     - related/undetermined → 停止，告知用户
     - unrelated/flaky → 记录，继续
4. Coherence Check（按模板）
5. 输出 Verify Result
```

## 完成后输出

```markdown
## Verify 结果

- Full 验证：✓ / ✗（失败归因：...）
- Coherence：✓ / ✗（问题：...）
- 结论：通过 / 阻断
- 下一步：可以 archive / 返回 apply 修复
```
