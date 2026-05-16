---
change_class: low
reason: 纯视觉迁移，不触及业务逻辑，仅涉及 CSS token 和 UI 组件样式调整。
---

## Why

dev-tool 的 UI 设计已完成并投入使用，具备完整的 design token 体系（颜色、字体、间距、圆角）、统一的顶栏组件和首页布局。user-app 当前的视觉风格与 dev-tool 差异较大（主色、字体、间距、图标均不一致），需要对齐以保持产品一致性。

## What Changes

1. **设计 Token 统一**：user-app 的 `global.css` 采用与 dev-tool 一致的 CSS 变量体系（颜色、间距、圆角、字体）。
2. **字体加载**：user-app 的 `index.html` 引入与 dev-tool 相同的 Google Fonts（Space Grotesk + Inter）。
3. **Favicon 补充**：将 dev-tool 的 `public/favicon.svg`（紫色渐变六边形 logo）复制到 user-app，并在 `index.html` 中引用。
4. **首页 UI 对齐**：WorkflowListPage 的 logo 区、顶栏布局、空状态均参考 dev-tool 的 `WorkflowsView` 样式。
5. **Run 页面顶栏对齐**：WorkflowHeader 组件的 logo、back button 样式与 dev-tool 的 `wf-header` 风格统一。
6. **间距系统对齐**：顶栏高度统一为 56px，padding / gap 基准值与 dev-tool 对齐。

## Capabilities

- user-app 与 dev-tool 视觉风格统一，用户在两个 app 间切换时体验一致
- 字体、图标、间距系统的标准化，便于后续迭代

## Impact

- **layer: presentation** — 仅影响 `apps/user-app/src/` 下的样式和 UI 组件文件
- 无 API 变更，无数据迁移
- 不影响 workflow 执行逻辑

## Out of Scope

- 修改 user-app 的功能逻辑（如路由、store、组件交互行为）
- e2e 测试验证
- auth 页面（user-app 当前无 auth 页面）
- dev-tool 侧的改动
