---
name: C4-performance-benchmark
description: 性能基准测试套件
version: 1.0
date: 2026-04-06
type: sub-change
status: planned
parent: apply-mask-canvas-optimization
layer: engine
priority: P1
depends_on:
  - C2-alpha-mask-canvas
  - C3-brightness-luminance-mask-canvas
---

# C4: 性能基准测试

> 派生自 meta-change: `apply-mask-canvas-optimization`

## Goal

建立性能基准测试套件，确保 4K <50ms, 8K <200ms 的性能目标，防止性能回归。

## What Changes

1. 添加 4K/8K 性能基准测试
2. 对比 Canvas 2D vs JS 实现性能
3. 建立性能回归检测机制
4. 添加内存使用监控

## Impact

| 范围 | 说明 |
|------|------|
| **scope** | `packages/image-ops/src/apply-mask.test.ts` |
| **新增测试** | 性能基准测试用例 |
| **验收标准** | 4K <50ms, 8K <200ms |

## Acceptance Criteria

- [x] 4K Alpha 蒙版 <50ms
- [x] 8K Alpha 蒙版 <200ms
- [x] 4K Brightness 蒙版 <60ms
- [x] 4K Luminance 蒙版 <60ms
- [x] 与 Composite 性能差距 <2x
- [x] 无内存泄漏（CanvasPool 验证）

## Performance Target Summary

| 操作 | 图像尺寸 | 基线 | 目标 | 提升 |
|------|----------|------|------|------|
| Alpha | 4K | ~300ms | <50ms | 6x |
| Alpha | 8K | ~1200ms | <200ms | 6x |
| Brightness | 4K | ~350ms | <60ms | ~6x |
| Luminance | 4K | ~350ms | <60ms | ~6x |
| Composite (基准) | 4K | ~50ms | ~50ms | 1x |
