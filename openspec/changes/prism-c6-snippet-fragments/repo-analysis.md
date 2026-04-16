## 影响层（Impact Map）

|| 影响层 | 涉及模块 | 影响原因 |
|--------|----------|----------|
| engine | `packages/shared-types/src/` | 新增 SnippetFragment 类型定义 |
| editor | `apps/dev-tool/src/` | NodeContextMenu + WorkflowCanvas + canvasStore + selectionSlice |

## 相关目录

```
apps/dev-tool/src/
├── components/canvas/
│   ├── NodeContextMenu.tsx     [+ 保存为片段菜单项]
│   └── WorkflowCanvas.tsx       [+ pane 级右键插入片段]
├── store/
│   └── canvasStore.ts           [+ insertSnippet action]
├── modules/editor/stores/
│   └── selectionSlice.ts        [复用 pasteNodes ID 重映射逻辑]
└── modules/repositories/
    └── snippetRepository.ts     [新增: SnippetRepository]

packages/shared-types/src/
└── snippet.ts                   [新增: SnippetFragment 类型]
```

## 关键模块

### SnippetRepository
- **位置**: `apps/dev-tool/src/modules/repositories/snippetRepository.ts`
- **职责**: IndexedDB CRUD 操作，管理 `snippets` object store
- **数据流**: UI → SnippetRepository.save() → IndexedDB → SnippetRepository.list() → UI
- **复用**: 复刻 `TemplateRepository` 的 IndexedDB 模式

### selectionSlice.pasteNodes
- **位置**: `apps/dev-tool/src/modules/editor/stores/selectionSlice.ts`
- **职责**: 节点 ID 重映射、位置偏移、边重连接
- **复用点**: 插入片段时复用其 ID 重映射逻辑（oldToNewIdMap），但数据源从 clipboard 改为 IndexedDB

### NodeContextMenu
- **位置**: `apps/dev-tool/src/components/canvas/NodeContextMenu.tsx`
- **职责**: 节点右键菜单
- **扩展**: 新增「保存为片段」菜单项，调用 canvasStore.snippetSave

### WorkflowCanvas
- **位置**: `apps/dev-tool/src/components/canvas/WorkflowCanvas.tsx`
- **职责**: React Flow 画布容器
- **扩展**: 新增 pane 级右键菜单（onPaneContextMenu），显示「插入片段」子菜单

## 复用点

- `selectionSlice.pasteNodes` 的 ID 重映射逻辑（oldToNewIdMap）可直接复用
- `TemplateRepository` 的 IndexedDB 存储模式可复刻
- `screenToFlowPosition` 已有（useReactFlow），用于计算插入位置
- 边过滤逻辑（只保留两端都在 snippet 内的边）与 pasteNodes 一致

## 现有问题

1. 当前模板系统需要跨页面操作（保存 → 模板管理器 → 选择），用户反馈太麻烦
2. clipboard 跨会话消失，无法持久保存常用节点群组
3. SaveDialog.tsx 存在但未集成到 WorkflowHeader，用户看不到"另存为模板"选项

## Impact Summary

本次 change 影响：
- **新增依赖**: `packages/shared-types` → `SnippetFragment` 类型
- **破坏性变更**: 无
- **向后兼容**: 完全向后兼容，不影响现有工作流和模板系统

## 数据流变化

```
[Before]
用户选中节点 → Ctrl+C → clipboard（页面刷新消失）

[After]
用户选中节点 → 右键"保存为片段" → IndexedDB snippets store（持久）
用户画布空白处右键 → "插入片段" → 子菜单列表 → screenToFlowPosition 计算位置
→ oldToNewIdMap 重映射 ID → 新节点 + 连线生成到画布
```