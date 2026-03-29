# UI Design System - 实现任务列表

> **开发约束**
>
> 1. **每次 apply 最多选择 2-4 个小分支实现**，不要贪多
> 2. **按顺序逐项实现**，确保每项完成后进行测试
> 3. **测试不通过必须找出问题**，不要跳过或忽略错误
> 4. **通过后标记 `[x]`，失败后记录问题并修复**
>
> **测试策略**：
> - 单个组件完成后在 Storybook 中验证
> - 样式变更后在浏览器中验证
> - 布局完成后验证响应式

## 实施顺序建议

| 优先级 | 章节 | 说明 |
|--------|------|------|
| 1 | 1. Design Token 系统 | 样式基础变量 |
| 2 | 5. 共享样式工具 | 样式导入导出 |
| 3 | 2. 共享组件库 - 基础 | 基础 UI 组件 |
| 4 | 3. 共享组件库 - 布局 | 布局组件 |
| 5 | 4. 图标系统集成 | 图标规范 |
| 6 | 6. 开发者端布局框架 | 开发者端骨架 |
| 7 | 7. 开发者端主题样式 | 开发者端视觉 |
| 8 | 8-9. 开发者端面板 | 左右面板 |
| 9 | 10. 用户端布局框架 | 用户端骨架 |
| 10 | 11-12. 用户端样式/组件 | 用户端视觉 |
| 11 | 13. 视觉调优 | 两端一致性 |
| 12 | 14. 文档与规范 | 规范文档 |

## 1. Design Token 系统

- [x] 1.1 创建 `packages/shared-ui/src/tokens/colors.css` 颜色变量
- [x] 1.2 创建 `packages/shared-ui/src/tokens/spacing.css` 间距变量
- [x] 1.3 创建 `packages/shared-ui/src/tokens/typography.css` 字体变量
- [x] 1.4 创建 `packages/shared-ui/src/tokens/index.css` 导出所有变量
- [x] 1.5 创建 `packages/shared-ui/src/types/tokens.ts` TypeScript 类型
- [x] 1.6 验证 CSS 变量与 TypeScript 类型一致性

## 2. 共享组件库 - 基础组件

- [x] 2.1 创建 `packages/shared-ui/src/components/Button/` Button 组件
- [x] 2.2 创建 `packages/shared-ui/src/components/Input/` Input 组件
- [x] 2.3 创建 `packages/shared-ui/src/components/Card/` Card 组件
- [x] 2.4 创建 `packages/shared-ui/src/components/Modal/` Modal 组件
- [x] 2.5 创建 `packages/shared-ui/src/components/Spinner/` Spinner 组件
- [x] 2.6 创建 `packages/shared-ui/src/components/Badge/` Badge 组件
- [x] 2.7 创建 `packages/shared-ui/src/components/Tooltip/` Tooltip 组件
- [x] 2.8 创建 `packages/shared-ui/src/components/index.ts` 导出入口

## 3. 共享组件库 - 布局组件

- [x] 3.1 创建 `packages/shared-ui/src/components/Stack/` HStack/VStack 组件
- [x] 3.2 创建 `packages/shared-ui/src/components/Divider/` Divider 组件
- [x] 3.3 创建 `packages/shared-ui/src/components/Panel/` Panel 组件

## 4. 图标系统集成

- [x] 4.1 安装 lucide-react 依赖
- [x] 4.2 创建 `packages/shared-ui/src/icons/index.ts` 图标导出
- [x] 4.3 定义图标使用规范（尺寸、颜色）
- [x] 4.4 验证常用图标可用（Image, Upload, Download, Play, Settings 等）

## 5. 共享样式工具

- [x] 5.1 创建 `packages/shared-ui/src/styles/tokens.css` CSS 变量导入
- [x] 5.2 创建 `packages/shared-ui/src/styles/components.css` 组件基础样式
- [x] 5.3 创建 `packages/shared-ui/src/index.ts` 主入口导出

## 6. 开发者端布局框架

