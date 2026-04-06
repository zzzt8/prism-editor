# C3: Canvas 实例缓存

> 引用自 meta-change `image-synthesis-performance/design.md` 的拆分原则。

## 1. 设计方案

### 1.1 CanvasPool 实现

```typescript
/**
 * Worker 内 Canvas 缓存管理器
 * 按尺寸缓存 OffscreenCanvas 实例，减少内存分配
 */
class CanvasPool {
  private pool = new Map<string, {
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
    lastUsed: number;
    inUse: boolean;
  }>();
  
  private static MAX_POOL_SIZE = 10;  // 最多缓存 10 个尺寸
  private static POOL_TTL_MS = 60000;  // 1 分钟后回收
  
  /**
   * 获取指定尺寸的 Canvas
   * 如果池中没有，创建新的
   */
  acquire(width: number, height: number): {
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
    release: () => void;
  } {
    const key = `${width}x${height}`;
    const cached = this.pool.get(key);
    
    if (cached && !cached.inUse) {
      cached.lastUsed = Date.now();
      cached.inUse = true;
      return {
        canvas: cached.canvas,
        ctx: cached.ctx,
        release: () => { cached.inUse = false; }
      };
    }
    
    // 创建新的
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    // 清理过期项
    this.evictExpired();
    
    // 如果池已满，清理最少使用的
    if (this.pool.size >= CanvasPool.MAX_POOL_SIZE) {
      this.evictLRU();
    }
    
    const entry = { canvas, ctx, lastUsed: Date.now(), inUse: true };
    this.pool.set(key, entry);
    
    return {
      canvas,
      ctx,
      release: () => { entry.inUse = false; }
    };
  }
  
  /**
   * 清理过期项（超过 TTL）
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.pool) {
      if (entry.inUse) continue;
      if (now - entry.lastUsed > CanvasPool.POOL_TTL_MS) {
        this.pool.delete(key);
      }
    }
  }
  
  /**
   * 清理最少使用的项
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.pool) {
      if (entry.inUse) continue;
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) this.pool.delete(oldestKey);
  }
  
  /**
   * 获取池统计信息
   */
  getStats(): { poolSize: number; entries: number } {
    return {
      poolSize: this.pool.size,
      entries: [...this.pool.entries()].filter(([, e]) => !e.inUse).length
    };
  }
}
```

### 1.2 Worker 内集成

```typescript
class ImageWorker {
  private canvasPool: CanvasPool;
  
  constructor(id: string = 'worker-1') {
    this.id = id;
    this.canvasPool = new CanvasPool();
    this.initCanvas();
  }
  
  async composite(
    base: ImageData,
    overlay: ImageData,
    mode: BlendMode = 'normal',
    opacity: number = 1
  ): Promise<WorkerImageResult> {
    const width = base.width;
    const height = base.height;
    
    // 从池中获取 Canvas
    const baseHandle = this.canvasPool.acquire(width, height);
    const overlayHandle = this.canvasPool.acquire(overlay.width, overlay.height);
    
    try {
      // 使用缓存的 Canvas
      const baseCtx = baseHandle.ctx;
      const overlayCtx = overlayHandle.ctx;
      
      baseCtx.clearRect(0, 0, width, height);
      baseCtx.putImageData(base, 0, 0);
      
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      overlayCtx.putImageData(overlay, 0, 0);
      
      // ... 执行合成
    } finally {
      // 释放回池
      baseHandle.release();
      overlayHandle.release();
    }
  }
  
  /**
   * 获取池统计信息（用于调试）
   */
  getPoolStats() {
    return this.canvasPool.getStats();
  }
}
```

### 1.3 配置选项

```typescript
interface CanvasPoolConfig {
  /** 最大缓存尺寸数量 */
  maxPoolSize?: number;
  /** 缓存 TTL（毫秒） */
  poolTtlMs?: number;
  /** 是否启用缓存 */
  enabled?: boolean;
}

const DEFAULT_POOL_CONFIG: Required<CanvasPoolConfig> = {
  maxPoolSize: 10,
  poolTtlMs: 60000,  // 1 分钟
  enabled: true,
};
```

## 2. 性能收益

| 场景 | 无缓存 | 有缓存 | 收益 |
|------|--------|--------|------|
| 10 次 composite | 10×128MB 分配 | 1×128MB + 9×复用 | ~90% 分配减少 |
| GC 暂停 | 频繁 | 极少 | 减少卡顿 |
| 内存峰值 | 2×128MB | 1×128MB | 50% 减少 |

## 3. 向后兼容性

- CanvasPool 默认启用
- `enabled: false` 可完全禁用缓存，恢复原有行为

## 4. 测试策略

### 4.1 单元测试

```typescript
describe('CanvasPool', () => {
  it('should reuse same-size canvas', () => {
    const pool = new CanvasPool();
    
    const handle1 = pool.acquire(1024, 1024);
    handle1.release();
    
    const handle2 = pool.acquire(1024, 1024);
    // 应该复用同一个 canvas
    expect(handle2.canvas).toBe(handle1.canvas);
  });
  
  it('should evict on TTL', () => {
    const pool = new CanvasPool({ poolTtlMs: 100 });
    pool.acquire(1024, 1024).release();
    
    // 等待过期
    await new Promise(r => setTimeout(r, 150));
    
    // 再次获取应该创建新的
    const handle = pool.acquire(1024, 1024);
    expect(pool.getStats().poolSize).toBe(1);
  });
});
```

### 4.2 内存测试

- 验证大量操作后内存不持续增长
- 验证池大小不超过 maxPoolSize
