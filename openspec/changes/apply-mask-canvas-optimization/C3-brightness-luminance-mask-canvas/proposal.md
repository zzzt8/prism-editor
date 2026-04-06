---
name: C3-brightness-luminance-mask-canvas
description: Brightness 和 Luminance 蒙版 Canvas 2D 实现
version: 1.0
date: 2026-04-06
type: sub-change
status: planned
parent: apply-mask-canvas-optimization
layer: engine
priority: P1
depends_on:
  - C1-canvas-compositing-primitives
---

# C3: Brightness/Luminance 蒙版 Canvas 实现

> 派生自 meta-change: `apply-mask-canvas-optimization`

## Goal

实现 Brightness 和 Luminance 蒙版的 Canvas 2D 路径，复用 C1 的灰度转换基础设施。

## What Changes

1. 实现 Brightness 蒙版 Canvas 2D 方法（灰度 = (R+G+B)/3）
2. 实现 Luminance 蒙版 Canvas 2D 方法（Y = 0.299R + 0.587G + 0.114B）
3. 复用 C1 的 `toGrayscale()`, `toLuminance()` 辅助方法

## Impact

| 范围 | 说明 |
|------|------|
| **scope** | `packages/image-ops/src/worker/imageWorker.worker.ts` |
| **核心方法** | `applyBrightnessMaskCanvas()`, `applyLuminanceMaskCanvas()` |
| **依赖方** | C4 (测试) |

## Acceptance Criteria

- [ ] Brightness 蒙版使用 Canvas 2D 实现
- [ ] Luminance 蒙版使用 Canvas 2D 实现
- [ ] 数值与 JS 实现逐像素一致（±1 误差）
- [ ] Brightness 4K 处理 <60ms
- [ ] Luminance 4K 处理 <60ms

## Performance Target

| 图像尺寸 | 当前耗时 | 目标耗时 |
|----------|----------|----------|
| 4K (Brightness) | ~350ms | <60ms |
| 4K (Luminance) | ~350ms | <60ms |
