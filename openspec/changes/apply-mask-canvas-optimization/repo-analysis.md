# Repo Analysis: Apply Mask Performance Optimization

> 本分析由 meta-change `apply-mask-canvas-optimization` 全局扫描生成。
> 所有子 change 共享本分析结论，不要重复扫描。

## Global Impact Map

### 模块依赖关系

```
┌─────────────────────────────────────────────────────────────────────┐
│                        模块依赖图                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐                                                 │
│   │  dev-tool    │                                                 │
│   │  (editor)    │                                                 │
│   └──────┬───────┘                                                 │
│          │ uses                                                     │
│          ▼                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│   │ workflow-core │────▶│ image-ops    │◀────│node-definitions│       │
│   │  (engine)    │     │  (engine)    │     │   (engine)    │       │
│   └──────────────┘     └──────┬───────┘     └──────────────┘       │
│                               │                                     │
│                               │ uses                                │
│                               ▼                                     │
│                        ┌──────────────┐                             │
│                        │ shared-types │                             │
│                        │   (types)   │                             │
│                        └──────────────┘                             │
│                                                                     │
│   ┌──────────────┐                                                 │
│   │   server     │                                                 │
│   │ (backend)   │──── No relation to image processing              │
│   └──────────────┘                                                 │
│                                                                     │
│   ┌──────────────┐                                                 │
│   │  user-app    │──── Uses workflow-core + image-ops              │
│   │  (runtime)   │     but NOT apply-mask directly                 │
│   └──────────────┘                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 当前 apply-mask 相关代码分布

| 文件路径 | 职责 | 当前实现方式 |
|----------|------|--------------|
| `packages/image-ops/src/worker/imageWorker.worker.ts` | Worker 中的 applyMask 实现 | JS 像素循环 |
| `packages/image-ops/src/apply-mask.ts` | 主线程 fallback + executor | JS 像素循环 |
| `packages/image-ops/src/worker/canvasPool.ts` | Canvas 对象池 | 已实现 |
| `packages/image-ops/src/composite.ts` | 图像合成 | Canvas 2D `drawImage` |

### 核心依赖链

```
applyMaskExecutor (apply-mask.ts)
    │
    ├── depends on: WorkerRunner (scheduler/workerRunner.ts)
    │                   │
    │                   └── depends on: WorkerPool (scheduler/workerPool.ts)
    │                                       │
    │                                       └── depends on: ImageWorker (worker/imageWorker.worker.ts)
    │                                                           │
    │                                                           └── uses: CanvasPool (worker/canvasPool.ts)
    │
    └── depends on: applyMask (apply-mask.ts - fallback)
```

### 高耦合区域分析

#### 1. ImageWorker.applyMask() — 性能瓶颈

**位置**: `packages/image-ops/src/worker/imageWorker.worker.ts` 第 279-342 行

**当前实现**:
```typescript
async applyMask(image: ImageData, mask: ImageData, options: MaskOptions) {
  // JS 像素循环 — 性能瓶颈
  for (let i = 0; i < src.length; i += 4) {
    let maskValue: number;
    if (type === 'alpha') {
      maskValue = msk[i + 3] / 255;
    } else if (type === 'brightness') {
      maskValue = ((msk[i] + msk[i + 1] + msk[i + 2]) / 3) / 255;
    } else {
      maskValue = (0.299 * msk[i] + 0.587 * msk[i + 1] + 0.114 * msk[i + 2]) / 255;
    }
    // ... threshold and mask application
  }
}
```

**问题**: 逐像素 JS 循环，无法利用 GPU 加速

#### 2. applyMask() fallback — 主线程实现

**位置**: `packages/image-ops/src/apply-mask.ts` 第 22-146 行

**实现方式**: 与 Worker 实现相同的 JS 像素循环

**何时使用**: `OffscreenCanvas` 不可用时（如某些旧浏览器）

#### 3. Composite — 性能标杆

**位置**: `packages/image-ops/src/worker/imageWorker.worker.ts` 第 218-274 行

**实现方式**: Canvas 2D `drawImage` + `globalCompositeOperation`

**性能**: 4K 图像 ~30-50ms

**参考价值**: 证明 Canvas 2D 方案可行

### 跨层联动点

本次优化**不涉及跨层联动**，所有改动都在 `engine` layer 内：

| Layer | 涉及文件 | 改动类型 |
|-------|----------|----------|
| `engine` | `packages/image-ops/src/worker/imageWorker.worker.ts` | 重构 |
| `engine` | `packages/image-ops/src/apply-mask.ts` | 无改动（API 兼容） |
| `engine` | `packages/image-ops/src/worker/canvasPool.ts` | 扩展（如需要） |
| `engine` | `packages/image-ops/src/apply-mask.test.ts` | 新增测试 |

### 现有测试覆盖

| 测试文件 | 覆盖范围 | 状态 |
|----------|----------|------|
| `packages/image-ops/src/apply-mask.test.ts` | Alpha/Brightness/Luminance 蒙版逻辑 | 需扩展性能测试 |
| `packages/image-ops/src/composite.test.ts` | Composite 正确性 + 性能 | 可参考 |
| `packages/image-ops/src/workerPool.test.ts` | Worker 池功能 | 可复用 |

### 性能基准现状

| 操作 | 图像尺寸 | 当前耗时 | 目标耗时 |
|------|----------|----------|----------|
| ApplyMask (alpha) | 4K | ~300ms | <50ms |
| ApplyMask (brightness) | 4K | ~350ms | <60ms |
| ApplyMask (luminance) | 4K | ~350ms | <60ms |
| Composite | 4K | ~50ms | ~50ms (基准) |

### 内存使用分析

| 阶段 | 内存占用 | 说明 |
|------|----------|------|
| 原始 ImageData | ~32MB (4K) | 3840×2160×4 |
| 原始 MaskData | ~32MB (4K) | 同上 |
| srcCanvas | ~32MB | 用于 putImageData |
| maskCanvas | ~32MB | 用于 putImageData |
| dstCanvas | ~32MB | 合成结果 |
| result ImageData | ~32MB | 最终结果 |
| **峰值总计** | ~192MB | 在 500MB 限制内 |

### 兼容性检查

| 环境 | OffscreenCanvas 支持 | Canvas 2D 加速 |
|------|---------------------|----------------|
| Chrome 69+ | ✅ | ✅ GPU |
| Edge 79+ | ✅ | ✅ GPU |
| Safari 16+ | ✅ | ✅ GPU (iOS 16+) |
| Firefox 105+ | ✅ | ⚠️ 软件渲染 |
| Safari <16 | ✅ | ⚠️ 有限 |
| Node.js | ❌ | N/A |

**降级策略**:
- 检测 `typeof OffscreenCanvas !== 'undefined'`
- 不可用时回退到主线程 JS 实现
- Canvas 操作失败时记录警告并回退

### 相关参考文件

- 设计文档: `docs/apply-mask-optimization/DESIGN.md`
- 总结报告: `docs/apply-mask-optimization/SUMMARY.md`
- Canvas 2D Composite 实现: `packages/image-ops/src/worker/imageWorker.worker.ts` 第 218-274 行
- CanvasPool 实现: `packages/image-ops/src/worker/canvasPool.ts`

---

*分析版本: 1.0 | 分析日期: 2026-04-06*
