# Port Type Validation - 端口类型校验规格

## ADDED Requirements

### Requirement: 系统定义端口类型枚举
系统 SHALL 定义 PortType 枚举，包含 image、mask、number、string、boolean 五种类型。

#### Scenario: 类型定义完整性
- **WHEN** 系统初始化
- **THEN** PortType 枚举包含所有定义的类型值

#### Scenario: 类型常量可用
- **WHEN** 代码引用 PortType.IMAGE
- **THEN** 得到正确的字符串值 'image'

### Requirement: 系统定义端口类型兼容性矩阵
系统 SHALL 定义端口类型兼容性规则，用于判断两个端口是否可以连接。

#### Scenario: 图像类型兼容性
- **WHEN** 判断 IMAGE 输出连接到 IMAGE 输入
- **THEN** 连接被允许

#### Scenario: Mask 类型兼容性
- **WHEN** 判断 IMAGE 输出连接到 MASK 输入
- **THEN** 连接被允许（图像可作为 mask 使用）

#### Scenario: 数值类型不兼容
- **WHEN** 判断 NUMBER 输出连接到 IMAGE 输入
- **THEN** 连接被拒绝

### Requirement: 系统在连线时校验类型兼容性
系统 SHALL 在用户创建连线时校验端口类型，不允许不兼容的连接。

#### Scenario: 类型兼容连接
- **WHEN** 用户尝试连接兼容类型的端口
- **THEN** 连线创建成功

#### Scenario: 类型不兼容拒绝
- **WHEN** 用户尝试连接不兼容类型的端口
- **THEN** 系统拒绝连接，显示错误提示

#### Scenario: 实时类型提示
- **WHEN** 用户拖拽连线到某个端口上方
- **THEN** 显示该端口的类型提示

### Requirement: 每个节点定义其端口类型
系统 SHALL 要求每个节点定义明确声明每个端口的类型。

#### Scenario: 节点定义包含端口类型
- **WHEN** 定义 LoadImage 节点
- **THEN** 节点定义中 output.port 的类型为 IMAGE

#### Scenario: 类型定义验证
- **WHEN** 工作流加载时
- **THEN** 系统验证所有节点的端口类型定义完整

### Requirement: 系统支持类型推断辅助
系统 SHALL 提供类型推断功能，对于常见模式提供合理的默认类型。

#### Scenario: 默认图像输出
- **WHEN** 节点未明确指定输出类型
- **THEN** 默认类型为 IMAGE
