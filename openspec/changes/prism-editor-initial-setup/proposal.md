# Prism Editor - 项目提案

## Why

当前的图像处理工具要么过于通用（如 Photoshop），要么过于专业化（如 ComfyUI），缺乏一个专注于**前端可执行、轻量级、确定性**的图像处理工作流系统。开发者需要反复编写相似的图像处理代码，而终端用户又无法独立使用这些流程。

Prism Editor 填补了这一空白：让开发者通过节点画布搭建图像处理链路，将工作流发布给终端用户直接运行，实现"开发"与"使用"的分离。

## What Changes

这是一个全新的项目，从零构建一个**可视化低代码图像处理工作流系统**：

### 核心能力
- **节点式画布编辑器**：拖拽节点、连接链路、配置参数
- **工作流执行引擎**：前端驱动的确定性图像处理
- **双端分离架构**：开发者工具端 + 用户运行端
- **发布机制**：将开发态工作流转为用户可运行的发布态
- **节点能力库**：可复用的图像处理节点集合

### 系统组成
- `dev-tool`：面向开发者的节点编辑器
- `user-app`：面向终端用户的极简运行界面
- `workflow-core`：共享的工作流核心引擎
- `node-definitions`：节点元信息定义
- `image-ops`：图像处理实现
- `shared-types`：共享类型系统

### MVP 阶段
- 完成基础节点画布（拖拽、连线、参数配置）
- 实现最小执行能力（5 个核心节点）
- 完成 1 条完整工作链路
- 发布与用户运行闭环

## Capabilities

### New Capabilities

- `workflow-canvas`: 节点画布编辑器，支持拖拽、连线、缩放平移、选中删除
- `workflow-engine`: 工作流执行引擎，负责节点调度和图像处理
- `node-load-image`: 图片加载节点
- `node-apply-mask`: Mask 应用节点
- `node-composite`: 图层合成节点（叠加、multiply、screen 等混合模式）
- `node-transform`: 变换节点（位移、缩放、旋转、裁切）
- `node-export`: 导出节点（PNG、JPEG、多尺寸）
- `workflow-publish`: 工作流发布机制，开发态转发布态
- `user-runner`: 用户运行界面，极简输入-执行-输出流程

## Impact

- **新增 Monorepo 架构**：前端项目结构重组
- **新增共享核心包**：`workflow-core`、`node-definitions`、`image-ops`、`shared-types`
- **新增双应用**：`dev-tool`（开发者工具）和 `user-app`（用户端）
- **技术栈**：React + TypeScript + 现代节点编辑器底座
- **无现有代码影响**：全新项目，无向后兼容问题
