---
name: image-synthesis-performance/C2-parallel-composite
type: change
created: 2026-04-06
description: 将可并行的 overlay 分组后并行合成，充分利用多 Worker 优势
status: active
parent: image-synthesis-performance
tags:
  - performance
  - image-ops
  - composite
layers:
  - engine
depends_on:
  - image-synthesis-performance/C1-dynamic-worker-pool
priority: P0
---

# C2: 并行多层合成

> 派生自 meta-change: `image-synthesis-performance`

## Why

当前 `compositeExecutor` 中的多层叠加是串行执行的：

```typescript
for (const key of overlayKeys) {
  result = await workerRunner.composite(result, img, blendMode, opacity);
}
```

10 层叠加 = 10× 单层时间。配合 C1 的动态 Worker 池（4+ workers），可以分组并行执行，显著减少总时间。

## What Changes

- 在 `compositeExecutor` 中引入分组并行逻辑
- 将 overlay 分成 N 组（N = Worker 池大小），每组并行执行
- 按顺序累积合并分组结果
- 添加像素级正确性测试

## Impact Summary

|| Layer | 文件 | 影响 |
|-------|------|------|
| engine | `packages/image-ops/src/composite.ts` | 分组并行合成算法 |
| engine | `packages/image-ops/src/composite.test.ts` | 新增正确性测试 |

> **Repo Analysis**：见 [`image-synthesis-performance/repo-analysis.md`](../../image-synthesis-performance/repo-analysis.md)

## 前置依赖

- C1: 动态 Worker 池 — 需要更多 Worker 才能发挥并行优势
