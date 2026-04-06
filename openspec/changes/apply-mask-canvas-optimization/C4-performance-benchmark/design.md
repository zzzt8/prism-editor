# C4: 性能基准测试 - Design

> 派生自 meta-change: `apply-mask-canvas-optimization`
> 拆分原则: 见 [`apply-mask-canvas-optimization/design.md`](../../apply-mask-canvas-optimization/design.md)

## Repo Analysis

> **Repo Analysis**：见 [`apply-mask-canvas-optimization/repo-analysis.md`](../../apply-mask-canvas-optimization/repo-analysis.md)

## 测试设计

### 1. 测试结构

```typescript
describe('ApplyMask Performance Benchmark', () => {
  // 图像生成辅助
  let test4K: { image: ImageData; mask: ImageData };
  let test8K: { image: ImageData; mask: ImageData };
  
  before(() => {
    // 生成测试图像
    test4K = generateTestImage(3840, 2160);
    test8K = generateTestImage(7680, 4320);
  });
  
  after(() => {
    // 清理
    test4K.image = null!;
    test4K.mask = null!;
    test8K.image = null!;
    test8K.mask = null!;
  });
  
  // ... 测试用例
});
```

### 2. 图像生成辅助

```typescript
function generateTestImage(width: number, height: number): { image: ImageData; mask: ImageData } {
  const imageData = new Uint8ClampedArray(width * height * 4);
  const maskData = new Uint8ClampedArray(width * height * 4);
  
  for (let i = 0; i < imageData.length; i += 4) {
    // 渐变图像
    const x = (i / 4) % width;
    const y = Math.floor((i / 4) / width);
    imageData[i] = (x / width) * 255;     // R
    imageData[i + 1] = (y / height) * 255; // G
    imageData[i + 2] = 128;               // B
    imageData[i + 3] = 255;               // A
    
    // 渐变蒙版
    maskData[i] = ((x + y) / (width + height)) * 255;
    maskData[i + 1] = maskData[i];
    maskData[i + 2] = maskData[i];
    maskData[i + 3] = 255;
  }
  
  return {
    image: new ImageData(imageData, width, height),
    mask: new ImageData(maskData, width, height)
  };
}
```

### 3. 性能测量辅助

```typescript
interface PerformanceResult {
  operation: string;
  imageSize: string;
  iterations: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  medianMs: number;
  stdDevMs: number;
}

function measurePerformance(
  fn: () => void,
  iterations: number = 10
): PerformanceResult {
  const measurements: number[] = [];
  
  // 预热
  fn();
  
  // 测量
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    measurements.push(end - start);
  }
  
  // 统计
  measurements.sort((a, b) => a - b);
  const avg = measurements.reduce((a, b) => a + b, 0) / iterations;
  const variance = measurements.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / iterations;
  
  return {
    operation: fn.name,
    imageSize: 'unknown',
    iterations,
    avgMs: avg,
    minMs: measurements[0],
    maxMs: measurements[iterations - 1],
    medianMs: measurements[Math.floor(iterations / 2)],
    stdDevMs: Math.sqrt(variance)
  };
}
```

### 4. 测试用例

#### 4.1 Alpha 蒙版性能测试

```typescript
it('Alpha mask 4K performance < 50ms', () => {
  const iterations = 5;
  const measurements: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    applyMask(test4K.image, test4K.mask, { type: 'alpha', threshold: 128 });
    measurements.push(performance.now() - start);
  }
  
  const avgMs = measurements.reduce((a, b) => a + b, 0) / iterations;
  console.log(`Alpha 4K average: ${avgMs.toFixed(2)}ms`);
  
  expect(avgMs).toBeLessThan(50);
});

it('Alpha mask 8K performance < 200ms', () => {
  const iterations = 3;
  const measurements: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    applyMask(test8K.image, test8K.mask, { type: 'alpha', threshold: 128 });
    measurements.push(performance.now() - start);
  }
  
  const avgMs = measurements.reduce((a, b) => a + b, 0) / iterations;
  console.log(`Alpha 8K average: ${avgMs.toFixed(2)}ms`);
  
  expect(avgMs).toBeLessThan(200);
});
```

#### 4.2 Brightness/Luminance 蒙版性能测试

