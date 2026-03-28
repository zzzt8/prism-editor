# 开发者端 UI 规范说明

> **应用**: `apps/dev-tool`  
> **版本**: 1.0.0  
> **最后更新**: 2026-03-28

本文档说明 Prism Editor 开发者端（dev-tool）的 UI 设计规范和实现细节。

## 设计理念

开发者端面向专业用户，强调 **高信息密度**、**工具感** 和 **克制的视觉风格**。

核心原则：
- 深色、低饱和、强层级、弱装饰
- 画布背景退后，节点和连线清晰可见
- 不暴露工程复杂性给用户，保持工具感

## 布局规范

### 三栏结构

```
┌─────────────────────────────────────────────────────────────┐
│  Logo   Workflow Name    [Save] [Run] [Publish]    Settings │ <- 顶部栏 48px
├──────────┬─────────────────────────────────┬───────────────┤
│          │                                 │               │
│  节点库   │                                 │  属性面板      │
│  240px   │           画布                   │  320px        │
│          │         (flex)                  │               │
│ ──────── │                                 │ ─────────────│
│ 搜索      │                                 │ 节点名称      │
│ ──────── │                                 │ ─────────────│
│ 输入节点   │                                 │ 参数配置      │
│ 处理节点   │                                 │ ─────────────│
│ 输出节点   │                                 │ 预览         │
│          │                                 │               │
└──────────┴─────────────────────────────────┴───────────────┘
```

### 布局尺寸

| 区域 | 宽度/高度 | 说明 |
|------|-----------|------|
| 顶部栏 | 48px 固定高度 | 包含 Logo、操作按钮、设置 |
| 左侧面板 | 240px 固定宽度 | 节点库、搜索框 |
| 右侧面板 | 320px 固定宽度 | 属性编辑、参数配置 |
| 画布 | flex: 1，填充剩余空间 | React Flow 可缩放画布 |

## 视觉规范

### 颜色系统

开发者端使用 Design Token 中的颜色变量，通过 `apps/dev-tool/src/styles/global.css` 中的别名使用：

| 别名 | Token | 值 | 用途 |
|------|-------|-----|------|
| `--color-bg` | `--bg-canvas` | #0D0D0F | 画布背景 |
| `--color-surface` | `--bg-surface` | #141416 | 面板背景 |
| `--color-surface-2` | `--bg-elevated` | #1A1A1D | 浮层/输入框背景 |
| `--color-surface-3` | `--bg-hover` | #222225 | 悬停背景 |
| `--color-border` | `--border-subtle` | #2A2A2D | 边框/分隔线 |
| `--color-text` | `--text-primary` | #FFFFFF | 主要文字 |
| `--color-text-muted` | `--text-secondary` | #A0A0A5 | 次要文字 |
| `--color-accent` | `--accent-primary` | #6366F1 | 强调色/主操作 |

### 字体规范

| 用途 | Token | 值 | 字重 |
|------|-------|-----|------|
| 页面标题 | `--text-xl` | 18px | 600 |
| 节点标题 | `--text-sm` | 13px | 600 |
| 正文/标签 | `--text-sm` | 13px | 400 |
| 小标签/徽章 | `--text-xs` | 11px | 500 |
| 数值/代码 | `--font-mono` | — | — |

### 边框与圆角

| 元素 | 圆角 | 边框 |
|------|------|------|
| 面板容器 | 0px | 1px solid `--color-border` |
| 输入框 | 6px | 1px solid `--color-border` |
| 按钮 | 6px | 1px solid `--color-border` |
| 节点卡片 | 8px | 1.5px solid `--color-border` |
| 模态框 | 10px | 1px solid `--color-border` |

### 阴影

| 元素 | 阴影 |
|------|------|
| 面板容器 | 无 |
| 节点卡片 | `0 2px 8px rgba(0,0,0,0.3)` |
| 弹窗/模态框 | `0 20px 60px rgba(0,0,0,0.5)` |
| 下拉菜单 | `0 8px 24px rgba(0,0,0,0.4)` |

### 禁止事项

