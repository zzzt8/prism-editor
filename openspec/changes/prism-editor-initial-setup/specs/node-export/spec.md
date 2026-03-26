# Node: Export - 导出节点规格

## ADDED Requirements

### Requirement: 导出节点提供最终输出
系统 SHALL 提供导出节点，作为工作流的输出终点。

#### Scenario: 创建导出节点
- **WHEN** 用户添加一个导出节点
- **THEN** 该节点显示图像输入端口

### Requirement: 支持 PNG 格式导出
系统 SHALL 支持导出为 PNG 格式。

#### Scenario: 导出为 PNG
- **WHEN** 用户配置导出格式为 PNG
- **THEN** 输出文件为 PNG 格式

#### Scenario: 保留透明通道
- **WHEN** 图像包含透明区域且导出为 PNG
- **THEN** 透明信息被完整保留

### Requirement: 支持 JPEG 格式导出
系统 SHALL 支持导出为 JPEG 格式。

#### Scenario: 导出为 JPEG
- **WHEN** 用户配置导出格式为 JPEG
- **THEN** 输出文件为 JPEG 格式

#### Scenario: JPEG 质量控制
- **WHEN** 用户配置 JPEG 质量参数
- **THEN** 导出文件按指定质量压缩

### Requirement: 支持多尺寸导出
系统 SHALL 支持同时导出多种尺寸的图片。

#### Scenario: 多尺寸导出
- **WHEN** 用户配置多个输出尺寸
- **THEN** 生成多个不同尺寸的输出文件

### Requirement: 导出节点提供预览
系统 SHALL 在节点上显示导出结果的预览图。

#### Scenario: 显示预览
- **WHEN** 导出节点接收到输入图像
- **THEN** 节点显示该图像的缩略图预览
