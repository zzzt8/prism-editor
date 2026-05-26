# proposal: fix-performance-test-assertion

**change_class: low**

reason: `canvas-compositing-primitives.test.ts` 中 "brightness mask on 4K image completes within 60ms" 测试的描述是 60ms，但断言是 `toBeLessThan(500)`。修改断言为 `toBeLessThan(60)` 匹配测试描述。

---

## Why

测试描述明确写了 "completes within 60ms"，但断言是 `toBeLessThan(500)`（500ms）。这是测试描述与断言不一致的 bug。

---

## What Changes

修改 `packages/image-ops/src/canvas-compositing-primitives.test.ts` 中的性能测试断言：

```diff
- expect(duration).toBeLessThan(500);
+ expect(duration).toBeLessThan(60);
```

---

## Impact

| layer | 影响 |
|-------|------|
| `packages/image-ops` | 修改测试断言，无生产影响 |
| 其他 | 无 |

---

## Out of Scope

- 不修改性能测试的实现逻辑
- 不修改 4K 图像尺寸
- 不调整阈值到其他值
