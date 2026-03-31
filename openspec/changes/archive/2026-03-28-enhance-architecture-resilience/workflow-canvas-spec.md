# Workflow Canvas - 节点画布规格

## ADDED Requirements

### Requirement: 画布状态通过 Zustand 统一管理
系统 SHALL 使用 canvasStore 管理所有画布状态，包括节点、连线、选中状态和视图。

#### Scenario: 节点状态集中管理
- **WHEN** 节点数据发生变化
- **THEN** canvasStore 的 nodes 字段同步更新

#### Scenario: 连线状态集中管理
- **WHEN** 连线数据发生变化
- **THEN** canvasStore 的 edges 字段同步更新

#### Scenario: 选中状态集中管理
- **WHEN** 用户选中节点
- **THEN** canvasStore 的 selectedNodeIds 数组更新

### Requirement: Zustand 与 React Flow 双向同步
系统 SHALL 保持 Zustand store 和 React Flow 组件之间的状态同步。

#### Scenario: UI 到 Store 同步
- **WHEN** 用户通过 React Flow UI 操作（拖拽、删除等）
- **THEN** onNodesChange/onEdgesChange 回调更新 Zustand store

#### Scenario: Store 到 UI 同步
- **WHEN** 代码修改 Zustand store
- **THEN** React Flow 组件响应变化并重新渲染

## MODIFIED Requirements

### Requirement: 用户可以在节点之间创建连接
系统 SHALL 支持在节点的输出端口和输入端口之间创建连线。连线应反映数据流向。系统 SHALL 在创建连线时校验端口类型的兼容性。

#### Scenario: 连接两个节点
- **WHEN** 用户从节点 A 的输出端口拖拽到节点 B 的输入端口
- **THEN** 创建一条连线，节点 A 的输出连接到节点 B 的输入

#### Scenario: 连接类型验证
- **WHEN** 用户尝试连接不兼容的端口（如图像输出连接到数值输入）
- **THEN** 系统拒绝连接并显示错误提示

#### Scenario: 类型兼容校验
- **WHEN** 用户尝试连接 IMAGE 输出到 MASK 输入
- **THEN** 连接被允许（图像可作为 mask）

### Requirement: 用户可以配置节点参数
系统 SHALL 在选中节点时显示参数面板，允许用户修改节点配置。参数变更通过 Zustand 状态管理。

#### Scenario: 查看节点参数
- **WHEN** 用户选中画布上的节点
- **THEN** 右侧参数面板显示该节点的所有可配置参数

#### Scenario: 修改节点参数
- **WHEN** 用户在参数面板中修改参数值
- **THEN** 节点配置通过 canvasStore.updateNodeParams 更新，画布上的节点预览立即更新
