# C8: Worker 化

> **Repo Analysis**：见 [`architecture-convergence/repo-analysis.md`](../../architecture-convergence/repo-analysis.md)

## 前置条件

- C3: canvas-store-slices（executionService 已统一）
- C6: version-server-side（版本号归服务端）

---

## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| engine | 单元测试 + 性能测试 | `pnpm test --filter=@prism/image-ops` |

### Test Cases

#### TC-1: Worker lane 执行
- **Given**: 含 transform 节点的 workflow
- **When**: 执行
- **Then**: 在 Worker 中执行，结果正确

#### TC-2: main-thread lane 执行
- **Given**: 含 load-image 节点的 workflow
- **When**: 执行
- **Then**: 在主线程执行，结果正确

### Backward Compatibility（向后兼容）

- [x] 所有节点执行结果与 Worker 化前一致
- [x] UI 不因图像处理而卡顿

---

## 任务列表

> Task 元数据格式：
> ```html
> <!-- opsx-meta
> id: T1
> layer: engine
> risk: high
> verify:
>   - unit-tests
>   - golden-fixture
> -->
> ```
>
> **layer 取值**：editor | runtime | backend | engine | ui-skin
> **risk 取值**：low | medium | high
> **verify 取值**：unit-tests | golden-fixture | api-tests | smoke-test | visual-check

<!-- opsx-meta
id: T1
layer: engine
risk: medium
verify:
  - unit-tests
-->
- [x] T1: 定义 Lane 选择策略
  - layer: engine
  - files: packages/image-ops/src/scheduler/laneSelector.ts
  - **验收标准**：节点类型 → lane 的映射定义完成

<!-- opsx-meta
id: T2
layer: editor
risk: high
verify:
  - smoke-test
-->
- [x] T2: 更新 executionService
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/services/executionService.ts
  - **验收标准**：支持 main-thread / worker 两种 lane

<!-- opsx-meta
id: T3
layer: engine
risk: medium
verify:
  - unit-tests
-->
- [x] T3: 迁移 Transform 到 Worker
  - layer: engine
  - files: packages/image-ops/src/transform.ts, packages/image-ops/src/scheduler/workerRunner.ts
  - **验收标准**：transform 节点在 Worker lane 执行

<!-- opsx-meta
id: T4
layer: engine
risk: medium
verify:
  - unit-tests
-->
- [x] T4: 迁移 Composite / ApplyMask 到 Worker
  - layer: engine
  - files: packages/image-ops/src/composite.ts, packages/image-ops/src/apply-mask.ts
  - **验收标准**：Composite 和 ApplyMask 节点在 Worker lane 执行

<!-- opsx-meta
id: T5
layer: engine
risk: low
verify:
  - performance-test
-->
- [x] T5: 性能测试
  - layer: engine
  - files: packages/image-ops/src/scheduler/workerRunner.ts
  - **验收标准**：Worker lane 性能优于 main-thread lane

---

## 手工验收清单

- [x] 含图像处理节点的 workflow 正常执行
- [x] UI 在图像处理时保持流畅
- [x] 执行结果与 Worker 化前一致
