# Node: Load Image - 图片加载节点规格

## ADDED Requirements

### Requirement: 加载图片节点提供图像输入
系统 SHALL 提供图片加载节点，作为工作流的图像数据源入口。

#### Scenario: 创建加载图片节点
- **WHEN** 用户添加一个加载图片节点到画布
- **THEN** 该节点显示一个图像输出端口

### Requirement: 支持多种图片格式
系统 SHALL 支持加载常见的图片格式，包括 PNG、JPEG、WebP。

#### Scenario: 加载 PNG 图片
- **WHEN** 用户配置图片路径或上传 PNG 文件
- **THEN** 节点输出包含透明通道的图像数据

#### Scenario: 加载 JPEG 图片
- **WHEN** 用户配置图片路径或上传 JPEG 文件
- **THEN** 节点输出 RGB 图像数据

### Requirement: 输出图像元信息
系统 SHALL 在输出端口传递图像数据的同时，提供图像的尺寸信息。

#### Scenario: 输出图像尺寸
- **WHEN** 加载图片节点执行完成
- **THEN** 输出包含图像宽度、高度和通道信息

### Requirement: 节点提供预览功能
系统 SHALL 在节点上显示当前加载图片的缩略图预览。

#### Scenario: 显示缩略图
- **WHEN** 图片加载成功后
- **THEN** 节点显示图片的缩略图预览
