# design: fix-performance-test-assertion

## Goals

修复测试描述与断言不一致的问题。

## Non-Goals

- 不修改性能阈值到其他值
- 不修改测试的图像尺寸或算法

## Decisions

测试描述是 "completes within 60ms"，断言应该是 `toBeLessThan(60)` 而非 `toBeLessThan(500)`。

## Simplified Review Checklist

- [ ] 断言值与测试描述一致（60ms）
- [ ] 测试仍可正常运行
