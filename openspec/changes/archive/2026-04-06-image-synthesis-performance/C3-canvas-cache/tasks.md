# C3: Canvas 实例缓存

> **Repo Analysis**：见 [`image-synthesis-performance/repo-analysis.md`](../../image-synthesis-performance/repo-analysis.md)

## 前置条件

- 无依赖，可与 C1/C2 并行开发

---

## Test Plan（测试设计）

### 测试策略

|| 层级 | 测试类型 | 验证命令 |
|------|------|----------|
| engine | 单元测试 | `pnpm test --filter=@prism/image-ops` |
| engine | 内存测试 | 手动验证 |

### Test Cases

#### TC-1: Canvas 复用
- **Given**: 两次 acquire 相同尺寸
- **When**: 第一次 release 后第二次 acquire
- **Then**: 复用同一个 canvas 实例

#### TC-2: 不同尺寸独立缓存
- **Given**: 不同尺寸的 canvas
- **When**: 分别 acquire
- **Then**: 各自独立缓存

#### TC-3: TTL 驱逐
- **Given**: Canvas 超过 TTL 未使用
- **When**: 再次 acquire
- **Then**: 创建新的 canvas（旧的被驱逐）

#### TC-4: LRU 驱逐
- **Given**: 池已满
- **When**: acquire 新的尺寸
- **Then**: 驱逐最少使用的

### Backward Compatibility

- [x] 添加 `enabled: false` 可完全禁用缓存
- [x] 图像处理结果不变

---

## 任务列表

<!-- opsx-meta
id: T1
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T1: 实现 CanvasPool 类
  - layer: engine
  - files: `packages/image-ops/src/worker/canvasPool.ts`（新建）
  - **验收标准**：acquire/release/evict 功能正常

<!-- opsx-meta
id: T2
layer: engine
risk: medium
verify:
  - unit-tests
-->
- [x] T2: 在 ImageWorker 中集成 CanvasPool
  - layer: engine
  - files: `packages/image-ops/src/worker/imageWorker.worker.ts`
  - **验收标准**：所有操作使用缓存的 Canvas

<!-- opsx-meta
id: T3
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T3: 添加单元测试
  - layer: engine
  - files: `packages/image-ops/src/worker/canvasPool.test.ts`（新建）
  - **验收标准**：覆盖 TTL/LRU/并发场景

<!-- opsx-meta
id: T4
layer: engine
risk: low
verify:
  - memory-test
-->
- [x] T4: 添加内存验证
  - layer: engine
  - files: `packages/image-ops/src/worker/imageWorker.worker.ts`
  - **验收标准**：大量操作后内存不持续增长

---

## 手工验收清单

- [x] 相同尺寸的 Canvas 被复用
- [x] 不同尺寸的 Canvas 独立缓存
- [x] 超过 TTL 的 Canvas 被正确驱逐
- [x] 池满时 LRU 驱逐正常工作
- [x] `enabled: false` 禁用缓存
- [x] 图像处理结果不变
