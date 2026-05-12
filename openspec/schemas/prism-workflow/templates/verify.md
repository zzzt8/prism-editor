# Verify Report

> **change**: `<change-name>`
> **change_class**: `<low | medium | high>`
> **date**: `<YYYY-MM-DD>`

---

## Metadata Check

- [ ] tasks.md 所有 checkbox 为 `- [x]`
- [ ] proposal.md 顶部有 change_class + reason
- [ ] 每个 task 有 opsx-meta 块（id、layer、verify）

---

## Full Verification

```bash
pnpm typecheck && pnpm test
```

通过 → 继续。不通过 → 进入归因。

---

## Test Failure Attribution（仅在测试失败时）

| 失败测试 | 在 git diff 范围内？ | 归因 | 动作 |
|---------|-------------------|------|------|
| [TC-xxx] | 是 / 否 | related / unrelated / flaky / undetermined | 修复或记录 |

**归因判定：**
- `related` → 阻断，必须修复
- `unrelated` → 记录，继续
- `flaky` → 记录，继续
- `undetermined` → 阻断

---

## Coherence Check

- [ ] 每个已完成 task 是否有对应代码改动？（git diff 验证）
- [ ] design.md 关键决策是否在代码中体现？
- [ ] 是否有越权（explore/propose/verify 阶段发生代码变更）未报告？

---

## Verify Result

**结论：** 通过 / 阻断

**原因：**
- Full 验证：✓ / ✗
- 归因阻断：N 个 related/undetermined
- 一致性：✓ / ✗（列出具体问题）

**下一步：**
- 通过 → 可以 archive
- 阻断 → 返回 apply 修复后重新 verify
