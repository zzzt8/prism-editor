## Context

dev-tool 和 user-app 目前各自维护独立的 CSS 变量系统：
- dev-tool: `--dcn-*` 前缀（Zinc 调色板、紫色强调色、端口类型色）
- user-app: `--ua-*` 前缀（极深黑背景、indigo 强调色）

dev-tool 的 Dense Control Node CSS (`dense-control-node.css`) 经过多轮迭代，包含完整的控件交互样式，但 user-app 的 `global.css` 仅使用基础边框色 + 原生浏览器控件样式。

两个 app 最终面向的是同一类用户（图像处理），视觉语言不一致会影响品牌认知和开发效率。

## Goals / Non-Goals

**Goals:**
- 将 dev-tool 的精选控件样式（Slider、Select、Input）迁移到 user-app
- 建立 user-app 专用的输入类型色系统，与 dev-tool 端口类型色语义对齐
- 迁移后 user-app 保持 indigo 主色调和深黑背景不变
- 所有变更仅在 `global.css` 内完成，不修改任何 TSX 组件

**Non-Goals:**
- 不引入 React Flow 或 Canvas 到 user-app
- 不统一主色调（dev-tool 紫色 vs user-app indigo 各有定位）
- 不重构 user-app 的整体布局（两栏结构不变）
- 不改变 user-app 的字体（保持 system-ui）

## Decisions

### D1: 只迁移控件样式变量，不引入 `--dcn-*` 命名空间

**决策**：在 `global.css` 的 `:root` 中新增 `--ua-slider-*`、`--ua-input-*`、`--ua-select-*` 变量，样式类名继续使用 `.ua-*` 前缀。

**理由**：user-app 是用户端产品，DCN 的 "node" 语义不适合用户场景。引入独立变量名既保留 dev-tool 的设计资产，又维持 user-app 的命名清晰度。

### D2: 控件样式仅覆盖聚焦/悬停态，不引入动画过渡

**决策**：Slider thumb hover 的 scale + glow、Input focus 的 box-shadow glow，均使用 `transition: 0.1~0.15s ease`。

**理由**：dev-tool 有节点 pulse 等复杂动画，用户端控件数量少（滑块 1-2 个），过渡过于花哨会增加认知负担。

### D3: 类型色从 dev-tool 端口色直接复用数值

**决策**：`--ua-type-image: #8b5cf6`、`--ua-type-mask: #22c55e`、`--ua-type-text: #94a3b8`，与 `--port-image/mask/string` 数值完全一致。

**理由**：用户端的 IMAGE/MASK/TEXT badge 与 dev-tool 的端口类型含义相同，复用数值确保跨 app 的一致体验。

### D4: 状态色独立维护，不直接映射

**决策**：`--ua-status-idle: #71717a`、`--ua-status-running: #818cf8`、`--ua-status-done: #22c55e`、`--ua-status-error: #ef4444`。

**理由**：dev-tool 的 node-status 用于节点执行，用户端的 status 是整个工作流执行层面。颜色可以复用（语义相近），但变量名独立更清晰。

### D5: 不迁移 `--dcn-*` 的 border-radius 体系

**决策**：保持 user-app 现有的 `12px` 卡片圆角、`7px` 输入框圆角、`10px` badge 圆角，不改为 DCN 的 `8px/6px/4px` 体系。

**理由**：user-app 定位简洁明了，大圆角符合"低学习成本"的 UX 目标。

## Risks / Trade-offs

[兼容性] 部分 CSS 控件样式使用 `-webkit-` 前缀，Firefox 支持可能不完全 → **缓解**：提供 `-moz-` 兼容写法，Firefox 对 `accent-color` 有原生支持时回退

[命名冲突] 新增 `--ua-slider-*` 变量若未来与其他改动冲突 → **缓解**：变量名遵循 `--ua-<component>-<property>` 模式，组件级隔离

[过度设计] 精致的控件样式可能让 user-app 显得过于"开发者工具化" → **缓解**：严格控制样式数量（Slider + Select + Input 三类），不引入任何节点/端口相关的视觉元素

## Open Questions

1. dev-tool 的 `dcn-select` 使用深色背景胶囊样式，user-app 的 Select 控件是否需要？——建议保持现有简洁风格，仅加 SVG 下拉箭头，不加背景色变化
2. Slider 的 `accent-color` 兼容写法是否需要条件注释？——建议使用 `@supports` 检测，不支持时回退原生样式
