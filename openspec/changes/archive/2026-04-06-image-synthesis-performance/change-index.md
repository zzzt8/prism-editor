# Change Index

> 本 index 由 meta-change `image-synthesis-performance` 全局分析生成。
> 所有子 change 均派生自本 index，请勿单独定义不在本 index 中的 change。

## 拆分原则

- 按优化层级：基础设施 → 核心收益 → 锦上添花
- C1/C3 是基础设施，为其他优化提供更好的并行度基础
- C2 是核心收益，需要 C1 的更多 Worker 才能发挥并行优势
- C4 是 UX 优化，可独立实施
- P0 = 核心依赖 / 阻塞性改动；P1 = 重要但不阻塞；P2 = 可延后

---

## C1: 动态 Worker 池

- **goal**: 根据 `navigator.hardwareConcurrency` 动态调整 Worker Pool 大小，充分利用多核设备
- **layer**: engine
- **depends_on**: none
- **priority**: P0
- **risk**: low
- **scope**: `packages/image-ops/src/scheduler/workerPool.ts`
- **reason**: 当前 Worker Pool 固定 2 个，现代 8 核设备利用率仅 25%。动态调整后可利用率提升到 50-75%。
- **blocked_by**: none
- **status**: planned

**文件清单**：
- `packages/image-ops/src/scheduler/workerPool.ts` — 修改 DEFAULT_CONFIG，添加动态计算逻辑

---

## C2: 并行多层合成

- **goal**: 将可并行的 overlay 分组后并行合成，显著减少多层叠加的总时间
- **layer**: engine
- **depends_on**: C1
- **priority**: P0
- **risk**: high
- **scope**: `packages/image-ops/src/composite.ts`
- **reason**: 当前 10 层叠加 = 10× 单层时间（串行）。并行执行后约 6× 单层时间（4 workers），加速比 1.67x。
- **blocked_by**: C1 未完成时，Worker 数量不足，并行收益有限
- **status**: planned

**文件清单**：
- `packages/image-ops/src/composite.ts` — 添加 `parallelComposite` 函数，修改 `compositeExecutor`
- `packages/image-ops/src/composite.test.ts` — 添加并行合成正确性测试

---

## C3: Canvas 实例缓存

- **goal**: Worker 内复用 OffscreenCanvas 实例，减少内存分配和 GC 压力
- **layer**: engine
- **depends_on**: none
- **priority**: P1
- **risk**: medium
- **scope**: `packages/image-ops/src/worker/imageWorker.worker.ts`
- **reason**: 当前每次操作都创建新的 OffscreenCanvas（4K 图 = 128MB × 2），频繁分配/GC 影响性能。按尺寸缓存后可复用已有实例。
- **blocked_by**: none（可与 C2 并行开发）
- **status**: planned

**文件清单**：
- `packages/image-ops/src/worker/imageWorker.worker.ts` — 添加 CanvasPool 类，修改所有操作函数
- `packages/image-ops/src/worker/index.ts` — 导出 CanvasPool

---

## C4: 预览延迟生成

- **goal**: 首次执行只返回 ImageData，后续异步生成预览，减少主线程阻塞
- **layer**: engine
- **depends_on**: none
- **priority**: P2
- **risk**: low
- **scope**: 所有 image-ops executor 文件
- **reason**: 当前每个 executor 完成后立即生成 PNG Blob，消耗额外 CPU。延迟生成后，主线程只做核心计算，预览在空闲时生成。
- **blocked_by**: none（可独立实施）
- **status**: planned

**文件清单**：
- `packages/image-ops/src/executors.ts` — 添加 PreviewStrategy 接口
- `packages/image-ops/src/preview-strategy.ts` — 实现 EagerPreviewStrategy 和 LazyPreviewStrategy
- `packages/image-ops/src/composite.ts` — 使用 LazyPreviewStrategy
- `packages/image-ops/src/load-image.ts` — 使用 LazyPreviewStrategy
- `packages/image-ops/src/transform.ts` — 使用 LazyPreviewStrategy
- `packages/image-ops/src/apply-mask.ts` — 使用 LazyPreviewStrategy

---

## Recommended Execution Order

### Phase 1: 基础设施（P0/P1，可并行）

1. **C1: 动态 Worker 池** — 无依赖，基础设施
2. **C3: Canvas 实例缓存** — 无依赖，可与 C1 并行

### Phase 2: 核心收益（P0）

3. **C2: 并行多层合成** — 依赖 C1，充分发挥并行优势

### Phase 3: UX 优化（P2）

4. **C4: 预览延迟生成** — 无依赖，可延后

### 依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  C1 ──────────────────┐                                     │
│  (动态 Worker 池)      │                                     │
│       │               │                                     │
│       │               ▼                                     │
│       └───────► C2 ◄──┘                                     │
│       │        (并行合成)                                    │
│       │                                                     │
│  C3 ◄─┘                                                     │
│  (Canvas 缓存)                                               │
│                                                             │
│  C4                                                         │
│  (预览延迟生成)                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 预期性能提升

| 子 Change | 优化场景 | 预期加速比 |
|-----------|----------|------------|
| C1: 动态 Worker 池 | 多节点并行执行 | 1.5-2x |
| C2: 并行多层合成 | 10 层叠加 | 1.5-2x |
| C3: Canvas 缓存 | 所有图像操作 | 1.2-1.5x |
| C4: 预览延迟 | 执行阶段 | 1.1-1.2x |
| **总计（全部实施）** | **综合场景** | **3-5x** |
