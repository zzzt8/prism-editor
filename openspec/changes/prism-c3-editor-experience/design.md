## Context

当前编辑器体验的核心痛点是"调试体验差"（P0-6 尚未完整落地）和"预览打断工作流"。ExecutionContext 的 timing/status 字段已预留但未接入 UI，`NodePreviewModal` 是弹窗形式无法实时预览。

---

## Goals / Non-Goals

**Goals:**

- 将预览从 Modal 弹窗升级为内嵌实时面板
- 节点执行状态（pending/running/done/error）有明确视觉区分
- 执行耗时统计显示在 Inspector DebugTab 中
- 输入/输出快照在 DebugTab 中可查看

**Non-Goals:**

- Canvas 性能深度优化（除非发现严重卡顿）
- 快捷键系统重构
- 节点搜索/分组（→ C4）

---

## Decisions

### Decision 1: PreviewPanel 位置——Inspector 内 vs Canvas 侧边栏

**选项 A**: Inspector 下方 Tab（Preview/Debug）

**选项 B**: Canvas 右侧固定面板

**选择: A**

理由：用户已习惯 Inspector 作为节点配置主面板，在 Inspector 中增加 Preview/Debug Tab 符合现有交互模型，不需要额外空间分配。

---

### Decision 2: 预览刷新策略

**选项 A**: 节点执行完成后自动刷新预览

**选项 B**: 手动刷新

**选择: A（自动刷新）+ 保留手动刷新按钮**

理由：实时反馈是关键体验目标；手动刷新作为降级和精确控制手段保留。

---

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 预览面板占用 Inspector 空间 | 提供 Tab 切换，用户可切回参数配置 |
| 执行耗时数据量大 | 仅保留最近一次执行的耗时，按需显示 |

---

## change_class = medium 测试指南

### Test Plan（测试设计）

#### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| editor | Smoke test | 手工验收 |

#### Test Cases

##### TC-1: 内嵌预览随执行自动刷新

- **Given**: 编辑器中有已配置的节点
- **When**: 执行该节点
- **Then**: Inspector PreviewTab 自动显示执行结果，无需手动刷新

##### TC-2: 执行状态视觉区分

- **Given**: 节点正在执行
- **When**: 观察节点
- **Then**: 节点显示 running 动画（spinner 或 pulse）

##### TC-3: 执行耗时显示

- **Given**: 节点执行完成
- **When**: 打开 Inspector DebugTab
- **Then**: 显示"耗时: 123ms"或类似信息

#### Backward Compatibility（向后兼容）

- [ ] NodePreviewModal 快捷键触发方式保留
- [ ] 无节点选中时 PreviewPanel 显示空状态
- [ ] 执行出错时 DebugTab 显示错误信息
