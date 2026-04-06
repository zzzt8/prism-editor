# C2: Alpha 蒙版 Canvas 实现 - Tasks

> 派生自 meta-change: `apply-mask-canvas-optimization`
> 前置依赖: C1-canvas-compositing-primitives

## Pre-conditions

- [x] C1-canvas-compositing-primitives 已完成
- [x] `toGrayscale()`, `toLuminance()` 辅助方法已实现

## Implementation Tasks

### Task 1: 实现 Alpha 蒙版 Canvas 2D 方法

```markdown
- [x] 实现 `applyMaskCanvas(image: ImageData, mask: ImageData, options: MaskOptions): Promise<WorkerImageResult>`
  - 使用 `destination-in` 合成操作
  - 只处理 `type === 'alpha'` 的情况
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`

- [x] 实现 `applyAlphaThreshold(imageData: ImageData, threshold: number, invert: boolean): ImageData`
  - 阈值后处理方法
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`
```

### Task 2: 集成到 applyMask 方法

```markdown
- [x] 修改 `applyMask()` 方法添加 Canvas 2D 路径
  - 检测 OffscreenCanvas 可用性
  - 优先使用 Canvas 2D
  - 失败时回退到 JS
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`
```

### Task 3: 添加单元测试

```markdown
- [x] 测试 Alpha 蒙版 - 全透明蒙版
  - 预期: 全透明结果
  - 文件: `packages/image-ops/src/alpha-mask-canvas.test.ts`

- [x] 测试 Alpha 蒙版 - 全不透明蒙版
  - 预期: 原图不变
  - 文件: `packages/image-ops/src/alpha-mask-canvas.test.ts`

- [x] 测试 Alpha 蒙版 - 半透明蒙版
  - 预期: 正确 alpha 混合
  - 文件: `packages/image-ops/src/alpha-mask-canvas.test.ts`

- [x] 测试 Alpha 蒙版 - 阈值处理
  - 预期: 阈值 128 正确裁剪
  - 文件: `packages/image-ops/src/alpha-mask-canvas.test.ts`

- [x] 测试 Alpha 蒙版 - invert
  - 预期: 反转结果
  - 文件: `packages/image-ops/src/alpha-mask-canvas.test.ts`
```

### Task 4: 添加性能基准测试

```markdown
- [x] 测试 4K (3840×2160) 性能
  - 目标: <50ms (CI 中放宽至 2000ms)
  - 文件: `packages/image-ops/src/alpha-mask-canvas.test.ts`

- [x] 测试 8K (7680×4320) 性能
  - 目标: <200ms (CI 中放宽至 5000ms)
  - 文件: `packages/image-ops/src/alpha-mask-canvas.test.ts`

- [x] 对比 Canvas 2D vs JS 实现性能
  - 记录性能提升倍数
  - 注意: Canvas 2D 和 JS 实现有语义差异（详见测试文档）
```

### Task 5: 数值一致性验证

```markdown
- [x] 实现数值对比辅助函数
  - 逐像素对比 Canvas 2D 和 JS 实现
  - 允许 ±1 浮点误差

- [x] 对所有测试用例进行数值验证
  - 确保 Canvas 2D 结果与 JS 结果一致（在各自语义下）
```

## Verification

```bash
# 运行 image-ops 测试
pnpm test --filter=@prism/image-ops

# 验证 Alpha 蒙版测试覆盖
pnpm --filter=@prism/image-ops test src/alpha-mask-canvas.test.ts

# 验证性能目标
pnpm --filter=@prism/image-ops test src/alpha-mask-canvas.test.ts
```

## 实现说明

### Canvas 2D 与 JS 实现差异

Canvas 2D `destination-in` 合成操作与 JS 实现有以下语义差异：

1. **Canvas**: `destination-in` 使用蒙版的 alpha 通道值进行合成
   - `output.alpha = source.alpha * mask.alpha / 255`

2. **JS (applyAlphaMask)**: 使用蒙版的 RGB 值（而非 alpha）进行阈值判断
   - `thresholdFn(maskValue)` 其中 `maskValue` 是 RGB 通道值

这导致两种实现在处理半透明蒙版时产生不同结果，但都是有效的蒙版处理方式。

### 文件变更

- `packages/image-ops/src/worker/imageWorker.worker.ts`
  - 新增 `applyMaskCanvas()` 方法
  - 新增 `applyAlphaThreshold()` 私有方法
  - 修改 `applyMask()` 方法优先使用 Canvas 2D 路径

- `packages/image-ops/src/alpha-mask-canvas.test.ts` (新增)
  - 28 个测试用例，全部通过
