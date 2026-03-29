# Workflow Engine - 工作流执行引擎规格

## ADDED Requirements

### Requirement: ExecutionContext 支持异步任务
系统 SHALL 扩展 ExecutionContext 支持三种任务类型：同步任务、异步任务和轮询任务。

#### Scenario: 同步任务执行
- **WHEN** 节点实现同步任务（type: 'sync'）
- **THEN** 引擎按顺序执行，任务完成后立即继续

#### Scenario: 异步任务执行
- **WHEN** 节点实现异步任务（type: 'async'）
- **THEN** 引擎等待 Promise resolve，结果传递给下游节点

#### Scenario: 轮询任务执行
- **WHEN** 节点实现轮询任务（type: 'poll'）
- **THEN** 引擎按指定间隔轮询，直到满足条件或达到最大次数

### Requirement: 异步任务调度通过 Worker
系统 SHALL 将异步节点调度到 Web Worker 执行，避免阻塞主线程。

#### Scenario: AI 节点执行
- **WHEN** 工作流包含 AI 处理节点
- **THEN** 该节点在 Worker 中执行，轮询外部 API 状态

#### Scenario: 任务结果回调
- **WHEN** 异步任务完成
- **THEN** 引擎接收结果，继续调度下游节点

### Requirement: 引擎支持异步任务状态追踪
系统 SHALL 在执行过程中追踪每个异步任务的状态。

#### Scenario: 任务状态报告
- **WHEN** 异步任务处于轮询中
- **THEN** 引擎报告当前任务状态（如 "等待 AI 处理"）

#### Scenario: 异步任务超时
- **WHEN** 轮询任务超过最大次数
- **THEN** 引擎标记任务失败，报告超时错误

## MODIFIED Requirements

### Requirement: 工作流引擎可以执行完整链路
系统 SHALL 按拓扑顺序执行工作流中的所有节点，从输入节点到输出节点。引擎 SHALL 支持同步和异步任务的混合执行。

#### Scenario: 执行完整工作流
- **WHEN** 用户触发工作流执行
- **THEN** 引擎按依赖顺序执行每个节点（同步或异步），最终产出输出结果

#### Scenario: 执行顺序验证
- **WHEN** 引擎准备执行节点
- **THEN** 确保该节点的所有输入依赖都已完成执行（包括异步任务）

#### Scenario: 混合任务执行
- **WHEN** 工作流包含同步和异步节点
- **THEN** 引擎正确处理执行顺序，异步任务完成后调度下游节点

### Requirement: 引擎支持并发执行优化
系统 SHALL 在没有依赖关系的节点间尽可能并行执行。异步节点 SHALL 由 Worker 调度执行。

#### Scenario: 并行执行独立节点
- **WHEN** 多个节点之间没有数据依赖
- **THEN** 引擎可以并行执行这些节点（同步并行或 Worker 并行）以提高性能

#### Scenario: Worker 并行处理
- **WHEN** 异步节点之间没有依赖
- **THEN** 多个 Worker 可以同时处理不同的异步节点

### Requirement: 引擎提供执行状态和错误信息
系统 SHALL 在执行过程中向用户反馈状态，包括异步任务的进度，并在出错时提供清晰的错误信息。

#### Scenario: 显示执行进度
- **WHEN** 工作流正在执行
- **THEN** 用户界面显示当前执行的节点（包括异步任务状态）和进度

#### Scenario: 异步任务进度显示
- **WHEN** 异步节点处于轮询状态
- **THEN** UI 显示轮询进度（如 "轮询中 3/10"）

#### Scenario: 处理执行错误
- **WHEN** 节点执行失败（包括异步任务）
- **THEN** 系统显示错误信息并高亮失败节点
