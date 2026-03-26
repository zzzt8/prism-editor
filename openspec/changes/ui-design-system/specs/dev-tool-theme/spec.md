# Dev Tool Theme - 开发者端视觉规范规格

## ADDED Requirements

### Requirement: 开发者端使用深色主题
系统 SHALL 采用深灰黑色调，避免纯黑。

#### Scenario: 画布背景色
- **WHEN** 开发者端渲染画布
- **THEN** 背景色使用 #0D0D0F（深灰黑）

#### Scenario: 面板背景色
- **WHEN** 开发者端渲染面板
- **THEN** 背景色使用 #141416（比画布亮一层）

### Requirement: 画布背景使用轻网格
系统 SHALL 在画布上显示淡化的网格图案。

#### Scenario: 网格线颜色
- **WHEN** 画布渲染网格
- **THEN** 网格线使用极淡的颜色（如 #1A1A1D）

#### Scenario: 网格线间距
- **WHEN** 画布渲染网格
- **THEN** 网格间距为 20px

### Requirement: 连线使用弱化样式
系统 SHALL 使用细线和低对比度的连线样式。

#### Scenario: 默认连线
- **WHEN** 渲染节点连线
- **THEN** 使用 2px 细线，颜色为 #3A3A3D

#### Scenario: 连线悬停
- **WHEN** 鼠标悬停在连线上
- **THEN** 连线颜色变亮以提供反馈

### Requirement: 节点卡片使用统一外观
系统 SHALL 确保所有节点卡片具有一致的视觉风格。

#### Scenario: 节点标题栏
- **WHEN** 节点卡片渲染
- **THEN** 标题栏包含节点类型图标和名称

#### Scenario: 节点端口
- **WHEN** 节点卡片渲染
- **THEN** 输入端口在左侧，输出端口在右侧

#### Scenario: 节点选中态
- **WHEN** 节点被选中
- **THEN** 节点边框显示强调色高亮

### Requirement: 强调色使用单一主色
系统 SHALL 仅使用一个主强调色（靛蓝）。

#### Scenario: 强调色应用
- **WHEN** 按钮或其他元素使用主变体
- **THEN** 颜色统一为 #6366F1

### Requirement: 状态色使用分离但不艳丽的颜色
系统 SHALL 使用绿色/橙色/红色区分成功/警告/错误状态。

#### Scenario: 成功状态
- **WHEN** 显示成功状态
- **THEN** 使用 #22C55E（绿色）

#### Scenario: 警告状态
- **WHEN** 显示警告状态
- **THEN** 使用 #F59E0B（橙色）

#### Scenario: 错误状态
- **WHEN** 显示错误状态
- **THEN** 使用 #EF4444（红色）

### Requirement: 禁止过度装饰
系统 SHALL 禁止使用大面积渐变、玻璃拟态、过强发光等效果。

#### Scenario: 无渐变背景
- **WHEN** 开发者端渲染面板
- **THEN** 不使用渐变背景

#### Scenario: 无毛玻璃效果
- **WHEN** 开发者端渲染下拉菜单
- **THEN** 不使用毛玻璃效果
