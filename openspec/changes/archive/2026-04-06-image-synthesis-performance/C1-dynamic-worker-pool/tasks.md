# C1: 动态 Worker 池

> **Repo Analysis**：见 [`image-synthesis-performance/repo-analysis.md`](../../image-synthesis-performance/repo-analysis.md)

## 前置条件

- 无依赖，可直接开始

---

## Test Plan（测试设计）

### 测试策略

|| 层级 | 测试类型 | 验证命令 |
|------|------|----------|
| engine | 单元测试 | `pnpm test --filter=@prism/image-ops` |

### Test Cases

#### TC-1: 默认动态计算
- **Given**: 浏览器环境，`hardwareConcurrency = 8`
- **When**: 创建 WorkerPool 不指定参数
- **Then**: Worker 数量为 4（cap at maxSize）

#### TC-2: 固定大小模式
- **Given**: `WorkerPool({ size: 2, dynamic: false })`
- **When**: 创建 WorkerPool
- **Then**: Worker 数量为 2

#### TC-4: 低核心设备
- **Given**: `hardwareConcurrency = 2`
- **When**: 创建 WorkerPool
- **Then**: Worker 数量为 1

### Backward Compatibility

- [x] 现有 `new WorkerPool({ size: 2 })` 代码仍然有效
- [x] Worker 行为不变，只改变数量

---

## 任务列表

> Task 元数据格式：
> ```html
> <!-- opsx-meta
> id: T1
> layer: engine
> risk: low
> verify:
>   - unit-tests
> -->
> ```

<!-- opsx-meta
id: T1
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T1: 添加 Worker 数量计算函数
  - layer: engine
  - files: `packages/image-ops/src/scheduler/workerPool.ts`
  - **验收标准**：根据 hardwareConcurrency 正确计算 Worker 数量

<!-- opsx-meta
id: T2
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T2: 更新 WorkerPoolConfig 接口
  - layer: engine
  - files: `packages/image-ops/src/scheduler/workerPool.ts`
  - **验收标准**：新接口向后兼容旧接口

<!-- opsx-meta
id: T3
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T3: 修改 initialize() 使用动态计算
  - layer: engine
  - files: `packages/image-ops/src/scheduler/workerPool.ts`
  - **验收标准**：Worker 数量根据设备动态调整

<!-- opsx-meta
id: T4
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T4: 添加单元测试
  - layer: engine
  - files: `packages/image-ops/src/workerPool.test.ts`
  - **验收标准**：测试覆盖各种硬件配置

---

## 手工验收清单

- [x] 8 核设备上 WorkerPool 初始化 4 个 Worker
- [x] 2 核设备上 WorkerPool 初始化 1 个 Worker
- [x] `dynamic: false` 时使用固定数量
- [x] 现有代码不报错
