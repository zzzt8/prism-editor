---
name: image-synthesis-performance/C4-lazy-preview
type: change
created: 2026-04-06
description: 首次执行只返回 ImageData，后续异步生成预览，减少主线程阻塞
status: active
parent: image-synthesis-performance
tags:
  - performance
  - image-ops
  - preview
layers:
  - engine
depends_on: []
priority: P2
---

# C4: 预览延迟生成

> 派生自 meta-change: `image-synthesis-performance`

## Why

当前每个 executor 完成后立即生成 PNG Blob：

```typescript
// composite.ts
const previewCanvas = new OffscreenCanvas(result.width, result.height);
const blob = await previewCanvas.convertToBlob({ type: 'image/png' });
const previewRef = getImageMemoryManager().createObjectURL(blob, ...);
```

对于复杂的图像处理流水线，每个节点都做 PNG 编码会消耗大量 CPU。延迟生成可以让主线程专注于核心计算。

## What Changes

- 引入 PreviewStrategy 接口，支持不同预览生成策略
- 实现 EagerPreviewStrategy（立即生成，向后兼容）
- 实现 LazyPreviewStrategy（延迟生成，优化性能）
- 所有 executor 默认使用 LazyPreviewStrategy

## Impact Summary

|| Layer | 文件 | 影响 |
|-------|------|------|
| engine | 所有 executor 文件 | 预览生成策略可选 |
| engine | `packages/image-ops/src/preview-strategy.ts` | 新增接口和实现 |

> **Repo Analysis**：见 [`image-synthesis-performance/repo-analysis.md`](../../image-synthesis-performance/repo-analysis.md)
