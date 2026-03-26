# Shared Components - 共享组件库规格

## ADDED Requirements

### Requirement: 系统提供 Button 组件
系统 SHALL 提供支持多种变体和尺寸的 Button 组件。

#### Scenario: 主变体按钮
- **WHEN** 渲染 variant="primary" 的 Button
- **THEN** 按钮使用主强调色背景

#### Scenario: 次变体按钮
- **WHEN** 渲染 variant="secondary" 的 Button
- **THEN** 按钮使用边框和深色背景

#### Scenario: 幽灵变体按钮
- **WHEN** 渲染 variant="ghost" 的 Button
- **THEN** 按钮无边框，悬停时显示背景

#### Scenario: 危险变体按钮
- **WHEN** 渲染 variant="danger" 的 Button
- **THEN** 按钮使用错误状态色

#### Scenario: 禁用态按钮
- **WHEN** Button 设置 disabled={true}
- **THEN** 按钮不可点击，样式灰暗

#### Scenario: 加载态按钮
- **WHEN** Button 设置 loading={true}
- **THEN** 按钮显示 Spinner 并禁用点击

### Requirement: 系统提供 Input 组件
系统 SHALL 提供文本输入框组件。

#### Scenario: 标准输入框
- **WHEN** 渲染 Input 组件
- **THEN** 显示带边框的文本输入框

#### Scenario: 输入框占位符
- **WHEN** Input 设置 placeholder 属性
- **THEN** 占位符文字使用次要文字色

#### Scenario: 输入框禁用态
- **WHEN** Input 设置 disabled={true}
- **THEN** 输入框不可编辑，样式灰暗

### Requirement: 系统提供 Card 组件
系统 SHALL 提供卡片容器组件。

#### Scenario: 卡片容器
- **WHEN** 渲染 Card 组件
- **THEN** 显示带圆角和边框的卡片容器

#### Scenario: 卡片悬停态
- **WHEN** Card 设置 hoverable={true}
- **THEN** 悬停时显示阴影或背景变化

### Requirement: 系统提供 Modal 组件
系统 SHALL 提供模态对话框组件。

#### Scenario: 模态框显示
- **WHEN** Modal 的 open 属性为 true
- **THEN** 显示模态框内容

#### Scenario: 模态框关闭
- **WHEN** 点击遮罩层或关闭按钮
- **THEN** 模态框关闭，触发 onClose 回调

### Requirement: 系统提供 Spinner 组件
系统 SHALL 提供加载指示器组件。

#### Scenario: 加载指示器
- **WHEN** 渲染 Spinner 组件
- **THEN** 显示旋转的加载动画

#### Scenario: 加载指示器尺寸
- **WHEN** Spinner 设置 size="sm"
- **THEN** 显示小尺寸加载动画

### Requirement: 系统提供 Badge 组件
系统 SHALL 提供徽章/标签组件。

#### Scenario: 状态徽章
- **WHEN** 渲染 Badge 组件 variant="success"
- **THEN** 显示绿色徽章

### Requirement: 系统提供 Tooltip 组件
系统 SHALL 提供悬浮提示组件。

#### Scenario: 悬浮提示
- **WHEN** 鼠标悬停在 Tooltip 触发元素上
- **THEN** 显示提示文本
