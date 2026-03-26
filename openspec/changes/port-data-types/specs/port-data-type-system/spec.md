# Port Data Type System - 端口数据类型系统规格

## ADDED Requirements

### Requirement: 系统定义 PortDataType 枚举
系统 SHALL 定义 PortDataType 枚举，包含所有标准数据类型。

#### Scenario: 类型枚举完整性
- **WHEN** 系统初始化
- **THEN** PortDataType 包含：IMAGE, MASK, VIDEO, AUDIO, FILE, JSON, STRING, NUMBER, BOOLEAN, ANY, VOID

#### Scenario: 类型常量引用
- **WHEN** 代码引用 PortDataType.IMAGE
- **THEN** 得到字符串值 'image'

### Requirement: PortDefinition 必须声明 dataType
系统 SHALL 要求每个端口定义包含 dataType 字段。

#### Scenario: 端口定义包含数据类型
- **WHEN** 定义 LoadImage 节点的 output 端口
- **THEN** 端口的 dataType 为 PortDataType.IMAGE

#### Scenario: 缺失 dataType 警告
- **WHEN** 节点定义的端口缺少 dataType
- **THEN** 系统在 dev 模式下输出警告

### Requirement: PipelineData 作为标准数据包装器
系统 SHALL 使用 PipelineData 封装所有流转数据。

#### Scenario: PipelineData 结构
- **WHEN** 节点输出数据时
- **THEN** 输出格式为 PipelineData，包含 type、data、metadata 字段

#### Scenario: 元数据包含
- **WHEN** PipelineData 包装图像数据时
- **THEN** metadata 包含 width、height、channels、mimeType

### Requirement: 类型兼容性矩阵
系统 SHALL 定义类型兼容性规则。

#### Scenario: IMAGE 兼容性
- **WHEN** 检查 IMAGE 类型可接受的输入类型
- **THEN** 包含 IMAGE 和 MASK

#### Scenario: 标量类型严格匹配
- **WHEN** 检查 NUMBER 类型可接受的输入类型
- **THEN** 仅包含 NUMBER

#### Scenario: VOID 类型无输出
- **WHEN** 检查 VOID 类型可接受的输入类型
- **THEN** 为空数组

### Requirement: canConnect 类型校验函数
系统 SHALL 提供 canConnect 函数判断两个端口是否可连接。

#### Scenario: 兼容类型可连接
- **WHEN** IMAGE 输出连接到 IMAGE 输入
- **THEN** canConnect 返回 { valid: true }

#### Scenario: 不兼容类型拒绝
- **WHEN** NUMBER 输出连接到 IMAGE 输入
- **THEN** canConnect 返回 { valid: false, reason: '...' }

#### Scenario: MASK 可降级为 IMAGE
- **WHEN** MASK 输出连接到 IMAGE 输入
- **THEN** canConnect 返回 { valid: true }（需转换器）
