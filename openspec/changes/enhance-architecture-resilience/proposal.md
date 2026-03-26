# 架构增强提案

## Why

MVP 阶段的基础架构设计已完成，但在实际实现前，需要解决几个关键技术风险：

1. **状态管理**：React Flow 官方推荐 Zustand，但原设计未明确状态管理方案，需要提前确定以避免后期重构
2. **性能保障**：图像处理在主线程执行会阻塞 UI，需要 Web Worker 任务调度池来保证流畅体验
3. **类型安全**：连线类型不校验会导致运行时崩溃，需要在设计阶段就明确端口类型校验机制
4. **扩展预留**：未来可能接入 AI 图像处理能力，需要在 ExecutionContext 层面预留异步任务支持

## What Changes

### 新增能力

- **Zustand 状态管理集成**：为 dev-tool 提供高性能的状态管理，支持画布节点数据的频繁更新
- **Web Worker 任务调度池**：将图像处理任务分流到 Worker 线程，防止 UI 阻塞
- **端口类型校验系统**：确保图像输出端口只能连接到图像输入端口
- **异步任务支持**：ExecutionContext 支持异步节点（API 调用、轮询等）

### 架构优化

- **内存管理系统**：引入 URL.createObjectURL 配合内存管理，防止浏览器内存溢出
- **ExecutionContext 重构**：支持 Task 类型（同步/异步），预留 AI 节点扩展能力

### 依赖变更

- **新增 Zustand 依赖**
- **新增 Comlink 依赖**（简化 Web Worker 通信）

## Capabilities

### New Capabilities

- `state-management`: Zustand 状态管理架构，为画布、节点、执行状态提供统一的状态管理方案
- `worker-scheduler`: Web Worker 任务调度池，支持将图像处理任务分发到 Worker 线程
- `port-type-validation`: 端口类型校验系统，确保连线类型安全
- `async-execution-context`: 异步执行上下文，支持同步任务、异步任务、轮询任务三种执行模式

### Modified Capabilities

- `workflow-engine`: ExecutionContext 需要支持异步任务模式，为未来 AI 节点扩展预留接口
- `workflow-canvas`: 状态管理重构，节点数据通过 Zustand 管理而非 React Context

## Impact

- **新增依赖**：`zustand`, `comlink`
- **packages/workflow-core**：`ExecutionContext` 接口扩展，新增 `Task` 类型和 `TaskScheduler`
- **packages/shared-types**：新增 `PortType` 枚举和端口类型校验逻辑
- **apps/dev-tool**：新增 Zustand store，为节点面板、画布、参数面板提供状态
- **apps/user-app**：可选引入 Zustand，用于复杂的参数状态管理
- **向后兼容**：所有扩展都是新增的，原有同步节点执行逻辑保持不变
