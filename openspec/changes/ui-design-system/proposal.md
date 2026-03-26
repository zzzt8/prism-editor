# UI Design System - UI 设计系统提案

## Why

Prism Editor 需要同时支持开发者端（dev-tool）和用户端（user-app）两套界面。这两套 UI 需要：

1. **一致的底层语言**：共享设计 token、组件库、图标系统
2. **不同的视觉气质**：开发者端偏工程工具感，用户端偏简洁友好
3. **统一的品牌认知**：让用户感知这是同一款产品

缺乏系统性的 UI 规划会导致两套界面风格割裂，增加开发成本和维护难度。

## What Changes

### 设计系统建立

- **Design Token 系统**：定义颜色、间距、字体、阴影等设计变量
- **共享组件库**：`packages/shared-ui` 提供双端共用的基础组件
- **开发者端 UI 规范**：深色、低饱和、强层级的工程工具风格
- **用户端 UI 规范**：简洁、轻量、结果导向的工具表单风格

### 布局结构

- **开发者端**：经典三栏布局（节点库 | 画布 | 属性面板）+ 顶部操作栏
- **用户端**：线性布局（标题 → 输入 → 参数 → 运行 → 输出）

### 视觉规范

- 画布：背景退后，节点突出，连线弱化
- 节点卡片：统一外观，标题、端口、状态、参数摘要
- 属性面板：高度统一，避免不同节点差异过大
- 配色：单一强调色，状态色分离但不艳丽

### 共享策略

- 字体体系、颜色 token、按钮、输入框、弹窗等基础组件统一
- 图标风格统一
- 品牌强调色统一

## Capabilities

### New Capabilities

- `design-tokens`: 设计变量系统，定义颜色、间距、字体、阴影等 Design Token
- `shared-components`: 共享组件库，双端共用的 Button、Input、Card、Modal 等基础组件
- `dev-tool-layout`: 开发者端布局规范，三栏结构 + 顶部操作栏
- `dev-tool-theme`: 开发者端视觉规范，深色工程工具风格
- `user-tool-layout`: 用户端布局规范，Input → Run → Output 线性流程
- `user-tool-theme`: 用户端视觉规范，简洁友好轻量风格

### Modified Capabilities

- `dev-tool`: 开发者端 UI 需要遵循 dev-tool-layout 和 dev-tool-theme 规范
- `user-app`: 用户端 UI 需要遵循 user-tool-layout 和 user-tool-theme 规范

## Impact

- **packages/shared-ui**：新增共享 UI 组件库
- **packages/shared-types**：Design Token 类型定义
- **apps/dev-tool**：开发者端应用遵循统一的 UI 规范
- **apps/user-app**：用户端应用遵循统一的 UI 规范
- **向后兼容**：UI 规范为建议性，非强制
