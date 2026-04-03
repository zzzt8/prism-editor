## Why

dev-tool 已完成 ComfyUI 风格的 Dense Control Node（DCN）设计系统重构，包含精致的控件样式（自定义 Slider thumb + glow、Select 胶囊下拉、Input 聚焦光晕、端口类型色、节点状态色等）。user-app 目前使用独立的 `--ua-*` 变量体系，控件样式与 dev-tool 相比缺乏质感。两者在视觉上缺乏统一的语言，无法共享 CSS 设计资产。

统一设计系统可以让 dev-tool 积累的 CSS 资产直接服务于 user-app，同时为未来 node-marketplace、backend-storage-migration 等变更中的用户面向功能奠定一致的视觉基础。

## What Changes

- **CSS 设计变量统一**：将 dev-tool DCN 的设计资产（控件样式、颜色变量）选择性引入 user-app，不改变 user-app 的整体色调（indigo）和布局风格
- **控件样式升级**：Slider thumb 自定义、Select 下拉箭头、Input 聚焦 glow，提升 user-app 控件精致度
- **类型色系统**：建立 user-app 专用的输入类型 badge 颜色，与 dev-tool 端口类型色保持语义一致
- **文档同步**：`apps/user-app/docs/ui-guidelines.md` 更新以反映新的设计决策

## Capabilities

### New Capabilities

- `user-ui-widget-styles`: 控件样式迁移——Slider、Select、Number Input、Text Input 的精致化样式，覆盖聚焦、悬停状态
- `user-ui-type-colors`: 输入类型色系统——IMAGE、MASK、TEXT 三种输入类型的 badge 颜色，与 dev-tool 端口类型色语义对齐
- `user-ui-state-colors`: 状态色变量——将 dev-tool 的节点状态色映射为 user-app 的执行状态色（ready/running/done/error）

### Modified Capabilities

- `user-tool-theme`: 现有 `ui-guidelines.md` 中的颜色系统部分需更新，以反映从纯自定义变量切换为部分复用 DCN 变量后的决策记录

## Impact

- **CSS**: `apps/user-app/src/styles/global.css` 新增 ~50 行控件样式，覆盖 Slider/Select/Input
- **文档**: `apps/user-app/docs/ui-guidelines.md` 更新颜色系统表格和控件规范
- **依赖**: 无新增 npm 依赖，纯 CSS 迁移
- **风险**: 低——仅修改 `global.css`，不改变组件 TSX；indigo 主色调和深黑背景保持不变
