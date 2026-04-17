## 任务列表

<!-- opsx-meta
id: T1
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [x] T1: 新增 Inspector PreviewPanel 内嵌预览组件
  - layer: editor
  - 目录: `apps/dev-tool/src/components/Inspector/PreviewPanel.tsx`
  - 内容:
    - 显示当前选中节点的执行结果图像
    - 订阅 executionSlice，在节点执行完成时自动刷新
    - 提供"刷新"按钮（手动刷新降级）
    - 空状态：无选中节点时显示"请选择节点查看预览"
    - 在 InspectorTabs 中增加 PreviewTab
  - 验证命令: 手工验收：选择节点 → 执行 → 观察 PreviewTab 自动更新

<!-- opsx-meta
id: T2
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [x] T2: 新增 Inspector DebugTab 调试信息面板
  - layer: editor
  - 目录: `apps/dev-tool/src/components/Inspector/DebugTab.tsx`
  - 内容:
    - 显示选中节点的执行耗时（从 ExecutionContext.timing 读取）
    - 显示输入快照（节点执行前的参数 JSON）
    - 显示输出快照（节点执行后的结果 JSON）
    - 显示错误信息（若执行失败）
    - 在 InspectorTabs 中增加 DebugTab
  - 验证命令: 手工验收：执行有问题的节点 → 观察 DebugTab 显示错误信息

<!-- opsx-meta
id: T3
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [x] T3: 扩展 PrismNode 执行状态 UI
  - layer: editor
  - 文件: `apps/dev-tool/src/components/nodes/PrismNode.tsx`
  - 内容:
    - 订阅 executionSlice 中节点状态
    - running 状态：节点左上角显示 spinner 或 pulse 动画
    - pending 状态：浅灰色半透明遮罩
    - done 状态：绿色成功边框（细微）
    - error 状态：红色错误边框 + 错误图标
  - 验证命令: 手工验收：执行节点 → 观察各状态视觉变化

<!-- opsx-meta
id: T4
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1, T2, T3]
-->
- [x] T4: 端到端验证
  - layer: editor
  - 内容:
    - 在编辑器中配置完整链路，执行
    - 确认 PreviewTab 实时显示节点输出
    - 确认 DebugTab 显示耗时和快照
    - 确认节点执行状态动画正常
  - 验证命令: 手工验收清单

---

### 手工验收清单

- [x] 选中节点后，Inspector PreviewTab 显示该节点执行结果
- [x] 节点执行时，PrismNode 显示 running 动画
- [x] 节点执行完成后，PreviewTab 自动更新（无弹窗）
- [x] Inspector DebugTab 显示耗时和输入/输出快照
- [x] 节点执行失败时，DebugTab 显示错误信息
- [x] typecheck 通过
