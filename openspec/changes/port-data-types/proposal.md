# Port Data Types - 端口数据类型抽象提案

## Why

当前的设计明确定义了节点的 `inputs` 和 `outputs` 端口结构，但**缺失了端口内部流转的数据类型定义**。这会导致：

1. **类型不一致**：A 节点输出 `Blob`，B 节点期望 `ImageData`，链路崩溃
2. **插件开发无规范**：开发者无法知道应该输出什么类型
3. **运行时风险**：错误只能在执行时才能发现，而非编译时

为了支持插件化架构，必须在核心引擎层面建立**严格的端口数据类型系统**。

## What Changes

### 新增类型系统

- **PortDataType 枚举**：定义所有标准数据类型
- **PipelineData 接口**：标准化的数据包装器
- **TypeConverter 注册表**：支持类型自动转换
- **TypeValidator 工具**：运行时类型校验

### 类型规范

- 每个端口必须声明 `dataType`
- 引擎在连线时校验类型兼容性
- 不兼容类型通过 Converter 转换
- 支持的类型：IMAGE, MASK, VIDEO, AUDIO, JSON, STRING, NUMBER, BOOLEAN, FILE

### 向后兼容

- **BREAKING**：所有现有节点定义需补充 `dataType` 字段
- 类型校验仅在 `dev` 模式下强制，`prod` 模式下可配置跳过

## Capabilities

### New Capabilities

- `port-data-type-system`: 端口数据类型系统，定义标准类型枚举、PipelineData 包装器、类型兼容性规则
- `type-converter-registry`: 类型转换器注册表，支持不同数据类型之间的自动转换
- `pipeline-data-wrapper`: PipelineData 标准化数据包装器，包含类型标记、元数据、原始数据

### Modified Capabilities

- `workflow-engine`: ExecutionContext 需要使用 PipelineData 进行数据传递，执行前校验类型兼容性
- `workflow-canvas`: 连线时校验端口数据类型，不兼容则拒绝连接

## Impact

- **packages/shared-types**：`PortDefinition` 接口新增 `dataType` 字段
- **packages/workflow-core**：新增类型校验和转换逻辑
- **packages/node-definitions**：所有节点需补充 `dataType` 声明
- **apps/dev-tool**：连线时显示类型信息，类型不兼容时显示警告
- **向后兼容**：dev 模式强制检查，prod 模式可选
