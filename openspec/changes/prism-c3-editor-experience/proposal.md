## change_class

`medium` — 仅 UI 体验改进，不影响核心数据契约，不触及 engine/backend 层接口。

---

## Why

当前编辑器"功能可用"但"体验粗糙"。具体痛点：

1. **预览是弹窗**（`NodePreviewModal`）：每次预览要弹出一个 Modal，无法边编辑边看效果，严重打断工作流
2. **节点执行耗时不可见**：`ExecutionContext.timing` 字段已预留但未接入 UI，调试时无法定位性能瓶颈节点
3. **P0-6 调试能力缺失**：节点执行状态只有 done/error，无 running 动画，无法区分"参数错误/输入缺失/执行失败"
4. **画布性能**：大量节点时可能存在渲染性能问题

这些问题不影响"核心业务闭环"，但直接影响"链路配置时间缩短 50%"这一第一阶段成功标准。

**为什么是现在**：C1（资产模型）完成后核心数据契约已稳定，C3 的体验改进可以在此基础上安全推进，不会因底层类型变更而反复推翻。

---

## What Changes

- 内嵌预览面板（替代 NodePreviewModal 弹窗，随节点执行实时更新）
- 节点执行耗时统计（接入 ExecutionContext.timing，显示在节点或面板上）
- 节点执行状态增强（running 动画、pending 状态区分）
- Inspector 预览 Tab 增强（显示执行结果快照、输入输出 JSON）

---

## Capabilities

### New Capabilities

- `inline-preview`: 内嵌实时预览面板，随节点执行自动刷新
- `execution-timing`: 节点执行耗时统计与可视化
- `node-status-ui`: 节点执行状态 UI（pending/running/done/error）

### Modified Capabilities

- `debugging-ui`: 扩展 Inspector 的调试 Tab，显示输入/输出快照

---

## Impact

- **受影响文件**: `apps/dev-tool/` 多个 canvas/Inspector 组件
- **依赖方**: C1（完成后内嵌预览可接入稳定的节点数据）
- **向后兼容**: 完全向后兼容，仅 UI 体验改进

---

## Out of Scope

- Canvas 性能优化（除非发现严重性能问题）
- 快捷键优化（可作为独立小 change）
- 节点搜索/分组增强（→ C4 模板中心的配套 UI）
