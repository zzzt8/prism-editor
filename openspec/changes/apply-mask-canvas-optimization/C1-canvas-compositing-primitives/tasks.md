# C1: Canvas 合成基元 - Tasks

> 派生自 meta-change: `apply-mask-canvas-optimization`
> 前置依赖: 无

## Implementation Tasks

### Task 1: 添加 Canvas 2D 辅助方法

```markdown
- [x] 实现 `toGrayscale(maskData: ImageData): Promise<ImageData>`
  - 使用 Canvas 2D 进行灰度转换
  - RGB = (R + G + B) / 3
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`

- [x] 实现 `toLuminance(maskData: ImageData): Promise<ImageData>`
  - 使用标准亮度公式: Y = 0.299R + 0.587G + 0.114B
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`

- [x] 实现 `applyThreshold(maskData: ImageData, threshold: number, invert: boolean): ImageData`
  - 生成二值蒙版
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`
```

### Task 2: 实现降级回退机制

```markdown
- [x] 实现 `applyMaskFallbackJS(image: ImageData, mask: ImageData, options: MaskOptions): ImageData`
  - 复用 `packages/image-ops/src/apply-mask.ts` 中的 JS 实现
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`

- [x] 实现 `applyMaskWithFallback()` 包装方法
  - 检测 OffscreenCanvas 可用性
  - Canvas 操作失败时回退到 JS
  - 文件: `packages/image-ops/src/worker/imageWorker.worker.ts`
```

### Task 3: 添加单元测试

```markdown
- [x] 添加灰度转换测试
  - 验证灰度公式正确性
  - 验证边界情况（1x1, 全白, 全黑）

- [x] 添加亮度转换测试
  - 验证亮度公式正确性
  - 对比标准公式计算结果

- [x] 添加阈值测试
  - 验证阈值判断逻辑
  - 验证 invert 行为

- [x] 添加降级测试
  - 模拟 OffscreenCanvas 不可用
  - 验证回退到 JS 实现
```

### Task 4: 验证数值一致性

```markdown
- [x] 实现数值对比辅助函数
  - 逐像素对比 Canvas 2D 和 JS 实现
  - 允许 ±1 浮点误差

- [x] 对灰度转换进行数值验证
  - 随机像素采样对比

- [x] 对亮度转换进行数值验证
  - 随机像素采样对比
```

## Verification

```bash
# 运行 image-ops 测试
pnpm test --filter=@prism/image-ops

# 验证 C1 相关测试覆盖
pnpm test --filter=@prism/image-ops -- --grep "toGrayscale|toLuminance|applyThreshold"
```
