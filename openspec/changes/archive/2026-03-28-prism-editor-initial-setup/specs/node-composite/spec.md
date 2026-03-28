# Node: Composite - 图层合成节点规格

## ADDED Requirements

### Requirement: 合成节点支持图层叠加
系统 SHALL 提供合成节点，将两层图像按指定模式叠加。

#### Scenario: 创建合成节点
- **WHEN** 用户添加一个合成节点
- **THEN** 该节点显示底层图像输入、上层图像输入和合成结果输出

### Requirement: 支持 Normal 混合模式
系统 SHALL 支持基础的 Normal（标准）混合模式。

#### Scenario: Normal 叠加
- **WHEN** 用户配置混合模式为 Normal
- **THEN** 上层图像直接覆盖在底层图像上

### Requirement: 支持 Multiply 混合模式
系统 SHALL 支持 Multiply（正片叠底）混合模式。

#### Scenario: Multiply 叠加
- **WHEN** 用户配置混合模式为 Multiply
- **THEN** 合成结果为两层相乘后的效果

### Requirement: 支持 Screen 混合模式
系统 SHALL 支持 Screen（滤色）混合模式。

#### Scenario: Screen 叠加
- **WHEN** 用户配置混合模式为 Screen
- **THEN** 合成结果为反转后相乘再反转的效果

### Requirement: 支持透明度控制
系统 SHALL 允许调整上层图像的透明度。

#### Scenario: 调整上层透明度
- **WHEN** 用户设置上层透明度参数（0-100）
- **THEN** 上层图像按指定透明度与底层合成
