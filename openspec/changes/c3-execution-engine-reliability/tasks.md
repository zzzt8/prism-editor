## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| engine | 单元测试（Worker 重试 + abort） | `pnpm test --filter=@prism/image-ops` |
| engine | 单元测试（cancel + topological sort） | `pnpm test --filter=@prism/workflow-core` |
| editor | Smoke test | 手工验收 |
| runtime | Smoke test | 手工验收 |

### Test Cases

#### TC-1: 流水线可被取消
- **Given**: 流水线执行中（有多个节点）
- **When**: 用户点击取消
- **Then**: 执行在当前批次节点完成后停止，不再调度新节点
- **验证命令**: 手工测试（无自动测试覆盖取消流程）

#### TC-2: Worker 替换后重试分配到正确的 Worker
- **Given**: Worker A 连续错误超限被替换为 Worker B
- **When**: 任务重试
- **Then**: 任务分配到 Worker B，而非原 Worker A 的槽位
- **验证命令**: `pnpm test --filter=@prism/image-ops -- --grep "worker"`

#### TC-3: 错误信息准确
- **Given**: targetHandle 缺失的连线
- **When**: 调用 toWorkflow()
- **Then**: 抛出 "targetHandle is required"，不是 "sourceHandle is required"
- **验证命令**: 手工测试或添加单元测试

#### TC-4: 取消后不破坏已完成结果
- **Given**: 流水线有 3 个节点，已完成 2 个
- **When**: 在第 3 个节点执行中点取消
- **Then**: 前 2 个节点的结果保留，第 3 个未完成
- **验证命令**: 手工测试

### Backward Compatibility（向后兼容）

- [ ] 已有流水线 JSON 仍可执行
- [ ] 已有节点包兼容（abort signal 是可选的）
- [ ] API 接口不变

---

## 任务列表

> **Task 元数据格式：**
> ```html
> <!-- opsx-meta
> id: T1
> layer: engine
> verify: unit-tests
> dependencies:
>   - type: task
>     refs: []
> -->
> ```

<!-- opsx-meta
id: T1
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T1: 修复 `workerPool.ts` Worker 替换后重试索引 bug
  - layer: engine
  - **验收标准**: Worker 替换后重试任务分配到新 Worker

<!-- opsx-meta
id: T2
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T2: `executionService.ts` 实现 AbortController 链 — 创建 AbortController，cancel() 调用 abort()，传递 signal 到 WorkflowExecutor
  - layer: engine
  - **验收标准**: `pnpm typecheck --filter=@prism/dev-tool` 无错误

<!-- opsx-meta
id: T3
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T2]
-->
- [x] T3: `useCanvasStore.cancelExecution()` 调 `executionService.cancel()`
  - layer: editor
  - **验收标准**: 点取消后流水线停止

<!-- opsx-meta
id: T4
layer: runtime
verify: smoke-test
dependencies:
  - type: task
    refs: [T2]
-->
- [ ] T4: `runWorkflow.ts` 的 cancel() 实现 AbortController 信号
  - layer: runtime
  - **验收标准**: user-app 点取消后流水线停止

<!-- opsx-meta
id: T5
layer: runtime
verify: smoke-test
dependencies:
  - type: task
    refs: [T4]
-->
- [ ] T5: `runStore.ts` 加 `cancelling` 中间状态
  - layer: runtime
  - **验收标准**: UI 显示"正在取消..."状态

<!-- opsx-meta
id: T6
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [x] T6: 修复 `useCanvasStore.ts` 错误信息 — targetHandle 缺失时报 "targetHandle is required"
  - layer: editor
  - **验收标准**: 错误信息准确

<!-- opsx-meta
id: T7
layer: engine
verify: smoke-test
dependencies:
  - type: task
    refs: [T1]
-->
- [x] T7: `workerPool.ts` 的 `MAX_ATTEMPTS` 从硬编码改为 `process.env['WORKER_POOL_MAX_ATTEMPTS']`，默认 200
  - layer: engine
  - **验收标准**: `pnpm typecheck --filter=@prism/image-ops` 无错误

---

### 手工验收清单

- [ ] 启动 dev-tool，加载流水线，点"运行"，运行中途点"取消"，确认执行停止
- [ ] 启动 user-app，加载 published workflow，点"运行"，运行中途点"取消"，确认执行停止
- [ ] 在 dev-tool 中制造一个 targetHandle 缺失的连线，观察错误信息是否为 "targetHandle is required"

---

## Layer 优先级执行策略

> 按优先级从高到低执行：engine > backend > editor > runtime > ui-skin > meta

- T1（Worker bug）在 engine 层，最先完成
- T2（AbortController）在 engine 层
- T3 依赖 T2，在 editor 层
- T4、T5 依赖 T2，在 runtime 层
- T6 独立，在 editor 层
- T7 依赖 T1，在 engine 层（同一文件，T1 先完成再改 MAX_ATTEMPTS）
