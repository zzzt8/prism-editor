# Workflow Publish - 工作流发布机制规格

## ADDED Requirements

### Requirement: 开发者可以发布工作流
系统 SHALL 提供发布功能，将开发态工作流转为用户可运行的发布态。

#### Scenario: 触发发布
- **WHEN** 开发者点击"发布"按钮
- **THEN** 系统生成发布态工作流配置

### Requirement: 发布时可配置用户可见参数
系统 SHALL 允许开发者选择哪些参数对终端用户可见。

#### Scenario: 选择可见参数
- **WHEN** 开发者配置发布设置
- **THEN** 可以指定哪些节点参数对用户开放编辑

#### Scenario: 隐藏内部参数
- **WHEN** 开发者将某些参数标记为内部参数
- **THEN** 这些参数在用户端不可见或不可编辑

### Requirement: 发布时可配置输入项
系统 SHALL 允许开发者配置哪些输入需要用户提供。

#### Scenario: 配置输入项
- **WHEN** 开发者配置发布设置
- **THEN** 可以为每个输入项设置名称、说明和默认值

### Requirement: 发布时可配置输出项
系统 SHALL 允许开发者配置输出项的名称和格式。

#### Scenario: 配置输出项
- **WHEN** 开发者配置发布设置
- **THEN** 可以指定输出项的名称和可选的格式转换

### Requirement: 发布后生成用户端预览
系统 SHALL 在发布后生成用户端的预览界面。

#### Scenario: 生成用户端预览
- **WHEN** 发布完成后
- **THEN** 系统显示该工作流在用户端的样子预览

### Requirement: 发布历史记录
系统 SHALL 保存发布历史，支持版本管理和回滚。

#### Scenario: 查看发布历史
- **WHEN** 开发者查看已发布工作流
- **THEN** 可以看到历史发布版本列表

#### Scenario: 回滚到旧版本
- **WHEN** 开发者选择回滚到某个旧版本
- **THEN** 用户端使用该旧版本运行工作流
