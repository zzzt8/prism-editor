# Dev Tool Layout - 开发者端布局规格

## ADDED Requirements

### Requirement: 开发者端采用三栏布局
系统 SHALL 采用左侧节点库、中间画布、右侧属性面板的三栏布局。

#### Scenario: 三栏结构
- **WHEN** 用户打开开发者端
- **THEN** 页面显示左侧面板、画布区域、右侧面板

#### Scenario: 左侧面板宽度
- **WHEN** 左侧面板展开
- **THEN** 宽度固定为 240px

#### Scenario: 右侧面板宽度
- **WHEN** 右侧面板展开
- **THEN** 宽度固定为 320px

### Requirement: 开发者端具有顶部操作栏
系统 SHALL 在页面顶部提供操作栏。

#### Scenario: 顶部栏内容
- **WHEN** 顶部栏渲染
- **THEN** 包含 Logo、工作流名称、保存/运行/发布按钮、设置图标

#### Scenario: 顶部栏高度
- **WHEN** 顶部栏渲染
- **THEN** 高度固定为 48px

### Requirement: 左侧面板显示节点库
系统 SHALL 在左侧面板显示可拖拽的节点列表。

#### Scenario: 节点分类
- **WHEN** 节点库加载
- **THEN** 节点按分类分组显示（输入、处理、输出）

#### Scenario: 节点搜索
- **WHEN** 用户输入搜索关键词
- **THEN** 列表过滤显示匹配的节点

#### Scenario: 拖拽节点
- **WHEN** 用户拖拽节点到画布
- **THEN** 在画布释放位置创建新节点

### Requirement: 中间区域为可缩放画布
系统 SHALL 在中间区域提供可平移和缩放的画布。

#### Scenario: 画布平移
- **WHEN** 用户按住空格+左键拖拽
- **THEN** 画布视图平移

#### Scenario: 画布缩放
- **WHEN** 用户滚动鼠标滚轮
- **THEN** 画布以鼠标位置为中心缩放

### Requirement: 右侧面板显示属性
系统 SHALL 在右侧面板显示选中节点的属性配置。

#### Scenario: 无选中时
- **WHEN** 没有选中任何节点
- **THEN** 右侧面板显示空状态或全局属性

#### Scenario: 节点选中时
- **WHEN** 用户选中画布上的节点
- **THEN** 右侧面板显示该节点的属性配置

#### Scenario: 参数修改
- **WHEN** 用户修改属性值
- **THEN** 节点配置立即更新
