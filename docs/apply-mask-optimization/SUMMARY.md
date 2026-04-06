# Apply Mask 性能优化 - 总结报告

## 问题回顾

**问题**: Apply Mask 操作耗时比 Image Composite 多 5-10 倍

**根本原因**: Apply Mask 使用纯 JavaScript 像素循环，Composite 使用 Canvas 2D API (GPU 加速)

---

## 解决方案

### 核心思路

使用 Canvas 2D 的 `globalCompositeOperation` (特别是 `destination-in`) 替代 JavaScript `for` 循环。

### 实现要点

1. **Alpha 蒙版**: 直接使用 `destination-in` 合成操作
2. **Brightness/Luminance 蒙版**: 先将蒙版转换为灰度图，再使用 `destination-in`
3. **Canvas 对象池**: 复用 OffscreenCanvas 减少内存分配

---

## 预期收益

| 图像尺寸 | 当前耗时 | 优化后耗时 | 提升 |
|----------|----------|------------|------|
| 1080p | ~80ms | ~10ms | **8x** |
| 4K | ~300ms | ~40ms | **7.5x** |
| 8K | ~1200ms | ~160ms | **7.5x** |

---

## 修改文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `packages/image-ops/src/worker/imageWorker.worker.ts` | 重构 | `applyMask()` 方法改用 Canvas 2D |
| `packages/image-ops/src/worker/canvasPool.ts` | 增强 | 支持显式 Canvas 释放 |
| `packages/image-ops/src/apply-mask.ts` | 测试 | 添加性能基准测试 |

---

## 兼容性

- Chrome 69+ ✅
- Edge 79+ ✅
- Safari 16+ ✅
- Firefox 105+ ✅

降级策略: 在不支持的环境自动回退到 JS 实现。

---

## 下一步行动

1. **立即执行**: Phase 1 - Canvas 2D 重构 (Week 1-2)
2. **验证**: Phase 2 - 性能测试与优化 (Week 3-4)
3. **可选**: Phase 3 - WASM SIMD 探索

---

*最后更新: 2026-04-06*
