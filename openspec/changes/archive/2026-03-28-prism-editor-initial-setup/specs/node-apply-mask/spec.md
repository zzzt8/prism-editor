# Node: Apply Mask - Mask 应用节点规格

## ADDED Requirements

### Requirement: Mask 应用节点接收图像和 Mask
系统 SHALL 提供 Mask 应用节点，具有图像输入和 Mask 输入两个端口。

#### Scenario: 创建 Mask 应用节点
- **WHEN** 用户添加一个 Mask 应用节点
- **THEN** 该节点显示图像输入、Mask 输入和图像输出三个端口

### Requirement: 使用 Mask 裁切图像
系统 SHALL 根据 Mask 的 alpha 通道或亮度值裁切图像。

#### Scenario: Alpha Mask 应用
- **WHEN** 输入 Mask 为透明度的 alpha mask
- **THEN** 图像中被 mask 遮挡的部分变为透明

#### Scenario: 亮度 Mask 应用
- **WHEN** 输入 Mask 为灰度图
- **THEN** 白色区域显示，黑色区域隐藏

### Requirement: 支持 Mask 反转
系统 SHALL 提供参数选项以支持 Mask 反转。

#### Scenario: 反转 Mask
- **WHEN** 用户启用 "反转 Mask" 参数
- **THEN** Mask 的可见区域被反转

### Requirement: Mask 缩放适配
系统 SHALL 支持 Mask 与图像尺寸不同时的自动缩放。

#### Scenario: 自动缩放 Mask
- **WHEN** Mask 尺寸与图像尺寸不一致
- **THEN** Mask 自动缩放以匹配图像尺寸（可配置插值方式）
