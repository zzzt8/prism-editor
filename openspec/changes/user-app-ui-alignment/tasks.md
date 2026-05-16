## Layer: config

- [x] T1: 在 `apps/user-app/index.html` 中引入 Google Fonts（Space Grotesk + Inter）
- [x] T2: 在 `apps/user-app/index.html` 中添加 `<link rel="icon">` 引用 favicon
- [x] T3: 将 `apps/dev-tool/public/favicon.svg` 复制到 `apps/user-app/public/favicon.svg`

## Layer: presentation

- [x] T4: 重写 `apps/user-app/src/styles/global.css` 的设计 token（颜色、间距、圆角、字体变量），对齐 dev-tool
- [x] T5: 调整 `apps/user-app/src/layouts/UserLayout.tsx` 的顶栏高度为 56px、padding 改为 `0 24px`，垂直居中
- [x] T6: 重写 `apps/user-app/src/components/WorkflowHeader/index.tsx`，替换 logo 为 dev-tool 风格的紫色六边形 icon，back button 样式对齐
- [x] T7: 调整 `apps/user-app/src/pages/WorkflowListPage.tsx` 的页面布局：logo 区使用 dev-tool 风格，导入按钮样式对齐，空状态文字统一
- [x] T8: 调整 `apps/user-app/src/pages/WorkflowRunPage.tsx` 的顶栏传入 Logo 样式
