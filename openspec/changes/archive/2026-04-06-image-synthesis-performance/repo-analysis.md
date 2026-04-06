# Repo Analysis: 图像合成性能

> 本分析由 meta-change `image-synthesis-performance` 全局扫描生成。
> 所有子 change 共享此分析结论，请勿在各子 change 中重复扫描。

## 1. 全局 Impact Map

|| 模块 | Layer | 当前状态 | 关联模块 |
|------|-------|---------|---------|
| `packages/image-ops/` | engine | 具备 Worker 基础设施，Pool 固定 2 个 | workflow-core |
| `packages/workflow-core/src/executor.ts` | engine | 拓扑顺序串行执行节点 | image-ops |
| `packages/workflow-core/src/context.ts` | engine | ExecutionContext 管理 | image-ops |
| `apps/user-app/src/modules/runner/runWorkflow.ts` | runtime | 动态 import image-ops | image-ops, workflow-core |
| `apps/dev-tool/src/modules/editor/services/executionService.ts` | editor | 执行入口，支持 lane 配置 | workflow-core |

## 2. 核心依赖链

```
┌─────────────────────────────────────────────────────────────────────┐
│                        图像合成执行路径                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User App                                                           │
│  └─ runWorkflow()                                                   │
│      └─ PublishedWorkflowExecutor.execute()                         │
│          └─ WorkflowExecutor.execute()                              │
│              └─ [拓扑顺序执行节点]                                   │
│                  └─ compositeExecutor()                             │
│                      └─ WorkerRunner.composite()                    │
│                          └─ WorkerPool.execute()                    │
│                              └─ ImageWorker.composite()             │
│                                  └─ [OffscreenCanvas 混合]          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. 性能关键代码定位

### 3.1 WorkerPool 固定大小

**文件**: `packages/image-ops/src/scheduler/workerPool.ts`
**行数**: 60-64

```typescript
const DEFAULT_CONFIG: WorkerPoolConfig = {
  size: 2,  // ← 硬编码
  maxErrors: 3,
  initTimeout: 5000,
};
```

**影响**: 无法利用现代设备多核能力。

### 3.2 串行多层叠加

**文件**: `packages/image-ops/src/composite.ts`
**行数**: 351-385

```typescript
for (const key of overlayKeys) {
  result = await workerRunner.composite(result, img, blendMode, opacity);
}
```

**影响**: 10 层叠加 = 10× 单层时间。

### 3.3 Worker 内 Canvas 反复重建

**文件**: `packages/image-ops/src/worker/imageWorker.worker.ts`
**行数**: 226-241

```typescript
async composite(...) {
  const baseCanvas = new OffscreenCanvas(width, height);      // 每次分配
  const overlayCanvas = new OffscreenCanvas(width, height);  // 每次分配
  // ...
}
```

**影响**: 4K 图 = 128MB × 2 内存反复分配/GC。

### 3.4 预览实时生成

**文件**: `packages/image-ops/src/composite.ts`
**行数**: 387-392

```typescript
const blob = await previewCanvas.convertToBlob({ type: 'image/png' });
const previewRef = getImageMemoryManager().createObjectURL(blob, ...);
```

**影响**: 每次节点完成都做 PNG 编码，消耗额外 CPU。

### 3.5 Worker 等待轮询

**文件**: `packages/image-ops/src/scheduler/workerPool.ts`
**行数**: 357-374

```typescript
for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
  const worker = this.selectWorker();
  if (worker?.proxy) { /* use worker */ }
  await new Promise<void>((r) => setTimeout(r, 50));  // 50ms 轮询
}
```

**影响**: 潜在 0-50ms 额外延迟，Worker 满载时可达 10 秒。

## 4. 高耦合区域

### 4.1 compositeExecutor 与 WorkerRunner 耦合

**当前状态**: `compositeExecutor` 直接调用 `workerRunner.composite()`，无法注入不同的执行策略。

**可优化点**: 引入 `CompositeStrategy` 接口，支持不同的合成策略（串行/并行/分层）。

### 4.2 ImageWorker 内状态管理

**当前状态**: 每个操作都创建新的 OffscreenCanvas 实例。

**可优化点**: Worker 内维护 Canvas 池，按尺寸缓存。

### 4.3 Preview 生成时机

**当前状态**: 每个 executor 完成后立即生成预览。

**可优化点**: 引入 `LazyPreview` 接口，延迟到真正需要时才生成。

## 5. 跨层联动点

|| 联动点 | 涉及文件 | 变更影响 |
|------|--------|---------|---------|
| Executor → WorkerPool | `composite.ts:372` | Worker 选择策略 |
| WorkerPool → Worker | `workerPool.ts:364` | Worker 内 Canvas 管理 |
| Executor → MemoryManager | `composite.ts:392` | Preview URL 生命周期 |

## 6. 当前测试覆盖

|| 测试文件 | 覆盖范围 |
|------|---------|---------|
| `composite.test.ts` | 像素级正确性验证 |
| `workerPool.test.ts` | Worker 生命周期管理 |
| `transform.test.ts` | Transform 正确性验证 |

**缺失**: 性能基准测试、并行合成正确性测试。

## 7. Known Unknowns

| # | 问题 | 影响 | 优先级 |
|---|------|------|--------|
| 1 | 典型工作流的叠加层数范围？ | 影响并行优化收益评估 | P0 |
| 2 | 是否需要实时预览？ | 影响预览策略选择 | P0 |
| 3 | 目标设备类型分布？ | 影响 Worker 池大小策略 | P1 |
| 4 | 图像尺寸分布？ | 影响 Canvas 缓存策略 | P1 |
