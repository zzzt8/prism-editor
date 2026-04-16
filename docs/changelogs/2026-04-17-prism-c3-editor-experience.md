# Changelog — prism-c3-editor-experience

归档时间：2026-04-17
状态：archived

## 变更摘要

本次归档涉及以下代码变更：

| 文件 | 说明 |
|------|------|
| `apps/dev-tool/src/components/Inspector/PreviewPanel.tsx` | 新增：内嵌实时预览 Tab，自动刷新 + 手动刷新 + 全屏 |
| `apps/dev-tool/src/components/Inspector/DebugTab.tsx` | 新增：调试信息 Tab（耗时、输入/输出快照、错误） |
| `apps/dev-tool/src/components/Inspector/InspectorTabs.tsx` | 扩展为 5 Tab（参数/预览/调试/设置/信息） |
| `apps/dev-tool/src/components/Inspector/index.tsx` | 集成 PreviewPanel + DebugTab 渲染 |
| `apps/dev-tool/src/components/nodes/PrismNode.tsx` | execStatus 增加 pending 状态检测 |
| `apps/dev-tool/src/components/nodes/PrismNodeHeader.tsx` | STATUS_DOT_CLASS 增加 pending |
| `apps/dev-tool/src/styles/nodes/dense-control-node.css` | pending 半透明遮罩、done 绿边框、running 脉冲动画 |
| `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts` | InspectorTab 类型扩展 |
| `openspec/changes/prism-c3-editor-experience/proposal.md` | 补充 change_class 字段 |

## 关键决策

1. **PreviewPanel 位置——Inspector 内置 Tab（而非 Canvas 侧边栏）**
   - 理由：用户已习惯 Inspector 作为节点配置主面板，Tab 切换符合现有交互模型
   - 代码落点：`InspectorTabs.tsx` + `PreviewPanel.tsx`

2. **预览刷新策略——自动刷新 + 手动刷新按钮（降级）**
   - 理由：实时反馈是关键体验目标；手动刷新作为精确控制手段保留
   - 代码落点：`PreviewPanel.tsx` 的 `useEffect` 订阅 `executionResult` 变更

3. **pending 状态——全局执行中但本节点尚未开始**
   - 理由：拓扑排序执行时，非当前节点应显示等待状态，与 running（当前节点）区分
   - 代码落点：`PrismNode.tsx` + `dense-control-node.css`

## README 同步建议

**当前 README 内容：**
> （需读取项目根目录 README.md 完整内容进行对比）

**Proposal Goal：**
> 将预览从 Modal 弹窗升级为内嵌实时面板；节点执行状态（pending/running/done/error）有明确视觉区分；执行耗时统计显示在 Inspector DebugTab 中；输入/输出快照在 DebugTab 中可查看

**同步检查：**
- [ ] 如果 README 中有"编辑器功能列表"章节，应补充 `inline-preview` / `execution-timing` / `node-status-ui` 三个新 capability
- [ ] 如果 README 中有"待完成功能"章节，应移除上述已实现功能
- [ ] 不需要同步至总 README（本次为 UI 体验改进，非破坏性功能变更）

## 归档元数据

- Git commit：`6a9518a`（主实现：`f582abe`）
- 涉及 layers：`editor`
- Tasks 完成数：4/4（T1 PreviewPanel、T2 DebugTab、T3 执行状态 UI、T4 端到端验证）
- change_class：`medium`（仅 UI 体验改进，不影响核心数据契约）
