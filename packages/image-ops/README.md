# @prism/image-ops

图像处理操作包，使用纯 Canvas API 实现。提供 LoadImage / LoadMask / Transform / ApplyMask / Composite / Export / EmptyInput 七个内置节点的 executor，以及 Worker 池、TaskScheduler、内存管理等运行时支撑能力。

## 功能

- **图像加载**: 从 URL、文件上传、Blob 加载图像（`loadImageFromUrl` / `loadImageFromBlob`）
- **蒙版处理**: Alpha Mask、Brightness Mask、Luminance Mask（`applyAlphaMask` / `applyBrightnessMask` / `applyLuminanceMask`）
- **图像变换**: 裁剪、缩放、旋转、平移（`crop` / `resize` / `rotate` / `translate`）
- **图像合成**: 多层叠加、混合模式、透明度控制（`composite`）
- **图像导出**: PNG / JPEG / WebP 格式导出（`exportToPng` / `exportToJpeg` / `exportToWebp`）
- **Worker 池**: Web Worker 并行处理，通过 Comlink 通信（`workerPool`）
- **内存管理**: Canvas 对象池复用，降低 GC 压力（`memoryManager`）
- **任务调度**: `TaskScheduler` 统一管理同步 / 异步任务、超时、取消
- **预览策略**: 不同场景下的预览图生成（`previewStrategy`）
- **节点执行器**: 7 个内置节点的 `NodeExecutor` 实现

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
  position: { x: 0, y: 0 },
});
```

### 导出图像

```typescript
import { exportToPng, exportToJpeg, exportToWebp } from '@prism/image-ops';

const blob = await exportToPng(image, { quality: 1.0 });
const blob = await exportToJpeg(image, { quality: 0.9 });
const blob = await exportToWebp(image, { quality: 0.9 });
```

## 执行器（NodeExecutor）

每个图像操作都有对应的 `NodeExecutor`，可直接被 `WorkflowExecutor` 调用：

```typescript
import { nodeExecutors } from '@prism/image-ops';
// nodeExecutors = {
//   'load-image': loadImageExecutor,
//   'load-mask': loadMaskExecutor,
//   'apply-mask': applyMaskExecutor,
//   'composite': compositeExecutor,
//   'transform': transformExecutor,
//   'export': exportExecutor,
//   'empty-input': emptyInputExecutor,
// }
```

这些 executor 会被 `@prism/core` 的 `globalRegistry.initialize()` 自动加载。

## 运行时支撑

- **`memory-manager`**: Canvas 对象池，减少 GC
- **`task-scheduler`**: 同步 / 异步任务统一调度，支持超时与取消
- **`preview-strategy`**: 不同场景（Inspector 预览 / 节点缩略图 / Lightbox）的预览图生成策略
- **`workerPool`**: Web Worker 池（Comlink 通信），主线程 / Worker lane 调度
- **`comlink-image-data-transfer`**: ImageData 跨 worker 边界的结构化克隆 / Transferable 优化
- **`canvas-util`**: 通用 Canvas 工具函数

## 目录结构

```
packages/image-ops/
├── src/
│   ├── load-image.ts          # loadImageExecutor / loadMaskExecutor + 加载工具
│   ├── apply-mask.ts          # applyMaskExecutor + 三种蒙版函数
│   ├── composite.ts           # compositeExecutor + composite 函数
│   ├── transform.ts           # transformExecutor + crop / resize / rotate / translate
│   ├── export-image.ts        # exportExecutor + exportToPng / Jpeg / Webp
│   ├── empty-input.ts         # emptyInputExecutor
│   ├── executors.ts           # 汇总 nodeExecutors
│   ├── memory-manager.ts      # Canvas 对象池
│   ├── task-scheduler.ts      # 任务调度器
│   ├── scheduler.ts           # 调度器 facade
│   ├── preview-strategy.ts    # 预览图生成策略
│   ├── workerPool.ts          # Web Worker 池
│   ├── comlink-image-data-transfer.ts
│   ├── canvas-util.ts         # Canvas 工具
│   ├── index.ts               # barrel export
│   └── *.test.ts              # 各模块测试
├── package.json
└── README.md
```

## 依赖

- `@prism/shared-types` - 共享类型定义
- `comlink` - Web Worker 通信

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm test:run` | 运行测试（Node.js 环境） |
| `pnpm test:browser` | 运行浏览器测试 |
| `pnpm clean` | 清理构建产物 |
