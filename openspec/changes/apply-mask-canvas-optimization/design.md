# Design: Apply Mask Canvas 2D 优化拆分原则

## 拆分维度

### 按实现阶段拆分

本次优化按**实现阶段**和**蒙版类型**两个维度拆分：

| 维度 | 说明 |
|------|------|
| **实现阶段** | 基础设施 → 核心实现 → 测试验收 |
| **蒙版类型** | Alpha（最常用）→ Brightness → Luminance |

### 拆分理由

1. **Alpha 蒙版优先**: 使用最频繁，是主要性能瓶颈
2. **Brightness/Luminance 延后**: 实现逻辑类似，可复用 Alpha 的基础设施
3. **测试独立验证**: 每个蒙版类型可独立测试
4. **风险隔离**: 单个 change 出问题不影响其他功能

## Layer 约束

### 强制规则

- ✅ 所有改动必须在 `engine` layer
- ✅ 不修改任何 API 接口
- ✅ 不修改任何 UI 组件
- ✅ 不修改服务器端代码
- ✅ 不修改其他图像处理操作

### 允许范围

| 允许 | 说明 |
|------|------|
| `packages/image-ops/src/worker/imageWorker.worker.ts` | 重构 applyMask 方法 |
| `packages/image-ops/src/apply-mask.test.ts` | 新增性能测试 |
| `packages/image-ops/src/worker/canvasPool.ts` | 扩展（如需要） |

## Canvas 2D 实现约束

### globalCompositeOperation 选择

| 蒙版类型 | 使用的合成操作 | 原因 |
|----------|---------------|------|
| Alpha | `destination-in` | 用蒙版 alpha 通道裁剪原图 |
| Brightness | `source-over` + 灰度预处理 | 简单灰度转换 |
| Luminance | `source-over` + 亮度预处理 | 使用标准亮度公式 |

### 降级约束

```typescript
async applyMask(...): Promise<WorkerImageResult> {
  // 1. 检测 OffscreenCanvas 可用性
  if (typeof OffscreenCanvas === 'undefined') {
    return this.applyMaskFallbackJS(...); // 回退到 JS
  }
  
  // 2. 主要实现：Canvas 2D
  try {
    return await this.applyMaskCanvas(...);
  } catch (err) {
    // 3. 降级到 JS 实现
    console.warn('Canvas 2D mask failed, falling back to JS:', err);
    return this.applyMaskFallbackJS(...);
  }
}
```

### Canvas 使用约束

- **必须**使用 `CanvasPool` 管理 Canvas 生命周期
- **必须**在 `finally` 块中释放 Canvas
- **建议**使用 `{ willReadFrequently: true }` context 选项

## 数值一致性约束

### 验证要求

Canvas 2D 实现的结果**必须**与 JS 实现逐像素一致（允许浮点误差 ±1）：

```typescript
// 验证伪代码
function validateResults(canvasResult: ImageData, jsResult: ImageData): boolean {
  for (let i = 0; i < canvasResult.data.length; i++) {
    const diff = Math.abs(canvasResult.data[i] - jsResult.data[i]);
    if (diff > 1) {
      console.error(`Pixel mismatch at index ${i}: ${canvasResult.data[i]} vs ${jsResult.data[i]}`);
      return false;
    }
  }
  return true;
}
```

### 测试策略

| 测试类型 | 覆盖场景 | 验收标准 |
|----------|----------|----------|
| 单元测试 | Alpha/Brightness/Luminance | 逐像素一致 |
| 性能基准 | 4K/8K 图像 | <50ms / <200ms |
| 边界测试 | 1x1, 最大尺寸, 无效蒙版 | 不崩溃 |
| 降级测试 | OffscreenCanvas 不可用 | 回退到 JS |

## 依赖优先级矩阵

| Change | 依赖 | 优先级 | 理由 |
|--------|------|--------|------|
| C1: Canvas 合成基元 | 无 | P0 | 所有其他 change 依赖此基础设施 |
| C2: Alpha 蒙版 | C1 | P0 | 最常用，核心性能问题 |
| C3: Brightness/Luminance | C1, C2 | P1 | 复用 C1 基础设施 |
| C4: 性能基准测试 | C2, C3 | P1 | 验证性能目标达成 |

## 执行顺序约束

### Phase 顺序

```
Phase 1 (C1): Canvas 合成基元
    ↓
Phase 2a (C2): Alpha 蒙版 Canvas 实现
Phase 2b (C3): Brightness/Luminance Canvas 实现
    ↓ (C2, C3 完成后)
Phase 3 (C4): 性能基准测试
```

### 可并行化

- C2 和 C3 **可以并行**开发（都依赖 C1）
- C4 **必须串行**在 C2 + C3 完成后执行

## 验收标准

### 性能标准

| 指标 | 基线 | 目标 | 测量方法 |
|------|------|------|----------|
| Apply Mask 4K 耗时 | ~300ms | <50ms | Performance.now() |
| Apply Mask 8K 耗时 | ~1200ms | <200ms | Performance.now() |
| 与 Composite 性能比 | 5-10x | <2x | 性能基准测试 |

### 正确性标准

| 标准 | 验收方法 |
|------|----------|
| Alpha 蒙版数值一致 | 逐像素对比测试 |
| Brightness 蒙版数值一致 | 逐像素对比测试 |
| Luminance 蒙版数值一致 | 逐像素对比测试 |
| API 向后兼容 | 现有集成测试通过 |
| 降级机制有效 | 模拟 OffscreenCanvas 不可用 |

### 内存标准

| 标准 | 验收方法 |
|------|----------|
| 无 Canvas 泄漏 | CanvasPool stats 验证 |
| 峰值内存 <500MB | Chrome DevTools Memory |
