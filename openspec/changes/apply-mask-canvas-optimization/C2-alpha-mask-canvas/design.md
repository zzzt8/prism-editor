# C2: Alpha 蒙版 Canvas 实现 - Design

> 派生自 meta-change: `apply-mask-canvas-optimization`
> 拆分原则: 见 [`apply-mask-canvas-optimization/design.md`](../../apply-mask-canvas-optimization/design.md)

## Repo Analysis

> **Repo Analysis**：见 [`apply-mask-canvas-optimization/repo-analysis.md`](../../apply-mask-canvas-optimization/repo-analysis.md)

## 实现设计

### 1. Alpha 蒙版 Canvas 实现

#### 原理

使用 Canvas 2D 的 `destination-in` 合成操作：
- 先将原图绘制到目标 Canvas
- 再将蒙版用 `destination-in` 绘制
- 结果：只保留原图中与蒙版 alpha 通道重叠的部分

#### 实现代码

```typescript
async applyMaskCanvas(
  image: ImageData,
  mask: ImageData,
  options: MaskOptions
): Promise<WorkerImageResult> {
  const { type, threshold = 128, invert = false } = options;
  
  // 仅处理 Alpha 蒙版
  if (type !== 'alpha') {
    throw new Error('C2: applyMaskCanvas 只处理 alpha 类型');
  }
  
  const width = image.width;
  const height = image.height;
  
  let srcCanvas: OffscreenCanvas | null = null;
  let maskCanvas: OffscreenCanvas | null = null;
  let dstCanvas: OffscreenCanvas | null = null;
  
  try {
    // 1. 调整蒙版尺寸（如需要）
    let maskData = mask;
    if (mask.width !== width || mask.height !== height) {
      maskData = (await this.resize(mask, width, height)).data;
    }
    
    // 2. 创建 Canvas 缓冲区
    srcCanvas = this.getCanvas(width, height);
    maskCanvas = this.getCanvas(width, height);
    dstCanvas = this.getCanvas(width, height);
    
    const srcCtx = srcCanvas.getContext('2d')!;
    const maskCtx = maskCanvas.getContext('2d')!;
    const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;
    
    // 3. 绘制原图和蒙版
    srcCtx.putImageData(image, 0, 0);
    maskCtx.putImageData(maskData, 0, 0);
    
    // 4. Canvas 合成操作
    dstCtx.clearRect(0, 0, width, height);
    
    // 先绘制原图
    dstCtx.globalCompositeOperation = 'source-over';
    dstCtx.drawImage(srcCanvas, 0, 0);
    
    // 用蒙版的 alpha 通道裁剪
    dstCtx.globalCompositeOperation = 'destination-in';
    dstCtx.drawImage(maskCanvas, 0, 0);
    
    // 5. 应用阈值和 invert（如需要）
    let result: ImageData;
    if (threshold !== 128 || invert) {
      // 需要后处理：使用 JS 进行阈值处理
      const rawResult = dstCtx.getImageData(0, 0, width, height);
      result = this.applyAlphaThreshold(rawResult, threshold, invert);
    } else {
      result = dstCtx.getImageData(0, 0, width, height);
    }
    
    this.processedCount++;
    
    return { data: result, width, height, colorSpace: result.colorSpace };
  } catch (err) {
    this.lastError = err instanceof Error ? err.message : 'Canvas alpha mask failed';
    this.errorCount++;
    throw err;
  } finally {
    if (srcCanvas) this.releaseCanvas(srcCanvas.width, srcCanvas.height);
    if (maskCanvas) this.releaseCanvas(maskCanvas.width, maskCanvas.height);
    if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
  }
}

// Alpha 阈值后处理
private applyAlphaThreshold(
  imageData: ImageData,
  threshold: number,
  invert: boolean
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  
  const thresholdNorm = threshold / 255;
  
  for (let i = 0; i < result.data.length; i += 4) {
    let maskValue = result.data[i + 3] / 255;
    
    if (invert) {
      maskValue = 1 - maskValue;
    }
    
    const finalValue = maskValue > thresholdNorm ? 255 : 0;
    result.data[i + 3] = (result.data[i + 3] * finalValue) / 255;
  }
  
  return result;
}
```

### 2. 集成到 applyMask

在现有的 `applyMask()` 方法中添加 Canvas 2D 路径：

```typescript
async applyMask(
  image: ImageData,
  mask: ImageData,
  options: MaskOptions
): Promise<WorkerImageResult> {
  // 检测 OffscreenCanvas 可用性
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      // Canvas 2D 路径
      return await this.applyMaskCanvas(image, mask, options);
    } catch (err) {
      console.warn('Canvas 2D mask failed, falling back to JS:', err);
    }
  }
  
  // JS fallback
  return this.applyMaskFallbackJS(image, mask, options);
}
```

## 数值一致性验证

### 验证策略

1. **逐像素对比**: Canvas 2D 结果 vs JS 结果
2. **允许误差**: ±1 (浮点精度)

### 验证伪代码

```typescript
function validateCanvasVsJS(
  canvasResult: ImageData,
  jsResult: ImageData,
  testName: string
): boolean {
  const tolerance = 1;
  for (let i = 0; i < canvasResult.data.length; i++) {
    const diff = Math.abs(canvasResult.data[i] - jsResult.data[i]);
    if (diff > tolerance) {
      console.error(`${testName}: Pixel mismatch at ${i}: ${canvasResult.data[i]} vs ${jsResult.data[i]}`);
      return false;
    }
  }
  return true;
}
```

## 验收测试用例

| 测试用例 | 输入 | 预期 | 验证方法 |
|----------|------|------|----------|
| Alpha 蒙版 - 全透明蒙版 | 原图 + 透明蒙版 | 全透明 | 逐像素 |
| Alpha 蒙版 - 全不透明蒙版 | 原图 + 不透明蒙版 | 原图不变 | 逐像素 |
| Alpha 蒙版 - 半透明蒙版 | 原图 + 50% alpha 蒙版 | 半透明 | 逐像素 |
| Alpha 蒙版 - 阈值 128 | 原图 + alpha=128 蒙版 | 正确裁剪 | 逐像素 |
| Alpha 蒙版 - invert | 原图 + invert=true | 正确反转 | 逐像素 |
| 4K 性能 | 3840×2160 图像 | <50ms | Performance.now() |
| 8K 性能 | 7680×4320 图像 | <200ms | Performance.now() |
