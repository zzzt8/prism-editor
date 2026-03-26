# User Tool Layout - 用户端布局规格

## ADDED Requirements

### Requirement: 用户端采用线性流程布局
系统 SHALL 采用 Input → Run → Output 的线性流程布局。

#### Scenario: 流程结构
- **WHEN** 用户打开用户端
- **THEN** 页面从上到下依次显示：标题说明、输入区、参数区、运行按钮、输出区

### Requirement: 页面顶部显示功能标题
系统 SHALL 在顶部显示工作流名称和简短说明。

#### Scenario: 功能标题
- **WHEN** 用户端渲染
- **THEN** 顶部显示工作流的名称（如"图片合成"）

#### Scenario: 功能说明
- **WHEN** 用户端渲染
- **THEN** 标题下方显示简短描述

### Requirement: 输入区清晰地展示所需输入
系统 SHALL 在输入区明确标注每个输入项的要求。

#### Scenario: 输入卡片
- **WHEN** 输入区渲染
- **THEN** 每个输入项显示为独立的卡片

#### Scenario: 必填标识
- **WHEN** 输入项为必填
- **THEN** 卡片标题显示"必填"标识

#### Scenario: 输入说明
- **WHEN** 输入项需要说明
- **THEN** 卡片包含简短描述

### Requirement: 参数区仅显示必要参数
系统 SHALL 在参数区只显示开发者开放的可调参数。

#### Scenario: 参数数量克制
- **WHEN** 参数区渲染
- **THEN** 仅显示开发者标记为"暴露"的参数

#### Scenario: 参数控件
- **WHEN** 参数为数值类型
- **THEN** 显示 Slider 控件

#### Scenario: 参数范围
- **WHEN** 参数有取值范围
- **THEN** Slider 显示当前值和范围

### Requirement: 运行按钮居中显示
系统 SHALL 在参数区下方居中显示运行按钮。

#### Scenario: 运行按钮位置
- **WHEN** 页面渲染
- **THEN** 运行按钮水平居中

#### Scenario: 运行按钮样式
- **WHEN** 按钮可用时
- **THEN** 使用主强调色，尺寸较大

#### Scenario: 运行中状态
- **WHEN** 工作流执行中
- **THEN** 按钮显示加载状态，禁用点击

### Requirement: 输出区突出显示结果
系统 SHALL 在输出区明显展示执行结果和下载选项。

#### Scenario: 输出预览
- **WHEN** 执行完成
- **THEN** 显示输出图像的大预览

#### Scenario: 多尺寸输出
- **WHEN** 工作流输出多个尺寸
- **THEN** 显示多个预览缩略图

#### Scenario: 下载按钮
- **WHEN** 输出可用
- **THEN** 显示明显的下载按钮
