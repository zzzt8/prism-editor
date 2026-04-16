---
name: prism-c6-snippet-fragments
change_class: high
reason: "touches canvas store API contract, introduces new persistent data type (SnippetFragment), modifies editor layer UI interaction patterns"
---

## Why

当前的工作流模板系统要求用户保存完整工作流快照到模板库，再从模板管理器中选择加载。流程长（5 步）、无法复用局部节点群组、跨会话消失。用户实际需求是 ComfyUI 风格的"选中节点 → 保存 → 右键插入"，而不是跨页面操作模板管理器。

## What Changes

- 移除顶栏「模板管理」按钮（`WorkflowsView.tsx`），由片段系统的右键菜单替代完整工作流的模板复用路径
- 新增 **SnippetFragment** 数据类型，存储选中节点的快照（不含运行时状态）
- 新增 **SnippetRepository**，CRUD 操作存储到 IndexedDB `snippets` object store
- 节点右键菜单新增「保存为片段」选项
- 画布空白处右键新增「插入片段」子菜单
- 片段插入逻辑复用 `selectionSlice.pasteNodes` 的 ID 重映射机制

## Capabilities

### New Capabilities

- `snippet-save`: 将选中节点保存为可复用的片段（名称 + 描述 + 节点快照）
- `snippet-insert`: 在右键点击位置插入片段（自动 ID 重映射 + 位置偏移）

### Modified Capabilities

<!-- 无 -->

## Impact

- `apps/dev-tool/src/components/canvas/NodeContextMenu.tsx`: + 保存为片段菜单项
- `apps/dev-tool/src/components/canvas/WorkflowCanvas.tsx`: + pane 级右键菜单（插入片段）
- `apps/dev-tool/src/modules/repositories/snippetRepository.ts`: 新增 SnippetRepository
- `apps/dev-tool/src/store/canvasStore.ts`: + insertSnippet action
- `apps/dev-tool/src/modules/editor/stores/selectionSlice.ts`: ID 重映射逻辑可复用
- `packages/shared-types/src/snippet.ts`: 新增 SnippetFragment 类型
- `apps/dev-tool/src/components/WorkflowsView.tsx`: 移除「模板管理」按钮及相关 state
- `apps/dev-tool/src/components/TemplateManager/index.tsx`: 标记为废弃（可保留组件，待后续清理）

## Out of Scope

- 不做"片段变成自定义节点拖入"（方案 B），第一版只做右键菜单
- 不做片段的版本管理（每个片段只有最新快照）
- 不做片段的导入/导出
- 不做片段分类或标签（第一版仅按名称字母排序）