- [x] 6.1 在 `apps/dev-tool` 中集成 Design Token
- [x] 6.2 创建 `apps/dev-tool/src/layouts/DevToolLayout.tsx` 主布局组件
- [x] 6.3 创建 `apps/dev-tool/src/components/TopBar/` 顶部操作栏 *(注：WorkflowHeader 已存在，直接复用)*
- [x] 6.4 创建 `apps/dev-tool/src/components/LeftPanel/` 左侧面板 *(注：NodePanel 已存在，直接复用)*
- [x] 6.5 创建 `apps/dev-tool/src/components/RightPanel/` 右侧面板 *(注：ParamPanel 已存在，直接复用)*
- [x] 6.6 创建 `apps/dev-tool/src/components/Canvas/` 画布容器 *(注：WorkflowCanvas 已存在，直接复用)*
- [x] 6.7 配置面板默认宽度（左侧 240px，右侧 320px）
- [x] 6.8 配置顶部栏高度（48px）

## 7. 开发者端主题样式

- [x] 7.1 配置画布背景色（#0D0D0F）
- [x] 7.2 配置面板背景色（#141416）
- [x] 7.3 实现轻量化画布网格
- [x] 7.4 配置节点卡片统一样式
- [x] 7.5 配置连线样式（细线、低对比度）
- [x] 7.6 配置选中态高亮样式
- [x] 7.7 配置状态色（成功/警告/错误）

## 8. 开发者端节点面板

- [x] 8.1 实现节点分类列表（输入/处理/输出）
- [x] 8.2 实现节点搜索过滤功能
- [x] 8.3 实现节点拖拽到画布功能
- [x] 8.4 配置节点面板滚动条样式

## 9. 开发者端属性面板

- [x] 9.1 实现空状态显示
- [x] 9.2 实现节点属性表单渲染
- [x] 9.3 实现参数控件映射（Slider/Select/Input）
- [x] 9.4 实现参数实时预览更新
- [x] 9.5 配置属性面板滚动条样式

## 10. 用户端布局框架

- [x] 10.1 创建 `apps/user-app/src/layouts/UserLayout.tsx` 主布局组件
- [x] 10.2 创建 `apps/user-app/src/components/WorkflowHeader/` 工作流标题区
- [x] 10.3 创建 `apps/user-app/src/components/InputSection/` 输入区
- [x] 10.4 创建 `apps/user-app/src/components/ParamsSection/` 参数区
- [x] 10.5 创建 `apps/user-app/src/components/RunSection/` 运行区
- [x] 10.6 创建 `apps/user-app/src/components/OutputSection/` 输出区

## 11. 用户端主题样式

- [x] 11.1 配置用户端整体色调（浅深混合）
- [x] 11.2 配置卡片样式（圆角 12px，边框）
- [x] 11.3 配置输入卡片样式
- [x] 11.4 配置参数控件样式（简洁 Slider）
- [x] 11.5 配置运行按钮样式（大尺寸、主强调色）
- [x] 11.6 配置输出预览样式（大图预览）
- [x] 11.7 配置下载按钮样式

## 12. 用户端交互组件

- [x] 12.1 实现图片上传组件（拖拽+点击）
- [x] 12.2 实现图片预览缩略图
- [x] 12.3 实现必填标识显示
- [x] 12.4 实现参数 Slider 控件
- [x] 12.5 实现运行按钮交互（加载态）
- [x] 12.6 实现输出大图预览
- [x] 12.7 实现单图下载功能
- [x] 12.8 实现多尺寸下载功能

## 13. 视觉调优

- [x] 13.1 验证两端图标风格一致性
- [x] 13.2 验证两端字体一致性
- [x] 13.3 验证两端强调色一致性
- [x] 13.4 验证 React Flow 样式融入
- [x] 13.5 验证整体视觉协调性

## 14. 文档与规范

- [x] 14.1 编写 Design Token 使用指南
- [x] 14.2 编写共享组件使用文档
- [x] 14.3 编写开发者端 UI 规范说明
- [x] 14.4 编写用户端 UI 规范说明
