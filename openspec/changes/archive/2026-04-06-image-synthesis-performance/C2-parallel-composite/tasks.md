# C2: 并行多层合成

> **Repo Analysis**：见 [`image-synthesis-performance/repo-analysis.md`](../../image-synthesis-performance/repo-analysis.md)

## 前置条件

- C1: 动态 Worker 池 — 必须完成

---

## Test Plan（测试设计）

### 测试策略

|| 层级 | 测试类型 | 验证命令 |
|------|------|----------|
| engine | 单元测试 + 正确性测试 | `pnpm test --filter=@prism/image-ops` |
| engine | 性能基准测试 | 手动测试 / benchmark |

### Test Cases

#### TC-1: 正确性 - 像素级对比
- **Given**: 10 层 overlay 的合成
- **When**: 分别用串行和并行执行
- **Then**: 像素级对比完全一致

#### TC-2: 正确性 - 边界情况
- **Given**: 0/1 个 overlay
- **When**: 并行合成
- **Then**: 正确处理（退化为直接返回）

#### TC-3: 正确性 - 不同尺寸
- **Given**: 不同尺寸的 overlay
- **When**: 并行合成
- **Then**: 所有 overlay 正确合成到 base

#### TC-4: 性能 - 加速比
- **Given**: 10 层 overlay
- **When**: 并行执行
- **Then**: 加速比 ≥ 1.3x（相对于串行）

### Backward Compatibility

- [x] 添加 `forceSerial` 选项可恢复串行行为
- [x] 像素级输出与优化前完全一致

---

## 任务列表

<!-- opsx-meta
id: T1
layer: engine
risk: medium
verify:
  - unit-tests
  - correctness-tests
-->
- [x] T1: 在 ImageWorker 中添加 createGroupComposite 方法
  - layer: engine
  - files: `packages/image-ops/src/worker/imageWorker.worker.ts`
  - **验收标准**：单次调用合成多个 overlay

<!-- opsx-meta
id: T2
layer: engine
risk: high
verify:
  - unit-tests
  - correctness-tests
-->
- [x] T2: 实现 parallelComposite 函数
  - layer: engine
  - files: `packages/image-ops/src/composite.ts`
  - **验收标准**：分组并行执行 overlay

<!-- opsx-meta
id: T3
layer: engine
risk: medium
verify:
  - correctness-tests
-->
- [x] T3: 添加像素级正确性测试
  - layer: engine
  - files: `packages/image-ops/src/composite.test.ts`
  - **验收标准**：串行和并行输出像素级一致

<!-- opsx-meta
id: T4
layer: engine
risk: low
verify:
  - performance-test
-->
- [x] T4: 添加性能基准测试
  - layer: engine
  - files: `packages/image-ops/src/composite.test.ts`
  - **验收标准**：加速比 ≥ 1.3x

<!-- opsx-meta
id: T5
layer: engine
risk: low
verify:
  - smoke-test
-->
- [x] T5: 添加 forceSerial 调试选项
  - layer: engine
  - files: `packages/image-ops/src/composite.ts`
  - **验收标准**：可切换回串行执行

---

## 手工验收清单

- [x] 10 层叠加执行时间减少 30%+
- [x] 输出图像与串行执行完全一致
- [x] 不同尺寸 overlay 正确处理
- [x] `forceSerial: true` 时输出不变
