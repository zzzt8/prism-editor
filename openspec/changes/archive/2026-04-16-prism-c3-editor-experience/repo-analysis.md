## 影响层（Impact Map）

| 影响层 | 涉及模块 | 影响原因 |
|--------|----------|----------|
| engine | `packages/shared-types/` | 确认 `execution.ts` 中 timing/status 字段 |
| editor | `apps/dev-tool/` | canvas/Inspector/Preview 相关组件改动 |
| runtime | `apps/user-app/` | 暂时不受影响 |
| backend | `server/` | 不涉及 |
| ui-skin | `packages/shared-ui/` | 预览控件共享（若有） |

---

## 相关目录

```
affected/
├── packages/shared-types/src/
│   └── execution.ts             ← 确认 timing/status 字段
├── apps/dev-tool/src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── WorkflowCanvas.tsx       ← 扩展预览面板挂载
│   │   │   ├── NodePreviewModal.tsx    ← 保留（可导出快捷键触发）
│   │   │   └── PreviewPanel.tsx        ← 新增：内嵌预览面板
│   │   ├── Inspector/
│   │   │   ├── PreviewPanel.tsx        ← 新增或扩展
│   │   │   └── DebugTab.tsx            ← 新增：调试 Tab
│   │   └── nodes/
│   │       └── PrismNode.tsx           ← 扩展执行状态 UI
│   └── modules/editor/stores/
│       └── executionSlice.ts            ← 扩展耗时数据
```

---

## 关键模块

### 内嵌 PreviewPanel（新增）

- **位置**: `apps/dev-tool/src/components/Inspector/PreviewPanel.tsx`（或 canvas/PreviewPanel.tsx）
- **职责**: 显示当前选中节点的执行结果图像，随节点执行实时刷新
- **复用**: 复用 `NodePreviewModal` 的图像渲染逻辑
- **调用链**: executionSlice → PreviewPanel → canvasStore（获取选中节点）

### 节点执行状态 UI（PrismNode 扩展）

- **位置**: `apps/dev-tool/src/components/nodes/PrismNode.tsx`
- **职责**: 根据节点执行状态（pending/running/done/error）渲染不同视觉样式
- **新增**: running 状态加 spinner 动画；error 状态红色边框；done 状态绿色边框

### Inspector DebugTab（新增）

- **位置**: `apps/dev-tool/src/components/Inspector/DebugTab.tsx`
- **职责**: 显示选中节点的：输入快照、输出快照、执行耗时、错误信息
- **复用**: 复用 executionSlice 中的执行结果数据

---

## 复用点

- `execution.ts` 中的 `NodeExecutionResult` / `ExecutionContext.timing`：直接复用
- `PrismNode` 现有渲染逻辑：增量扩展
- `NodePreviewModal` 图像渲染：提取为共享工具函数复用
- `executionSlice`：增量扩展耗时数据

---

## 现有问题

1. **预览依赖弹窗**：NodePreviewModal 是 Modal，无法实时伴随编辑
2. **执行耗时不可见**：ExecutionContext.timing 有字段但无 UI 展示
3. **节点状态不直观**：running 状态无视觉反馈，用户不知道节点在执行
4. **调试信息分散**：输入/输出快照、错误信息没有统一面板查看

---

## Impact Summary

本次 change 影响：

- **新增依赖**: 无
- **破坏性变更**: 无（仅 UI 体验改进）
- **向后兼容**: 完全向后兼容
- **数据流变化**: executionSlice.timing → PreviewPanel / DebugTab / PrismNode
