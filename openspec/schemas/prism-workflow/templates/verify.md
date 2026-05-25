# Verify Report

> **change**: `<change-name>`
> **change_class**: `<low | medium | high>`
> **date**: `<YYYY-MM-DD>`

---

## Metadata Check

- [ ] tasks.md 所有 checkbox 为 `- [x]`
- [ ] proposal.md 顶部有 change_class + reason

---

## Full Verification

```bash
pnpm typecheck && pnpm test --run
```

**无论通过与否，继续执行后续步骤。**

---

## Test Failure Attribution

| 失败测试 | 在 git diff 范围内？ | 归因 | 动作 |
|---------|-------------------|------|------|
| [TC-xxx] | 是 / 否 | related / unrelated / flaky | 记录到报告 |

**归因判定：**
- `related` → 记录，报告给 Agent 修复
- `unrelated` → 记录为 pre-existing
- `flaky` → 记录为 flaky

**verify 不阻断 archive。**

---

## Coherence Check

> 自动化比对：design.md 中提到的文件/函数/配置，代码中是否存在。

- [ ] 每个已完成 task 是否有对应代码改动？（git diff 验证）
- [ ] design.md 提到的文件路径存在
- [ ] design.md 提到的函数/变量名在代码中存在

---

## Verify Result

```markdown
## Verify 结果

- **Checkbox**：`N/N done`
- **Full 验证**：✓ / ⚠（N 个失败，归因：related × N, unrelated × N）
- **Coherence**：✓ / ⚠（N 个不一致）
- **结论**：报告模式（不阻断 archive）

> 建议：修复 related 测试失败后重新 verify。
```
