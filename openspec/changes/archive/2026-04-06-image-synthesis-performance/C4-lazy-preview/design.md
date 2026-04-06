# C4: 预览延迟生成

> 引用自 meta-change `image-synthesis-performance/design.md` 的拆分原则。

## 1. 设计方案

### 1.1 PreviewStrategy 接口

```typescript
/**
 * 预览生成策略接口
 */
interface PreviewStrategy {
  /**
   * 生成预览
   * 可能返回 string（同步）或 Promise<string>（异步）
   */
  generatePreview(imageData: ImageData): Promise<PreviewResult>;
  
  /**
   * 是否需要立即生成
   */
  shouldGenerateImmediately(): boolean;
}

interface PreviewResult {
  /** Blob URL（管理生命周期） */
  blobUrl?: string;
  /** Data URL（不需管理生命周期） */
  dataUrl?: string;
  /** 预览是否已就绪 */
  ready: boolean;
}
```

### 1.2 立即生成策略（向后兼容）

```typescript
/**
 * 立即生成策略
 * 保持原有行为，用于向后兼容
 */
class EagerPreviewStrategy implements PreviewStrategy {
  private memoryManager: ImageMemoryManager;
  
  constructor(memoryManager: ImageMemoryManager) {
    this.memoryManager = memoryManager;
  }
  
  async generatePreview(imageData: ImageData): Promise<PreviewResult> {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const ref = this.memoryManager.createObjectURL(blob, imageData.width, imageData.height);
    
    return {
      blobUrl: ref.url,
      ready: true,
    };
  }
  
  shouldGenerateImmediately(): boolean {
    return true;
  }
}
```

### 1.3 延迟生成策略（优化）

```typescript
/**
 * 延迟生成策略
 * 首次只返回 data URL，后续按需升级为 blob URL
 */
class LazyPreviewStrategy implements PreviewStrategy {
  async generatePreview(imageData: ImageData): Promise<PreviewResult> {
    // 返回 data URL，不占用 Blob URL 内存池
    const dataUrl = await this.toDataUrl(imageData);
    
    return {
      dataUrl,
      ready: true,
    };
  }
  
  private async toDataUrl(imageData: ImageData): Promise<string> {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
  
  shouldGenerateImmediately(): boolean {
    return false;
  }
}
```

### 1.4 Executor 集成

```typescript
// 使用默认的 LazyPreviewStrategy
const defaultStrategy = new LazyPreviewStrategy();

export const compositeExecutor: NodeExecutor = async (inputs, params, ctx) => {
  // ... 执行合成
  
  // 生成预览
  const strategy = getPreviewStrategy(params);
  const preview = await strategy.generatePreview(result);
  
  return {
    type: 'composite',
    image: {
      data: result,
      previewUrl: preview.blobUrl ?? preview.dataUrl ?? '',
      // ...
    },
    previewUrl: preview.blobUrl ?? preview.dataUrl ?? '',
  };
};

function getPreviewStrategy(params: Record<string, unknown>): PreviewStrategy {
  const mode = params['previewMode'] as string | undefined;
  
  if (mode === 'eager') {
    return new EagerPreviewStrategy(getImageMemoryManager());
  }
  
  return new LazyPreviewStrategy();
}
```

### 1.5 接口变更

```typescript
// 旧接口
interface BaseExecutorOutput {
  previewUrl: string;
}

// 新接口（向后兼容）
interface BaseExecutorOutput {
  previewUrl?: string;
  /** 延迟预览数据 */
  previewDataUrl?: string;
  /** 预览是否已生成 */
  previewReady?: boolean;
}
```

## 2. 性能收益

| 场景 | 立即生成 | 延迟生成 | 收益 |
|------|----------|----------|------|
| 执行时间 | T + P（PNG 编码） | T | P 时间减少 |
| 内存管理 | 需要 Object URL 管理 | 不需要 | 简化内存管理 |
| 首次预览显示 | 快 | 略慢（首次需要编码） | - |

## 3. 向后兼容性

- `previewUrl` 字段仍然有效（填充 data URL 或 blob URL）
- 添加 `previewMode: 'eager'` 参数可恢复原有行为

## 4. 测试策略

### 4.1 正确性测试

```typescript
describe('LazyPreviewStrategy', () => {
  it('should generate valid data URL', async () => {
    const strategy = new LazyPreviewStrategy();
    const imageData = createTestImage(100, 100);
    
    const result = await strategy.generatePreview(imageData);
    
    expect(result.ready).toBe(true);
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
```

### 4.2 性能测试

```typescript
describe('Preview Performance', () => {
  it('lazy should be faster than eager for execution', async () => {
    const imageData = createTestImage(2048, 2048);
    
    const eagerStrategy = new EagerPreviewStrategy(getImageMemoryManager());
    const lazyStrategy = new LazyPreviewStrategy();
    
    const eagerTime = await measureTime(() => eagerStrategy.generatePreview(imageData));
    const lazyTime = await measureTime(() => lazyStrategy.generatePreview(imageData));
    
    expect(lazyTime).toBeLessThan(eagerTime);
  });
});
```
