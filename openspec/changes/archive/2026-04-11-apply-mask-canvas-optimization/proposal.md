---
name: apply-mask-canvas-optimization
description: Apply Mask 性能优化 - 使用 Canvas 2D 替代 JavaScript 像素循环
version: 1.0
date: 2026-04-06
type: meta-change
status: planned
---

# Proposal: Apply Mask Canvas 2D 性能优化

## Why

当前 `apply-mask` 节点使用纯 JavaScript 像素循环（`for` 循环遍历 `Uint8ClampedArray`），导致 4K 图像处理耗时约 300-500ms，而同样使用 Canvas 2D 的 `composite` 节点仅需 30-50ms。

**问题根因**：
- JS 循环无法利用 CPU SIMD 指令
- V8 JIT 编译开销
- 逐像素操作的串行本质

**业务影响**：
- 用户等待时间长，体验差
- 4K/8K 图像处理不可用
- 与 Composite 性能差距过大（5-10x）

## What Changes

本次规划将 `apply-mask` 的核心算法从 JavaScript 像素循环重构为 Canvas 2D 合成操作：

| 变更项 | 当前实现 | 目标实现 |
|--------|----------|----------|
| Alpha 蒙版 | JS for 循环 | `destination-in` 合成操作 |
| Brightness 蒙版 | JS for 循环 | 灰度预处理 + `destination-in` |
| Luminance 蒙版 | JS for 循环 | 亮度转换 + `destination-in` |
| 性能目标 | ~300ms (4K) | <50ms (4K) |

## Impact Summary

### Layer 影响范围

| Layer | 影响 | 说明 |
|-------|------|------|
| `engine` | ✅ 主要改动 | `packages/image-ops/` 核心逻辑变更 |
| `backend` | ❌ 无影响 | 不涉及服务器端 |
| `editor` | ❌ 无影响 | 不涉及 UI |
| `runtime` | ❌ 无影响 | 不涉及用户运行时 |
| `ui-skin` | ❌ 无影响 | 不涉及设计系统 |

### 关联模块

| 模块 | 关联方式 |
|------|----------|
| `packages/image-ops/src/worker/imageWorker.worker.ts` | `applyMask()` 方法重写 |
| `packages/image-ops/src/apply-mask.ts` | 保留 API，向后兼容 |
| `packages/image-ops/src/worker/canvasPool.ts` | Canvas 对象池扩展 |
| `packages/image-ops/src/apply-mask.test.ts` | 性能基准测试新增 |

### 兼容性

| 浏览器 | 版本 | 支持 |
|--------|------|------|
| Chrome | 69+ | ✅ |
| Edge | 79+ | ✅ |
| Safari | 16+ | ✅ |
| Firefox | 105+ | ✅ |

降级策略：检测 `OffscreenCanvas` 可用性，不可用时回退到 JS 实现。

## Why Split into Multiple Changes

虽然改动集中在单个文件（`imageWorker.worker.ts`），但为保证质量和可验证性，拆分为：

1. **C1: Canvas 合成基元** — 实现 Canvas 2D 合成操作基础设施
2. **C2: Alpha 蒙版 Canvas 实现** — 最常用场景优先实现
3. **C3: Brightness/Luminance 蒙版 Canvas 实现** — 扩展支持
4. **C4: 性能基准与验收测试** — 确保性能目标达成

拆分原则：
- 每个 change 可独立验证
- 降低单次变更风险
- 便于逐步发布和回滚

## Goals

| 目标 | 指标 |
|------|------|
| 4K 图像 Apply Mask 耗时 | <50ms（当前 ~300ms） |
| 8K 图像 Apply Mask 耗时 | <200ms（当前 ~1200ms） |
| 与 Composite 性能差距 | <2x（当前 5-10x） |
| API 向后兼容 | 100% |
| 现有测试通过率 | 100% |

## Non-Goals

- 不修改 `apply-mask` 节点的 API 接口
- 不修改 `apply-mask` 节点的 UI 参数面板
- 不实现 WASM SIMD 优化（作为 Phase 2 备选）
- 不修改其他图像处理操作（composite/transform/load-image）

## Risks

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Canvas 2D 结果与 JS 循环有数值差异 | 低 | 高 | 逐像素对比测试 |
| 老浏览器兼容性问题 | 低 | 中 | 降级回退机制 |
| 内存泄漏（Canvas 未释放） | 中 | 中 | 使用 CanvasPool + finally |
