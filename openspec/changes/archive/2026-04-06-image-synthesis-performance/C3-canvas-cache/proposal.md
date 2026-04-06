---
name: image-synthesis-performance/C3-canvas-cache
type: change
created: 2026-04-06
description: Worker 内复用 OffscreenCanvas 实例，减少内存分配和 GC 压力
status: active
parent: image-synthesis-performance
tags:
  - performance
  - image-ops
  - worker
  - canvas
layers:
  - engine
depends_on: []
priority: P1
---

# C3: Canvas 实例缓存

> 派生自 meta-change: `image-synthesis-performance`

## Why

当前每次图像操作都创建新的 OffscreenCanvas 实例：

```typescript
async composite(...) {
  const baseCanvas = new OffscreenCanvas(width, height);
  const overlayCanvas = new OffscreenCanvas(width, height);
  // ... 使用后等待 GC 回收
}
```

4K 图（4096×4096）= 64MB × 2 = 128MB 内存反复分配/回收，频繁的 GC 会导致卡顿。

## What Changes

- 在 ImageWorker 内添加 CanvasPool 类
- 按尺寸缓存 OffscreenCanvas 实例
- 添加 TTL 和 LRU 驱逐策略
- 复用已有 Canvas 进行图像操作

## Impact Summary

|| Layer | 文件 | 影响 |
|-------|------|------|
| engine | `packages/image-ops/src/worker/imageWorker.worker.ts` | Canvas 池管理 |

> **Repo Analysis**：见 [`image-synthesis-performance/repo-analysis.md`](../../image-synthesis-performance/repo-analysis.md)
