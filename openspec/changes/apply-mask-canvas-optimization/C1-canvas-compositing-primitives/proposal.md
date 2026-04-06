---
name: C1-canvas-compositing-primitives
description: Canvas 2D 蒙版合成基础设施
version: 1.0
date: 2026-04-06
type: sub-change
status: planned
parent: apply-mask-canvas-optimization
layer: engine
priority: P0
depends_on: []
---

# C1: Canvas 合成基元

> 派生自 meta-change: `apply-mask-canvas-optimization`

## Goal

实现 Canvas 2D 蒙版合成的通用基础设施，为 Alpha/Brightness/Luminance 蒙版提供统一的渲染管道。

## What Changes

1. 在 `ImageWorker` 中添加 Canvas 2D 渲染辅助方法
2. 实现灰度/亮度蒙版预处理管道
3. 实现通用的 `destination-in` 合成操作辅助方法
4. 建立降级回退机制

## Impact

| 范围 | 说明 |
|------|------|
| **scope** | `packages/image-ops/src/worker/imageWorker.worker.ts` |
| **新增方法** | `applyMaskCanvasBase()`, `toGrayscale()`, `toLuminance()` |
| **依赖方** | C2, C3 |

## Acceptance Criteria

- [ ] `toGrayscale()` 方法正确实现
- [ ] `toLuminance()` 方法正确实现
- [ ] `destinationIn()` 合成辅助方法正确实现
- [ ] 降级回退机制正常工作
- [ ] 数值与 JS 实现一致（±1 误差）
