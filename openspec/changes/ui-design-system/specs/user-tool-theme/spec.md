# User Tool Theme - 用户端视觉规范规格

## ADDED Requirements

### Requirement: 用户端使用简洁明了的视觉风格
系统 SHALL 采用简洁、清晰、低压迫感的设计。

#### Scenario: 整体色调
- **WHEN** 用户端渲染
- **THEN** 可使用浅色或浅深混合色调

#### Scenario: 卡片感
- **WHEN** 用户端渲染输入区和输出区
- **THEN** 使用明显的卡片样式，带圆角和边框

### Requirement: 输入卡片使用清晰设计
系统 SHALL 确保用户一眼就能理解需要上传什么。

#### Scenario: 输入卡片标题
- **WHEN** 输入卡片渲染
- **THEN** 标题使用图标+文字组合，清晰表达含义

#### Scenario: 必填标识醒目
- **WHEN** 输入项为必填
- **THEN** 使用醒目的"必填"标识（如红色星号或徽章）

### Requirement: 参数区保持克制
系统 SHALL 在参数区避免过多选项和复杂控件。

#### Scenario: 参数数量
- **WHEN** 参数区渲染
- **THEN** 参数数量控制在 3-5 个以内

#### Scenario: 参数控件简洁
- **WHEN** 参数控件渲染
- **THEN** 使用简洁的 Slider 或 Select，不使用复杂控件

### Requirement: 运行按钮突出
系统 SHALL 使运行按钮成为页面的视觉焦点。

#### Scenario: 按钮尺寸
- **WHEN** 运行按钮渲染
- **THEN** 尺寸较大（lg），易于点击

#### Scenario: 按钮颜色
- **WHEN** 运行按钮可用
- **THEN** 使用主强调色，视觉突出

#### Scenario: 按钮文字
- **WHEN** 运行按钮渲染
- **THEN** 文字简洁（如"运行"），使用播放图标

### Requirement: 输出区强调结果感
系统 SHALL 使输出结果成为视觉焦点。

#### Scenario: 预览图尺寸
- **WHEN** 输出预览渲染
- **THEN** 预览图占据主要空间，尺寸足够大

#### Scenario: 下载按钮明显
- **WHEN** 下载按钮渲染
- **THEN** 按钮明显且易于点击

#### Scenario: 多结果展示
- **WHEN** 存在多个输出结果
- **THEN** 以网格或列表形式清晰展示

### Requirement: 避免工程工具感
系统 SHALL 确保用户感觉在"使用功能"而非"操作工作流"。

#### Scenario: 无节点展示
- **WHEN** 用户端渲染
- **THEN** 不显示任何节点、连线等工程元素

#### Scenario: 无技术术语
- **WHEN** 用户端文案渲染
- **THEN** 使用用户友好的语言，避免技术术语

#### Scenario: 无复杂侧边栏
- **WHEN** 用户端渲染
- **THEN** 不显示复杂的导航或设置面板
