# C3: Brightness/Luminance 蒙版 Canvas 实现 - Tasks

> 派生自 meta-change: `apply-mask-canvas-optimization`
> 前置依赖: C1-canvas-compositing-primitives

## Pre-conditions

- [x] C1-canvas-compositing-primitives 已完成
- [x] `toGrayscale()`, `toLuminance()` 辅助方法已实现

## Implementation Tasks

### Task 1: 实现 Brightness 蒙版 Canvas 方法

```markdown
- [x] 实现 `applyBrightnessMaskCanvas(image, mask, threshold, invert): Promise<ImageData>`
  - 灰度转换: (R+G+B)/3
  - 使用 `destination-in` 合成
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`
```

### Task 2: 实现 Luminance 蒙版 Canvas 方法

```markdown
- [x] 实现 `applyLuminanceMaskCanvas(image, mask, threshold, invert): Promise<ImageData>`
  - 亮度转换: 0.299R + 0.587G + 0.114B
  - 使用 `destination-in` 合成
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`
```

### Task 3: 集成到 applyMask 方法

```markdown
- [x] 修改 `applyMask()` 方法添加 brightness/luminance Canvas 路径
  - 在 switch 中添加 case 'brightness' 和 case 'luminance'
  - 复用 C1 的辅助方法
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`
```

### Task 4: 添加单元测试

```markdown
- [x] 测试 Brightness - 白色蒙版
  - 预期: 保留 RGB
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`

- [x] 测试 Brightness - 黑色蒙版
  - 预期: RGB 归零
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`

- [x] 测试 Brightness - 阈值处理
  - 预期: 正确裁剪
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`

- [x] 测试 Brightness - invert
  - 预期: 反转结果
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`

- [x] 测试 Luminance - 白色蒙版
  - 预期: 保留 RGB
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`

- [x] 测试 Luminance - 黑色蒙版
  - 预期: RGB 归零
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`

- [x] 测试 Luminance - 阈值处理
  - 预期: 正确裁剪
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`

- [x] 测试 Luminance - invert
  - 预期: 反转结果
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`
```

### Task 5: 添加性能基准测试

```markdown
- [x] 测试 Brightness 4K 性能
  - 目���: <100ms (JS 实现)
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`

- [x] 测试 Luminance 4K 性能
  - 目标: <100ms (JS 实现)
  - 文件: `packages/image-ops/src/canvas-compositing-primitives.test.ts`

- [x] 对比 Brightness vs Luminance 性能
  - 记录两者差异
```

### Task 6: 数值一致性验证

```markdown
- [x] 对 Brightness 实现进行数值验证
  - 与 JS 实现逐像素对比

- [x] 对 Luminance 实现进行数值验证
  - 与 JS 实现逐像素对比

- [x] 验证 Brightness/Luminance 公式正确性
  - 对比标准公式计算结果
```

## Verification

```bash
# 运行 image-ops 测试
pnpm test --filter=@prism/image-ops

# 验证 Brightness 蒙版测试覆盖
pnpm test --filter=@prism/image-ops -- src/canvas-compositing-primitives.test.ts

# 验证 Luminance 蒙版测试覆盖
pnpm test --filter=@prism/image-ops -- src/canvas-compositing-primitives.test.ts
```
