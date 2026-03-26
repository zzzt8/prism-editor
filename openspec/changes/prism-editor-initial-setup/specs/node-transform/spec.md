# Node: Transform - 变换节点规格

## ADDED Requirements

### Requirement: 变换节点支持位置移动
系统 SHALL 提供 X 和 Y 轴的位移参数。

#### Scenario: 水平位移
- **WHEN** 用户设置 X 偏移量
- **THEN** 图像沿 X 轴移动指定像素

#### Scenario: 垂直位移
- **WHEN** 用户设置 Y 偏移量
- **THEN** 图像沿 Y 轴移动指定像素

### Requirement: 变换节点支持缩放
系统 SHALL 提供 X 和 Y 方向的缩放参数。

#### Scenario: 等比缩放
- **WHEN** 用户设置统一缩放值
- **THEN** 图像按比例缩放

#### Scenario: 非等比缩放
- **WHEN** 用户分别设置 X 和 Y 缩放
- **THEN** 图像按不同比例在两个方向缩放

### Requirement: 变换节点支持旋转
系统 SHALL 提供旋转角度参数（以度为单位）。

#### Scenario: 旋转图像
- **WHEN** 用户设置旋转角度
- **THEN** 图像按顺时针旋转指定角度

### Requirement: 变换节点支持裁切
系统 SHALL 提供裁切区域参数。

#### Scenario: 裁切图像
- **WHEN** 用户设置裁切区域（左上角坐标和宽高）
- **THEN** 输出图像为裁切后的区域

### Requirement: 变换锚点可配置
系统 SHALL 允许设置变换的锚点位置。

#### Scenario: 设置锚点
- **WHEN** 用户选择锚点位置（九宫格选择）
- **THEN** 变换以指定锚点为中心执行
