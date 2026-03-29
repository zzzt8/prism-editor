# Type Converter Registry - 类型转换器注册表规格

## ADDED Requirements

### Requirement: 系统提供 TypeConverterRegistry
系统 SHALL 提供类型转换器注册表用于管理数据转换。

#### Scenario: 注册转换器
- **WHEN** 开发者注册 IMAGE → MASK 转换器
- **THEN** 转换器被添加到 Registry 中

#### Scenario: 查询可转换性
- **WHEN** 调用 canConvert('image', 'mask')
- **THEN** 返回 true

#### Scenario: 查询不可转换
- **WHEN** 调用 canConvert('number', 'image')
- **THEN** 返回 false

### Requirement: 系统内置标准转换器
系统 SHALL 提供内置的常用类型转换器。

#### Scenario: IMAGE → MASK 转换
- **WHEN** 转换 IMAGE 为 MASK
- **THEN** 提取图像的 Alpha 通道作为 MASK 输出

#### Scenario: MASK → IMAGE 转换
- **WHEN** 转换 MASK 为 IMAGE
- **THEN** 将灰度 MASK 转换为 RGBA 图像

#### Scenario: FILE → IMAGE 转换
- **WHEN** 转换 FILE 为 IMAGE
- **THEN** 加载文件为 ImageData 输出

### Requirement: 执行引擎自动应用转换器
系统 SHALL 在执行节点前自动应用必要的类型转换。

#### Scenario: 自动转换时机
- **WHEN** 节点输入类型不匹配但可转换时
- **THEN** 引擎自动调用对应转换器

#### Scenario: 转换后执行
- **WHEN** 输入经过转换
- **THEN** 节点接收转换后的 PipelineData 执行

#### Scenario: 转换失败处理
- **WHEN** 转换失败
- **THEN** 抛出转换错误，包含失败原因

### Requirement: 转换器可扩展
系统 SHALL 支持第三方插件注册自定义转换器。

#### Scenario: 插件注册转换器
- **WHEN** 插件调用 registry.register(converter)
- **THEN** 转换器被注册并可用

#### Scenario: 转换器优先级
- **WHEN** 多个转换器处理相同类型对
- **THEN** 后注册的转换器覆盖先前的

### Requirement: 转换器防止循环依赖
系统 SHALL 检测并防止类型转换循环依赖。

#### Scenario: 循环检测
- **WHEN** 注册 A→B、B→A 转换器
- **THEN** 系统检测到循环并拒绝注册
