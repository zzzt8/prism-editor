# Design Tokens - 设计变量系统规格

## ADDED Requirements

### Requirement: 系统定义完整的颜色 Token
系统 SHALL 提供覆盖背景、边框、文字、强调色、状态色的完整颜色变量。

#### Scenario: 背景颜色层级
- **WHEN** 开发者使用 --bg-canvas 变量
- **THEN** 得到深灰黑色值 #0D0D0F

#### Scenario: 背景面板层级
- **WHEN** 开发者使用 --bg-surface 变量
- **THEN** 得到比画布略亮的面板背景色 #141416

#### Scenario: 边框颜色层级
- **WHEN** 开发者使用 --border-subtle 变量
- **THEN** 得到低对比细边框色 #2A2A2D

### Requirement: 系统定义文字颜色 Token
系统 SHALL 提供主要、次要、占位符、禁用态的文字颜色。

#### Scenario: 主要文字
- **WHEN** 开发者使用 --text-primary 变量
- **THEN** 得到白色 #FFFFFF

#### Scenario: 次要文字
- **WHEN** 开发者使用 --text-secondary 变量
- **THEN** 得到灰色 #A0A0A5

#### Scenario: 禁用态文字
- **WHEN** 开发者使用 --text-disabled 变量
- **THEN** 得到暗灰色 #404045

### Requirement: 系统定义强调色 Token
系统 SHALL 提供主强调色及其悬停态和柔和变体。

#### Scenario: 主强调色
- **WHEN** 开发者使用 --accent-primary 变量
- **THEN** 得到靛蓝色 #6366F1

#### Scenario: 强调色悬停态
- **WHEN** 开发者使用 --accent-hover 变量
- **THEN** 得到略浅的靛蓝色 #818CF8

#### Scenario: 强调色柔和变体
- **WHEN** 开发者使用 --accent-muted 变量
- **THEN** 得到半透明靛蓝 rgba(99, 102, 241, 0.15)

### Requirement: 系统定义状态色 Token
系统 SHALL 提供成功、警告、错误、信息四种状态色。

#### Scenario: 成功状态色
- **WHEN** 开发者使用 --status-success 变量
- **THEN** 得到绿色 #22C55E

#### Scenario: 警告状态色
- **WHEN** 开发者使用 --status-warning 变量
- **THEN** 得到橙色 #F59E0B

#### Scenario: 错误状态色
- **WHEN** 开发者使用 --status-error 变量
- **THEN** 得到红色 #EF4444

### Requirement: 系统定义端口颜色 Token
系统 SHALL 为不同数据类型端口定义专属颜色。

#### Scenario: 图像端口颜色
- **WHEN** 开发者使用 --port-image 变量
- **THEN** 得到紫色 #8B5CF6

#### Scenario: Mask 端口颜色
- **WHEN** 开发者使用 --port-mask 变量
- **THEN** 得到青色 #06B6D4

#### Scenario: 数值端口颜色
- **WHEN** 开发者使用 --port-number 变量
- **THEN** 得到橙色 #F59E0B

### Requirement: 系统提供 TypeScript 类型定义
系统 SHALL 提供 ColorTokens 接口类型定义。

#### Scenario: 类型安全访问
- **WHEN** 代码使用 tokens.text.primary
- **THEN** TypeScript 正确推断类型为 string
