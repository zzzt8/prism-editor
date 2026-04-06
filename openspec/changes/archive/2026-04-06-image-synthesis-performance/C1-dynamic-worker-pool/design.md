# C1: 动态 Worker 池

> 引用自 meta-change `image-synthesis-performance/design.md` 的拆分原则。

## 1. 设计方案

### 1.1 Worker 数量计算公式

```typescript
/**
 * 根据设备核心数计算 Worker 池大小
 * 
 * 公式: min(maxSize, max(1, navigator.hardwareConcurrency - 1))
 * 
 * 保留 1 个核心给主线程，避免 Worker 和 UI 争抢资源
 */
function calculateWorkerCount(
  maxSize: number = 4,
  minSize: number = 1
): number {
  const cores = typeof navigator !== 'undefined' 
    ? (navigator.hardwareConcurrency || 2)
    : 2;
  
  // 公式：保留 1 核给主线程，上限 maxSize
  const calculated = Math.max(1, cores - 1);
  return Math.min(maxSize, Math.max(minSize, calculated));
}
```

### 1.2 设备核心数 vs Worker 数量对照

| 设备核心数 | 推荐 Worker 数 | 说明 |
|-----------|----------------|------|
| 2 | 1 | 最低配置，保留 1 核给 UI |
| 4 | 2 | 中等配置 |
| 8 | 4 | 8-1=7，cap 4 |
| 16 | 4 | 16-1=15，cap 4 |
| 32 | 4 | 32-1=31，cap 4 |

### 1.3 接口变更

```typescript
// 旧接口
interface WorkerPoolConfig {
  size: number;
}

// 新接口（向后兼容）
interface WorkerPoolConfig {
  /** @deprecated 使用 baseSize 或 dynamicSize */
  size?: number;
  /** 基准 Worker 数量 */
  baseSize?: number;
  /** 最大 Worker 数量 */
  maxSize?: number;
  /** 最小 Worker 数量 */
  minSize?: number;
  /** 是否启用动态调整（默认 true） */
  dynamic?: boolean;
  /** 其他配置... */
  maxErrors: number;
  initTimeout: number;
}
```

## 2. 实现细节

### 2.1 动态计算逻辑

```typescript
function getEffectiveSize(config: WorkerPoolConfig): number {
  // 如果 dynamic 为 false，使用固定值
  if (config.dynamic === false) {
    return config.size ?? config.baseSize ?? 2;
  }
  
  // 动态计算
  const maxSize = config.maxSize ?? 4;
  const minSize = config.minSize ?? 1;
  return calculateWorkerCount(maxSize, minSize);
}
```

### 2.2 初始化逻辑变更

```typescript
private initialize(): void {
  const size = getEffectiveSize(this.config);
  
  for (let i = 0; i < size; i++) {
    this.createWorker(i);
  }
  
  console.log(`[WorkerPool] Initialized with ${size} workers`);
}
```

## 3. 向后兼容性

- `size` 参数仍然有效，但语义变为"基准数"
- 旧代码 `new WorkerPool({ size: 2 })` 仍然有效
- 添加 `dynamic: false` 可恢复旧行为

## 4. 测试策略

### 4.1 单元测试

```typescript
describe('calculateWorkerCount', () => {
  it('should return 1 for 2 cores', () => {
    expect(calculateWorkerCount(4, 1, 2)).toBe(1);
  });
  
  it('should cap at maxSize', () => {
    expect(calculateWorkerCount(4, 1, 16)).toBe(4);
  });
});
```

### 4.2 集成测试

- 验证不同设备上的 Worker 数量正确
- 验证 `dynamic: false` 恢复旧行为
