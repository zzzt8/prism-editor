---
name: C2-alpha-mask-canvas
description: Alpha 蒙版 Canvas 2D 实现
version: 1.0
date: 2026-04-06
type: sub-change
status: planned
parent: apply-mask-canvas-optimization
layer: engine
priority: P0
depends_on:
  - C1-canvas-compositing-primitives
---

# C2: Alpha 蒙版 Canvas 实现

> 派生自 meta-change: `apply-mask-canvas-optimization`

## Goal

使用 `destination-in` 合成操作实现 Alpha 蒙版，性能提升 5-10x。

## What Changes

1. 实现 `applyMaskCanvas()` 方法，使用 Canvas 2D `destination-in` 合成
2. Alpha 蒙版：直接使用蒙版的 alpha 通道裁剪原图
3. 复用 C1 的辅助方法（阈值处理、降级机制）

## Impact

| 范围 | 说明 |
|------|------|
| **scope** | `packages/image-ops/src/worker/imageWorker.worker.ts` |
| **核心方法** | `applyMaskCanvas()` |
| **使用操作** | `globalCompositeOperation: 'destination-in'` |
| **依赖方** | C4 (测试) |

## Acceptance Criteria

- [ ] Alpha 蒙版使用 `destination-in` 合成操作
- [ ] 数值与 JS 实现逐像素一致（±1 误差）
- [ ] 4K 图像处理耗时 <50ms
- [ ] 降级机制正常工作
- [ ] 现有集成测试全部通过

## Performance Target

| 图像尺寸 | 当前耗时 | 目标耗时 |
|----------|----------|----------|
| 4K (3840×2160) | ~300ms | <50ms |
| 8K (7680×4320) | ~1200ms | <200ms |
