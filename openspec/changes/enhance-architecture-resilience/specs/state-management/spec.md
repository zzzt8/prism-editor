# State Management - 状态管理规格

## ADDED Requirements

### Requirement: 系统使用 Zustand 统一管理画布状态
系统 SHALL 使用 Zustand store 管理所有画布相关状态，包括节点数据、连线数据、选中状态和视图状态。

#### Scenario: 节点数据同步
- **WHEN** 用户在画布上添加、删除或移动节点
- **THEN** canvasStore 中的 nodes 数组同步更新

#### Scenario: 连线数据同步
- **WHEN** 用户创建或删除连线
- **THEN** canvasStore 中的 edges 数组同步更新

#### Scenario: 选中状态管理
- **WHEN** 用户选中或取消选中节点
- **THEN** canvasStore 中的 selectedNodeIds 数组同步更新

#### Scenario: 视图状态持久化
- **WHEN** 用户缩放或平移画布
- **THEN** canvasStore 中的 viewport 状态同步更新

### Requirement: 系统使用 Zustand 管理工作流状态
系统 SHALL 使用 workflowStore 管理当前工作流的加载、保存和修改状态。

#### Scenario: 工作流修改标记
- **WHEN** 用户修改工作流（添加节点、修改参数等）
- **THEN** workflowStore 中的 isDirty 标记为 true

#### Scenario: 工作流保存
- **WHEN** 用户保存工作流
- **THEN** workflowStore 将当前状态持久化，isDirty 重置为 false

#### Scenario: 工作流加载
- **WHEN** 用户加载已有工作流
- **THEN** workflowStore 从存储中读取工作流数据，替换当前状态

### Requirement: 系统使用 Zustand 管理执行状态
系统 SHALL 使用 executionStore 管理工作流执行的状态、进度和结果。

#### Scenario: 执行状态跟踪
- **WHEN** 工作流开始执行
- **THEN** executionStore 的 status 变为 'running'

#### Scenario: 执行进度更新
- **WHEN** 每个节点执行完成
- **THEN** executionStore 的 progress 计数器递增

#### Scenario: 执行结果存储
- **WHEN** 节点执行完成并产出结果
- **THEN** executionStore 的 results 中存储该节点的输出数据

#### Scenario: 执行错误处理
- **WHEN** 节点执行失败
- **THEN** executionStore 的 status 变为 'error'，记录错误信息

### Requirement: Zustand store 与 React Flow 同步
系统 SHALL 保持 Zustand store 与 React Flow 组件的状态同步。

#### Scenario: UI 操作同步到 Store
- **WHEN** 用户通过 React Flow UI 操作节点
- **THEN** onNodesChange 和 onEdgesChange 回调同步更新 Zustand store

#### Scenario: Store 更新同步到 UI
- **WHEN** 代码直接修改 Zustand store
- **THEN** React Flow 组件感知状态变化并重新渲染
