## Goals

- user-app 的视觉风格与 dev-tool 统一，颜色、字体、间距、图标均对齐
- 零功能变更，纯视觉迁移

## Non-Goals

- 修改 user-app 的业务逻辑、路由、store
- e2e 测试
- dev-tool 改动

## Decisions

### 1. 字体体系

dev-tool 在 `index.html` 中通过 Google Fonts 引入 `Space Grotesk`（UI 标题/Logo）和 `Inter`（正文）。user-app 当前使用系统默认字体。需要将相同字体引入方案复制到 user-app 的 `index.html`。

### 2. 设计 Token 结构

dev-tool 的 `global.css` 定义了完整的设计 token（CSS 变量）。方案是**直接迁移这些 token 到 user-app 的 `global.css`**，覆盖 user-app 原有 token。由于两个 app 的 CSS 类名体系不同（dev-tool 用 `home-*` / `wf-*` 前缀，user-app 用 `ua-*` 前缀），不会产生冲突。

### 3. Logo 和 Icon

dev-tool 使用 lucide-react 的 `Box` icon 作为 Logo（32px 紫色圆角背景）。user-app 已在多处使用 SVG 内联 hexagon icon。方案：**将 dev-tool 的 logo SVG（紫色渐变六边形）迁移为 user-app 的 favicon，同时在 UI 中统一使用 dev-tool 的 Logo 风格**。

### 4. 顶栏布局

dev-tool 的 `wf-header` 高度 56px，padding `0 24px`，垂直居中。user-app 的 `ua-run-header` 高度 57px，padding `16px 24px`。方案：统一为 56px 高度，`0 24px` padding，元素垂直居中。

### 5. 首页卡片

dev-tool 用横向列表（`home-workflow-row`），user-app 用横向卡片（`ua-workflow-card`）。方案：**保留 user-app 的卡片结构**，替换其中 SVG icon 为 dev-tool 的 `Layers` icon，统一按钮圆角、间距等细节。

## Alternatives Considered

- **方案 A（共享 design system）**：将 dev-tool 的 global.css 抽取为独立 CSS 文件作为共享 design token。这需要额外的构建配置和包管理，适合长期维护。此 change 聚焦快速对齐，暂不引入共享层。
- **方案 B（重建 dev-tool 样式）**：在 user-app 中完全重写样式以匹配 dev-tool。成本高，且可能引入不一致。

## Summary

本 change 采用**直接迁移 dev-tool design token + 逐文件样式调整**的轻量方案，在最小改动范围内实现两个 app 的视觉统一。设计 token 直接复制，不引入新的共享机制，便于回滚。
