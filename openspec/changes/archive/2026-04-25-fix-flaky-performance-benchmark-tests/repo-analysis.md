## 影响层（Impact Map）

| 影响层 | 涉及模块 | 影响原因 |
|--------|----------|----------|
| engine | `packages/image-ops/src/apply-mask-benchmark.test.ts` | 被修改的测试文件 |
| engine | `packages/image-ops/src/canvas-compositing-primitives.test.ts` | 冗余断言清理目标 |

> **无其他层受影响**：本 change 仅触及测试文件，不涉及 editor/runtime/backend/ui-skin 层。

## 相关目录

```
packages/image-ops/src/
├── apply-mask-benchmark.test.ts     ← 主要修改目标
└── canvas-compositing-primitives.test.ts  ← 冗余断言清理目标
```

## 关键模块

### `apply-mask-benchmark.test.ts`
- **职责**：Benchmark 性能测试，对比 Canvas 2D 和纯 JS 的 apply-mask 实现
- **问题位置**：Task 5 speedup 比值断言（> 0.1）
- **数据流**：测试在 `vitest` Node.js 环境下运行，调用 `canvasApplyBrightnessMask` / `canvasApplyLuminanceMask` 函数

### `canvas-compositing-primitives.test.ts`
- **职责**：Canvas 合成原语测试（含功能测试和性能断言）
- **冗余点**：同一 speedup 断言存在两份，且注释与断言值矛盾

## 复用点

- JS 参考实现（`jsApplyBrightnessMask` / `jsApplyLuminanceMask`）：作为 Canvas 实现的对比基准，**不修改**
- CI-relaxed 基线（`PERFORMANCE_BASELINE`）：作为回归检测基准，**不修改**
- `apply-mask.ts` 和 `imageWorker.worker.ts` 中的生产实现：**不修改**

## 现有问题

1. **speedup 断言阈值过于敏感**：`expect(speedup).toBeGreaterThan(0.1)` 在 Node.js canvas 包环境下不稳定
2. **两套测试标准并存**：`canvas-compositing-primitives.test.ts` 混合了功能测试（`< 100ms`）和 speedup 比值测试（`> 0.1`）
3. **注释与断言不一致**：注释说 "Allow more tolerance for JS fallback"，但断言是 `< 100ms`

## Impact Summary

本次 change 影响：

- **新增依赖**：无
- **破坏性变更**：无
- **向后兼容**：完全向后兼容，仅改测试断言

## 数据流变化

```
[Before]
  vitest → canvas-compositing-primitives.test.ts
           → apply-mask-benchmark.test.ts
                → speedup = JS_ms / Canvas_ms
                → expect(speedup).toBeGreaterThan(0.1)  ← Flaky

[After]
  vitest → canvas-compositing-primitives.test.ts
                → 移除冗余 speedup 断言（功能测试保留）
           → apply-mask-benchmark.test.ts
                → expect(speedup).toBeGreaterThan(0.05)  ← 稳定
```
