# Change Index

> 本 index 由 meta-change `apply-mask-canvas-optimization` 全局分析生成。
> 所有子 change 均派生自本 index，请勿单独定义不在本 index 中的 change。

## 拆分原则

- 所有 change 在 `engine` layer 内
- 按蒙版类型优先级拆分：Alpha（最常用）→ Brightness/Luminance
- C1 基础设施先完成，C2/C3 可并行
- C4 测试在 C2+C3 完成后执行
- P0 = 核心性能，必须完成；P1 = 重要但可延后

---

## C1: Canvas 合成基元

- **goal**: 实现 Canvas 2D 蒙版合成的通用基础设施
- **layer**: engine
- **depends_on**: none
- **priority**: P0
- **risk**: low
- **scope**: `packages/image-ops/src/worker/imageWorker.worker.ts`
- **reason**: 为 Alpha/Brightness/Luminance 蒙版提供统一的 Canvas 2D 渲染管道
- **blocked_by**: 无
- **status**: planned

---

## C2: Alpha 蒙版 Canvas 实现

- **goal**: 使用 `destination-in` 合成操作实现 Alpha 蒙版，性能提升 5-10x
- **layer**: engine
- **depends_on**: C1
- **priority**: P0
- **risk**: low
- **scope**: `packages/image-ops/src/worker/imageWorker.worker.ts`
- **reason**: Alpha 蒙版是使用最频繁的蒙版类型，解决主要性能瓶颈
- **blocked_by**: C1 完成
- **status**: planned

---

## C3: Brightness/Luminance 蒙版 Canvas 实现

- **goal**: 实现 Brightness 和 Luminance 蒙版的 Canvas 2D 路径
- **layer**: engine
- **depends_on**: C1
- **priority**: P1
- **risk**: low
- **scope**: `packages/image-ops/src/worker/imageWorker.worker.ts`
- **reason**: 完善蒙版类型支持，复用 C1 的灰度转换基础设施
- **blocked_by**: C1 完成
- **status**: planned

---

## C4: 性能基准测试

- **goal**: 建立性能基准测试套件，确保 4K <50ms, 8K <200ms 的性能目标
- **layer**: engine
- **depends_on**: C2, C3
- **priority**: P1
- **risk**: low
- **scope**: `packages/image-ops/src/apply-mask.test.ts`
- **reason**: 验证性能目标达成，防止性能回归
- **blocked_by**: C2, C3 完成
- **status**: planned

---

## Recommended Execution Order

### Phase 1: 基础设施（P0，必须先做）

1. **C1: Canvas 合成基元** — 为后续所有 change 提供基础设施

### Phase 2: 核心实现（P0，可并行）

2. **C2: Alpha 蒙版 Canvas 实现** — 优先解决主要性能瓶颈
3. **C3: Brightness/Luminance 蒙版 Canvas 实现** — 完善功能（可与 C2 并行）

### Phase 3: 测试验收（P1）

4. **C4: 性能基准测试** — 验证所有性能目标达成