```typescript
it('Brightness mask 4K performance < 60ms', () => {
  const iterations = 5;
  const measurements: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    applyMask(test4K.image, test4K.mask, { type: 'brightness', threshold: 128 });
    measurements.push(performance.now() - start);
  }
  
  const avgMs = measurements.reduce((a, b) => a + b, 0) / iterations;
  console.log(`Brightness 4K average: ${avgMs.toFixed(2)}ms`);
  
  expect(avgMs).toBeLessThan(60);
});

it('Luminance mask 4K performance < 60ms', () => {
  const iterations = 5;
  const measurements: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    applyMask(test4K.image, test4K.mask, { type: 'luminance', threshold: 128 });
    measurements.push(performance.now() - start);
  }
  
  const avgMs = measurements.reduce((a, b) => a + b, 0) / iterations;
  console.log(`Luminance 4K average: ${avgMs.toFixed(2)}ms`);
  
  expect(avgMs).toBeLessThan(60);
});
```

#### 4.3 Canvas 2D vs JS 对比测试

```typescript
it('Canvas 2D vs JS performance comparison', () => {
  // JS 实现（直接从 apply-mask.ts 导入）
  const { applyMask: applyMaskJS } = require('../src/apply-mask');
  
  const iterations = 5;
  const jsMeasurements: number[] = [];
  const canvasMeasurements: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    // JS 测量
    const jsStart = performance.now();
    // JS 实现需要手动调用...
    jsMeasurements.push(performance.now() - jsStart);
    
    // Canvas 2D 测量
    const canvasStart = performance.now();
    applyMask(test4K.image, test4K.mask, { type: 'alpha', threshold: 128 });
    canvasMeasurements.push(performance.now() - canvasStart);
  }
  
  const jsAvg = jsMeasurements.reduce((a, b) => a + b, 0) / iterations;
  const canvasAvg = canvasMeasurements.reduce((a, b) => a + b, 0) / iterations;
  const speedup = jsAvg / canvasAvg;
  
  console.log(`JS: ${jsAvg.toFixed(2)}ms, Canvas: ${canvasAvg.toFixed(2)}ms, Speedup: ${speedup.toFixed(2)}x`);
  
  expect(speedup).toBeGreaterThan(3); // 至少 3x 提升
});
```

#### 4.4 内存监控测试

```typescript
it('CanvasPool memory usage within limits', () => {
  const pool = getCanvasPool();
  const initialStats = pool.getStats();
  
  // 执行多次操作
  for (let i = 0; i < 10; i++) {
    applyMask(test4K.image, test4K.mask, { type: 'alpha', threshold: 128 });
  }
  
  // 等待 GC（如果需要）
  // 在测试环境中，Canvas 应该被释放回池中
  
  const finalStats = pool.getStats();
  console.log('Initial pool stats:', initialStats);
  console.log('Final pool stats:', finalStats);
  
  // 验证没有内存泄漏
  // Canvas 数量应该在合理范围内
  expect(finalStats.active).toBeLessThanOrEqual(initialStats.active + 2);
});
```

### 5. 性能回归检测

```typescript
describe('Performance Regression Detection', () => {
  // 性能基线（从 CI 获取或手动设置）
  const PERFORMANCE_BASELINE = {
    'alpha-4k': 50,    // ms
    'alpha-8k': 200,   // ms
    'brightness-4k': 60,
    'luminance-4k': 60
  };
  
  it('should not regress from baseline', () => {
    const result = measurePerformance(() => {
      applyMask(test4K.image, test4K.mask, { type: 'alpha', threshold: 128 });
    });
    
    const baseline = PERFORMANCE_BASELINE['alpha-4k'];
    const regression = (result.avgMs - baseline) / baseline;
    
    console.log(`Alpha 4K: ${result.avgMs.toFixed(2)}ms (baseline: ${baseline}ms, diff: ${(regression * 100).toFixed(1)}%)`);
    
    // 允许 10% 的误差
    expect(regression).toBeLessThan(0.1);
  });
});
```

## 输出格式

### 测试日志示例

```
ApplyMask Performance Benchmark
================================
Alpha mask 4K: 42.35ms (target: <50ms) ✓
Alpha mask 8K: 168.21ms (target: <200ms) ✓
Brightness mask 4K: 48.12ms (target: <60ms) ✓
Luminance mask 4K: 51.03ms (target: <60ms) ✓
Composite baseline 4K: 48.67ms
Performance ratio vs Composite: 0.87x ✓

All performance targets met! ✓
```

## CI 集成

### GitHub Actions 配置

```yaml
performance-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v3
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: pnpm install
    - run: pnpm test --filter=@prism/image-ops -- --grep="performance|benchmark"
      env:
        CI: true
    - name: Upload performance results
      uses: actions/upload-artifact@v4
      with:
        name: performance-results
        path: performance-results.json
```
