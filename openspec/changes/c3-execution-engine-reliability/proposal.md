---
name: c3-execution-engine-reliability
change_class: high
change_profile: high
reason: "触及 workflow-core 执行引擎核心逻辑、image-ops Worker 调度、以及 dev-tool/user-app 的执行取消流程"
---

## Task Anchor Echo

- **原始任务**: 修复 prism-editor 全部硬伤，分多步走
- **change 名称**: `c3-execution-engine-reliability`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] 取消运行按正确产品行为定义，用户点取消后所有正在跑的节点在当前批次完成后停止
  - [ ] 不做执行引擎重写，只修 bug 和健壮性

## Why

当前流水线执行有 3 个可靠性问题：
1. dev-tool 和 user-app 的"取消"按钮只是打了个日志，没有真正停止执行
2. Worker 池调度在出错重试时使用了被替换的 Worker 引用，可能导致任务跑到错误的 Worker 上
3. 复制节点时如果连线配置有问题，错误信息里把 source 写成了 target，误导用户

## What Changes

1. dev-tool 的 `executionService.cancel()` 实现真正的 AbortController 链
2. dev-tool 的 `useCanvasStore` 的 `cancelExecution()` 调 `executionService.cancel()`
3. user-app 的 `runWorkflow.ts` 的 `cancel()` 实现 AbortController 信号
4. user-app 的 `runStore.ts` 加 `cancelling` 中间状态
5. `workerPool.ts` 修复重试时使用 stale worker index 的 bug
6. `useCanvasStore.ts` 修复错误信息（targetHandle required 而非 sourceHandle required）
7. `workerPool.ts` 的 `MAX_ATTEMPTS` 从硬编码改为从环境变量读取（`WORKER_POOL_MAX_ATTEMPTS`），默认 200

## Capabilities

### Modified Capabilities

- **流水线执行**: 用户点取消后，执行在当前节点批次完成后停止，不再跑下游节点
- **Worker 调度**: 出错重试时任务分配到正确的 Worker

## Impact

- packages/image-ops/src/scheduler/workerPool.ts
- apps/dev-tool/src/modules/editor/services/executionService.ts
- apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts
- apps/user-app/src/modules/runner/runWorkflow.ts
- apps/user-app/src/modules/runner/runStore.ts

## Out of Scope

- 执行引擎重写（流水线并行执行、节点异步化）
- 节点级别的取消（取消单个节点而非整条流水线）
- Worker 池的动态扩容/缩容
- nodeCache 重复实现删除（属于 C2 范围）
- dev-tool console.log 清理（属于 C6 范围）
- dev-tool MAX_ATTEMPTS 可配置化（原在 C6，现移至 C3）
