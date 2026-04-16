# C3: Brightness/Luminance 蒙版 Canvas 实现 - Design

> 派生自 meta-change: `apply-mask-canvas-optimization`
> 拆分原则: 见 [`apply-mask-canvas-optimization/design.md`](../../apply-mask-canvas-optimization/design.md)

## Repo Analysis

> **Repo Analysis**：见 [`apply-mask-canvas-optimization/repo-analysis.md`](../../apply-mask-canvas-optimization/repo-analysis.md)

## 实现设计

### 1. Brightness 蒙版实现

#### 原理

Brightness（亮度）= (R + G + B) / 3

步骤：
1. 将蒙版转换为灰度图
2. 应用阈值生成二值蒙版
3. 使用 `destination-in` 合成

#### 实现代码

```typescript
async applyBrightnessMaskCanvas(
  image: ImageData,
  mask: ImageData,
  threshold: number,
  invert: boolean
): Promise<ImageData> {
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
    
    // 2. 转换为灰度
    const grayscale = await this.toGrayscale(maskData);
    
    // 3. 应用阈值
    const binaryMask = this.applyThreshold(grayscale, threshold, invert);
    
    // 4. 创建 Canvas
    srcCanvas = this.getCanvas(width, height);
    maskCanvas = this.getCanvas(width, height);
    dstCanvas = this.getCanvas(width, height);
    
    const srcCtx = srcCanvas.getContext('2d')!;
    const maskCtx = maskCanvas.getContext('2d')!;
    const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;
    
    // 5. 绘制并合成
    srcCtx.putImageData(image, 0, 0);
    maskCtx.putImageData(binaryMask, 0, 0);
    
    dstCtx.clearRect(0, 0, width, height);
    dstCtx.globalCompositeOperation = 'source-over';
    dstCtx.drawImage(srcCanvas, 0, 0);
    dstCtx.globalCompositeOperation = 'destination-in';
    dstCtx.drawImage(maskCanvas, 0, 0);
    
    return dstCtx.getImageData(0, 0, width, height);
  } finally {
    if (srcCanvas) this.releaseCanvas(width, height);
    if (maskCanvas) this.releaseCanvas(width, height);
    if (dstCanvas) this.releaseCanvas(width, height);
  }
}
```

### 2. Luminance 蒙版实现

#### 原理

Luminance（亮度）= 0.299R + 0.587G + 0.114B（ITU-R BT.601 标准）

步骤：
1. 将蒙版转换为亮度图
2. 应用阈值生成二值蒙版
3. 使用 `destination-in` 合成

#### 实现代码

```typescript
async applyLuminanceMaskCanvas(
  image: ImageData,
  mask: ImageData,
  threshold: number,
  invert: boolean
): Promise<ImageData> {
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
    
    // 2. 转换为亮度图
    const luminance = await this.toLuminance(maskData);
    
    // 3. 应用阈值
    const binaryMask = this.applyThreshold(luminance, threshold, invert);
    
    // 4. 创建 Canvas
    srcCanvas = this.getCanvas(width, height);
    maskCanvas = this.getCanvas(width, height);
    dstCanvas = this.getCanvas(width, height);
    
    const srcCtx = srcCanvas.getContext('2d')!;
    const maskCtx = maskCanvas.getContext('2d')!;
    const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;
    
    // 5. 绘制并合成
    srcCtx.putImageData(image, 0, 0);
    maskCtx.putImageData(binaryMask, 0, 0);
    
    dstCtx.clearRect(0, 0, width, height);
    dstCtx.globalCompositeOperation = 'source-over';
    dstCtx.drawImage(srcCanvas, 0, 0);
    dstCtx.globalCompositeOperation = 'destination-in';
    dstCtx.drawImage(maskCanvas, 0, 0);
    
    return dstCtx.getImageData(0, 0, width, height);
  } finally {
    if (srcCanvas) this.releaseCanvas(width, height);
    if (maskCanvas) this.releaseCanvas(width, height);
    if (dstCanvas) this.releaseCanvas(width, height);
  }
}
```

### 3. 集成到 applyMask

```typescript
async applyMask(
  image: ImageData,
  mask: ImageData,
  options: MaskOptions
): Promise<WorkerImageResult> {
  const { type, threshold = 128, invert = false } = options;
  
  // Canvas 2D 路径
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      switch (type) {
        case 'alpha':
          return await this.applyMaskCanvas(image, mask, options);
        case 'brightness':
          return { 
            data: await this.applyBrightnessMaskCanvas(image, mask, threshold, invert),
            width: image.width,
            height: image.height,
            colorSpace: image.colorSpace
          };
        case 'luminance':
          return {
            data: await this.applyLuminanceMaskCanvas(image, mask, threshold, invert),
            width: image.width,
            height: image.height,
            colorSpace: image.colorSpace
          };
        default:
          throw new Error(`Unknown mask type: ${type}`);
      }
    } catch (err) {
      console.warn('Canvas 2D mask failed, falling back to JS:', err);
    }
  }
  
  // JS fallback
  return this.applyMaskFallbackJS(image, mask, options);
}
```

## Brightness vs Luminance 对比

| 特性 | Brightness | Luminance |
|------|------------|-----------|
| 公式 | (R+G+B)/3 | 0.299R + 0.587G + 0.114B |
| 权重 | 均等 | 人眼敏感度加权 |
| 适用场景 | 简单亮度检测 | 感知亮度（更准确） |

## 验收测试用例

| 测试用例 | 输入 | 预期 | 验证方法 |
|----------|------|------|----------|
| Brightness - 白色蒙版 | 白色蒙版 | 完全不透明 | 逐像素 |
| Brightness - 黑色蒙版 | 黑色蒙版 | 完全透明 | 逐像素 |
| Brightness - 阈值 128 | 灰色=128 | 正确裁剪 | 逐像素 |
| Brightness - invert | invert=true | 反转结果 | 逐像素 |
| Luminance - 白色蒙版 | 白色蒙版 | 完全不透明 | 逐像素 |
| Luminance - 黑色蒙版 | 黑色蒙版 | 完全透明 | 逐像素 |
| Luminance - 阈值 128 | 亮度=128 | 正确裁剪 | 逐像素 |
| Luminance - invert | invert=true | 反转结果 | 逐像素 |
| 4K 性能 | 3840×2160 | <60ms | Performance.now() |
