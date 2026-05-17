# @prism/image-ops

图像处理操作包，使用纯 Canvas API 实现。

## 功能

- **图像加载**: 从 URL、文件上传、Blob 加载图像
- **蒙版处理**: Alpha Mask、Brightness Mask、Luminance Mask
- **图像变换**: 裁剪、缩放、旋转、平移
- **图像合成**: 多层叠加、混合模式、透明度控制
- **图像导出**: PNG、JPEG、WebP 格式导出
- **Worker 池**: Web Worker 并行处理，提高性能
- **内存管理**: Canvas 对象池和内存优化

## 核心 API

### 加载图像

```typescript
import { loadImageFromUrl, loadImageFromBlob } from '@prism/image-ops';

const image = await loadImageFromUrl('https://example.com/image.png');
const image = await loadImageFromBlob(blob);
```

### 应用蒙版

```typescript
import { applyAlphaMask, applyBrightnessMask, applyLuminanceMask } from '@prism/image-ops';

const result = await applyAlphaMask(image, mask);
const result = await applyBrightnessMask(image, mask, threshold);
const result = await applyLuminanceMask(image, mask, threshold);
```

### 图像变换

```typescript
import { crop, resize, rotate, translate } from '@prism/image-ops';

const cropped = await crop(image, { x: 0, y: 0, width: 100, height: 100 });
const resized = await resize(image, { width: 200, height: 200 });
const rotated = await rotate(image, { angle: 45 });
const translated = await translate(image, { x: 10, y: 20 });
```

### 图像合成

```typescript
import { composite } from '@prism/image-ops';

const result = await composite(bottom, top, {
  mode: 'normal',      // normal, multiply, screen, overlay, etc.
  opacity: 0.8,
  position: { x: 0, y: 0 }
});
```

### 导出图像

```typescript
import { exportToPng, exportToJpeg, exportToWebp } from '@prism/image-ops';

const blob = await exportToPng(image, { quality: 1.0 });
const blob = await exportToJpeg(image, { quality: 0.9 });
const blob = await exportToWebp(image, { quality: 0.9 });
```

## 执行器

每个图像操作都有对应的执行器，可用于工作流引擎：

```typescript
import { executeTransform, executeComposite } from '@prism/image-ops';

const result = await executeTransform(context, params);
const result = await executeComposite(context, params);
```

## 依赖

- `@prism/shared-types` - 共享类型定义
- `comlink` - Web Worker 通信库

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm test:run` | 运行测试（Node.js 环境） |
| `pnpm test:browser` | 运行浏览器测试 |
| `pnpm clean` | 清理构建产物 |
