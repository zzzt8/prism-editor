# Pipeline Data Wrapper - PipelineData 标准化包装器规格

## ADDED Requirements

### Requirement: PipelineData 包含必要字段
系统 SHALL 要求 PipelineData 包含 type、data、metadata 三个必要字段。

#### Scenario: PipelineData 结构验证
- **WHEN** 创建 PipelineData 时
- **THEN** 必须包含 type（PortDataType）、data（实际数据）、metadata（DataMetadata）

#### Scenario: 只读属性
- **WHEN** PipelineData 被创建后
- **THEN** type、data、metadata 为只读属性

### Requirement: DataMetadata 包含图像元信息
系统 SHALL 要求图像类型的 PipelineData 包含尺寸和通道信息。

#### Scenario: 图像数据元信息
- **WHEN** PipelineData 包装 ImageData 时
- **THEN** metadata 包含 width、height、channels

#### Scenario: MIME 类型记录
- **WHEN** PipelineData 包装文件数据时
- **THEN** metadata 包含 mimeType

### Requirement: PipelineData 支持泛型类型
系统 SHALL 使用泛型确保数据类型安全。

#### Scenario: 类型安全访问
- **WHEN** 定义 output: PipelineData<ImageData>
- **THEN** TypeScript 正确推断 data 为 ImageData

#### Scenario: 类型推断
- **WHEN** 接收 PipelineData 参数时
- **THEN** 可通过泛型指定期望的数据类型

### Requirement: 提供 toPipeline 辅助函数
系统 SHALL 提供辅助函数简化 PipelineData 创建。

#### Scenario: 简化创建
- **WHEN** 调用 toPipeline(data, 'image')
- **THEN** 返回包含 type、data、metadata 的 PipelineData

#### Scenario: 自动推断 metadata
- **WHEN** toPipeline 接收 ImageData 时
- **THEN** 自动提取 width、height、channels 到 metadata