- ❌ 大面积渐变背景
- ❌ 玻璃拟态（毛玻璃）效果
- ❌ 过强发光/阴影效果
- ❌ 多余的颜色分类（除状态色外）
- ❌ 过度装饰图标

### 允许事项

- ✅ 微妙的阴影（`box-shadow` 小透明度）
- ✅ 柔和的悬停态（`background` 变化）
- ✅ 状态色区分（成功/警告/错误）
- ✅ 选中态高亮（强调色边框/阴影）

## React Flow 集成

### 画布背景

使用 `--color-bg` 作为画布背景色，React Flow 的 `.react-flow__background` 覆盖为透明。

### 连线样式

| 状态 | 样式 |
|------|------|
| 默认 | `stroke: var(--color-border)`，`stroke-width: 2` |
| 悬停 | `stroke: var(--color-accent)` |
| 选中 | `stroke: var(--color-accent)` |

### 节点样式

| 状态 | 样式 |
|------|------|
| 默认 | `border: 1.5px solid var(--color-border)` |
| 悬停 | 无特殊变化（由端口显示代替） |
| 选中 | `box-shadow: 0 0 0 2px var(--node-color, var(--color-accent))` |
| 运行中 | 蓝色边框 + pulse 动画 |
| 错误 | 红色边框 + 红色阴影 |

### 端口样式

- 尺寸：10px × 10px 圆形
- 默认：`border: 2px solid var(--color-border)`
- 悬停/连线中：`background: var(--node-color, var(--color-accent))`

## 组件规范

### 节点面板 (NodePanel)

位于左侧面板，包含：
- 搜索框（带图标、清空按钮）
- 分类列表（输入/处理/输出）
- 可拖拽节点卡片

**搜索框**：高度 28px，圆角 6px，背景 `--color-surface-2`

**节点卡片**：高度自适应内边距，圆角 6px，背景 `--color-surface-2`，悬停时边框变强调色

### 画布 (WorkflowCanvas)

React Flow 容器，包含：
- 可缩放/平移的节点编辑区
- 底部工具栏（缩放级别、执行状态）
- 节点搜索模态框（`/` 快捷键触发）

### 属性面板 (ParamPanel)

位于右侧面板，包含：
- 空状态提示
- 节点基本信息（名称、类型标签）
- 参数表单（Input/Slider/Select/Toggle）
- 图片预览缩略图

### 顶部栏 (WorkflowHeader)

包含：
- Logo 和工作流名称
- 操作按钮（保存/运行/发布）
- 面板显示切换
- 执行状态指示

## 交互规范

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `/` | 打开节点搜索模态框 |
| `Space` + 拖拽 | 平移画布 |
| 鼠标滚轮 | 缩放画布 |
| `Delete` / `Backspace` | 删除选中节点/连线 |
| `Ctrl/Cmd + S` | 保存工作流 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` | 重做 |

### 拖拽规范

- 节点面板中的节点卡片可拖拽到画布创建新节点
- 拖拽时显示半透明预览
- 释放位置如果不在有效区域，不创建节点

## 文件结构

```
apps/dev-tool/src/
├── components/
│   ├── canvas/
│   │   ├── WorkflowCanvas.tsx      # React Flow 容器
│   │   └── NodeSearchModal.tsx      # 节点搜索模态框
│   ├── header/
│   │   └── WorkflowHeader.tsx       # 顶部操作栏
│   ├── nodes/
│   │   └── PrismNode.tsx           # 自定义节点组件
│   └── NodePanel.tsx                # 左侧节点库面板
├── layouts/
│   └── DevToolLayout.tsx           # 主布局组件
├── store/
│   └── canvasStore.ts               # Zustand 状态管理
├── styles/
│   └── global.css                  # 全局样式 + React Flow 覆盖
├── App.tsx
└── main.tsx
```

## 相关规范

- **Design Token**: `packages/shared-ui/docs/design-tokens.md`
- **共享组件**: `packages/shared-ui/docs/components.md`
- **详细设计规格**: `openspec/changes/ui-design-system/specs/dev-tool-theme/spec.md`
- **布局规格**: `openspec/changes/ui-design-system/specs/dev-tool-layout/spec.md`
