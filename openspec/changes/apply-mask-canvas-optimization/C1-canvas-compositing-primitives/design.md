# C1: Canvas 合成基元 - Design

> 派生自 meta-change: `apply-mask-canvas-optimization`
> 拆分原则: 见 [`apply-mask-canvas-optimization/design.md`](../../apply-mask-canvas-optimization/design.md)

## Repo Analysis

> **Repo Analysis**：见 [`apply-mask-canvas-optimization/repo-analysis.md`](../../apply-mask-canvas-optimization/repo-analysis.md)

## 实现设计

### 1. Canvas 2D 辅助方法

#### 1.1 toGrayscale()

将彩色蒙版转换为灰度图：

```typescript
private async toGrayscale(maskData: ImageData): Promise<ImageData> {
  const width = maskData.width;
  const height = maskData.height;
  
  // 使用 Canvas 2D 进行灰度转换
  const canvas = this.getCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.putImageData(maskData, 0, 0);
  
  // 使用 Canvas 2D 的 luminanceToAlpha 或手动灰度计算
  const result = ctx.getImageData(0, 0, width, height);
  const data = result.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    // 输出灰度图 (RGB 相同)
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  
  this.releaseCanvas(width, height);
  return result;
}
```

#### 1.2 toLuminance()

使用标准亮度公式转换：

```typescript
private async toLuminance(maskData: ImageData): Promise<ImageData> {
  const width = maskData.width;
  const height = maskData.height;
  
  const canvas = this.getCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.putImageData(maskData, 0, 0);
  
  const result = ctx.getImageData(0, 0, width, height);
  const data = result.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // 标准亮度公式
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = lum;
  }
  
  this.releaseCanvas(width, height);
  return result;
}
```

#### 1.3 applyThreshold()

应用阈值生成二值蒙版：

```typescript
private applyThreshold(
  maskData: ImageData,
  threshold: number,
  invert: boolean
): ImageData {
  const width = maskData.width;
  const height = maskData.height;
  const result = new ImageData(width, height);
  const src = maskData.data;
  const dst = result.data;
  
  for (let i = 0; i < src.length; i += 4) {
    const value = src[i]; // RGB 相同，取 R 即可
    let maskValue: number;
    
    if (invert) {
      maskValue = value < threshold ? 255 : 0;
    } else {
      maskValue = value >= threshold ? 255 : 0;
    }
    
    dst[i] = dst[i + 1] = dst[i + 2] = maskValue;
    dst[i + 3] = 255; // 完全不透明
  }
  
  return result;
}
```

### 2. 降级机制

```typescript
async applyMaskWithFallback(
  image: ImageData,
  mask: ImageData,
  options: MaskOptions,
  canvasFn: () => Promise<ImageData>
): Promise<ImageData> {
  // 检测 OffscreenCanvas 可用性
  if (typeof OffscreenCanvas === 'undefined') {
    console.warn('OffscreenCanvas not available, falling back to JS');
    return this.applyMaskFallbackJS(image, mask, options);
  }
  
  // 主要实现：Canvas 2D
  try {
    return await canvasFn();
  } catch (err) {
    console.warn('Canvas 2D operation failed, falling back to JS:', err);
    return this.applyMaskFallbackJS(image, mask, options);
  }
}
```

## 验收测试设计

| 测试用例 | 输入 | 预期输出 |
|----------|------|----------|
| 灰度转换 - 白色像素 | R=255,G=255,B=255 | R=255,G=255,B=255 |
| 灰度转换 - 黑色像素 | R=0,G=0,B=0 | R=0,G=0,B=0 |
| 灰度转换 - 灰色像素 | R=100,G=100,B=100 | R=100,G=100,B=100 |
| 灰度转换 - 彩色像素 | R=255,G=0,B=0 | R=85,G=85,B=85 (≈255/3) |
| 亮度转换 - 标准公式验证 | R=255,G=255,B=0 | Y≈176 |
| 阈值 - 普通 | 值=128, 阈值=128 | 255 |
| 阈值 - invert | 值=128, 阈值=128, invert=true | 0 |
