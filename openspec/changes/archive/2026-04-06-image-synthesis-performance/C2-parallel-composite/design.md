# C2: 并行多层合成

> 引用自 meta-change `image-synthesis-performance/design.md` 的拆分原则。

## 1. 设计方案

### 1.1 分组并行合成算法

```typescript
/**
 * 分组并行合成算法
 * 
 * 将 overlay 分成 N 组（N = 可用 Worker 数），每组并行执行
 * 然后按顺序累积合并结果
 */
async function parallelComposite(
  base: ImageData,
  overlays: ImageData[],
  options: {
    mode: BlendMode;
    opacity: number;
    workerRunner: WorkerRunner;
    canvasWidth?: number;
    canvasHeight?: number;
  }
): Promise<ImageData> {
  const { mode, opacity, workerRunner, canvasWidth, canvasHeight } = options;
  
  // 获取可用 Worker 数
  const workerCount = workerRunner.getPoolSize();
  const groupSize = Math.min(workerCount, overlays.length);
  
  if (groupSize <= 1 || overlays.length <= 1) {
    // 退化为串行
    return serialComposite(base, overlays, { mode, opacity, workerRunner });
  }
  
  // 1. 分组
  const groups: ImageData[][] = [];
  for (let i = 0; i < overlays.length; i += groupSize) {
    groups.push(overlays.slice(i, i + groupSize));
  }
  
  // 2. 每组并行执行（创建中间合成结果）
  const groupPromises = groups.map(group => 
    workerRunner.execute(worker => 
      worker.createGroupComposite(base, group, mode, opacity)
    )
  );
  const groupResults = await Promise.all(groupPromises);
  
  // 3. 累积合并（保持顺序依赖）
  let result = base;
  for (const groupResult of groupResults) {
    result = await workerRunner.execute(worker => 
      worker.composite(result, groupResult.data, mode, opacity)
    );
  }
  
  return result;
}
```

### 1.2 Worker 新增方法

```typescript
// imageWorker.worker.ts

class ImageWorker {
  /**
   * 创建组级别合成
   * 将多个 overlay 一次性合成到 base 上
   */
  async createGroupComposite(
    base: ImageData,
    overlays: ImageData[],
    mode: BlendMode,
    opacity: number
  ): Promise<WorkerImageResult> {
    // 复用已有的 Canvas 池
    const { canvas: resultCanvas, ctx: resultCtx } = this.canvasPool.get(
      base.width, base.height
    );
    
    // 绘制 base
    resultCtx.clearRect(0, 0, base.width, base.height);
    resultCtx.putImageData(base, 0, 0);
    
    // 批量绘制 overlay
    for (const overlay of overlays) {
      resultCtx.globalAlpha = opacity;
      resultCtx.globalCompositeOperation = this.convertBlendMode(mode);
      
      const overlayCanvas = new OffscreenCanvas(overlay.width, overlay.height);
      const overlayCtx = overlayCanvas.getContext('2d')!;
      overlayCtx.putImageData(overlay, 0, 0);
      
      resultCtx.drawImage(overlayCanvas, 0, 0);
    }
    
    resultCtx.globalAlpha = 1;
    resultCtx.globalCompositeOperation = 'source-over';
    
    return {
      data: resultCtx.getImageData(0, 0, base.width, base.height),
      width: base.width,
      height: base.height,
    };
  }
}
```

### 1.3 性能收益分析

```
串行执行 (当前):
Worker1: [L1][L2][L3][L4][L5][L6][L7][L8][L9][L10]
Total: 10 × T_single

分组并行 (优化后, 4 workers, groupSize = 3):
Worker1: [L1][L4][L7][L10]  (4 个任务)
Worker2: [L2][L5][L8]       (3 个任务)
Worker3: [L3][L6][L9]       (3 个任务)

Group 阶段: max(4,3,3) = 4 任务
Merge 阶段: 3 次合并 (groups=3)

Total ≈ 4T_single (group) + 3T_single (merge) = 7T_single
加速比: 10/7 ≈ 1.43x (4 workers)

如果直接并行合成到 base (理想情况):
Total ≈ max(4,3,3) + 3 = 7 任务时间
加速比 ≈ 1.43x
```

## 2. 正确性保证

### 2.1 像素级对比测试

```typescript
describe('parallelComposite correctness', () => {
  it('should produce identical results to serial composite', async () => {
    const base = createTestImage(1024, 1024);
    const overlays = [
      createTestImage(1024, 1024),
      createTestImage(512, 512, { offset: 256 }),
      createTestImage(256, 256, { offset: 384 }),
    ];
    
    const serialResult = await serialComposite(base, overlays, options);
    const parallelResult = await parallelComposite(base, overlays, options);
    
    // 像素级对比
    expect(pixelsMatch(serialResult.data, parallelResult.data)).toBe(true);
  });
});
```

### 2.2 边界情况

- 0 个 overlay → 返回 base
- 1 个 overlay → 直接 composite
- 所有 overlay 透明 → 返回 base
- 不同尺寸 overlay → resize 后合成

## 3. 回滚策略

如果发现正确性问题，可通过配置禁用并行：

```typescript
interface CompositeOptions {
  // ... existing options
  /** 强制使用串行合成（用于调试） */
  forceSerial?: boolean;
}
```
