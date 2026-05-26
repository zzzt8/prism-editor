# tasks: fix-performance-test-assertion

## Task Anchor

- **原始任务**：修复性能测试断言，使其与测试描述一致
- **追加内容**：无
- **追加内容判定**：无
- **是否改变任务主题**：否

---

## Implementation Tasks

- [x] **Task 1: Fix 4K brightness mask performance test assertion**
  - layer: `packages/image-ops`
  - verify: `npm run test --workspace=@prism/image-ops`

  修改 `packages/image-ops/src/canvas-compositing-primitives.test.ts` 第 737 行：

  ```diff
  - expect(duration).toBeLessThan(500);
  + expect(duration).toBeLessThan(60);
  ```

  验收：
  - 运行 `npm run test --workspace=@prism/image-ops` 确认测试通过
  - 如果测试失败，说明 60ms 阈值过于严格，需要重新评估合理的性能目标

---

## Verification

运行 `npm run test --workspace=@prism/image-ops` 确认：
1. "brightness mask on 4K image completes within 60ms" 测试通过
2. 其他所有测试保持通过
