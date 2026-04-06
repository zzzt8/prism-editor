# C3: canvasStore.ts 拆分为 Zustand Slices

> 派生自 meta-change: `architecture-convergence`

## Why

canvasStore.ts（1073 行）同时承担画布状态、自动保存、导入导出、执行、动态端口、draft 元数据、剪贴板、上下文菜单、Group 操作——典型的"总控器"反模式。拆成 slice 后每个 slice 可独立测试，组合器只负责 wire 逻辑。

## What Changes

拆成 5 个 slice + 1 个组合器：

- **graphSlice**：nodes / edges / groups / dynamic ports
- **selectionSlice**：selectedNodeIds / selectedEdgeIds / clipboard / contextMenu
- **inspectorSlice**：inspectorTab / node panel UI state
- **draftSlice**：workflowMeta / isDirty / rename / new workflow
- **executionSlice**：executionStatus / progress / node results / abort

独立 services：
- **autosaveService**：autoSave timer 管理
- **importExportService**：导入导出
- **executionService**：执行入口统一

## Impact Summary

| Layer | 文件 | 影响 |
|-------|------|------|
| editor | `apps/dev-tool/src/modules/editor/stores/` | 新增目录，6 个 store 文件 |
| editor | `apps/dev-tool/src/modules/editor/services/` | 新增目录，3 个 service 文件 |
| editor | 所有 UI 组件 | store 订阅需更新 |

**约束**：这是最大回归风险点，需要 golden fixtures 保护。
