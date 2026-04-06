# C3: canvasStore.ts 拆分

> 引用自 meta-change `architecture-convergence/design.md` 的拆分原则。

## 1. Slice 职责边界

| Slice | State | Actions |
|-------|-------|---------|
| graphSlice | nodes, edges, groups | addNode, removeNode, updateNodePosition, onNodesChange, onEdgesChange, onConnect, addGroup, removeGroup, updateGroup, moveGroup, addExtraInput, removeExtraInput |
| selectionSlice | selectedNodeIds, selectedEdgeIds, clipboard, contextMenu | selectNode, clearSelection, copyNodes, cutNodes, pasteNodes, setContextMenu |
| inspectorSlice | inspectorTab | openInspector |
| draftSlice | workflowMeta, isDirty | setWorkflowMeta, renameWorkflow, newWorkflow, markDirty, markClean, setViewport |
| executionSlice | _executionStatus, _currentNodeId, _executionAbort | updateNodeExecution, executeWorkflow, cancelExecution, clearExecution |

## 2. 组合器设计

```typescript
// useCanvasStore.ts
export const useCanvasStore = () => ({
  // 委托给 graphSlice
  ...useGraphSlice(),
  // 委托给 selectionSlice
  ...useSelectionSlice(),
  // ...
});
```

## 3. Service 设计

### autosaveService.ts

```typescript
export function createAutosaveService(
  getDraft: () => EditorDraft,
  save: (draft: EditorDraft) => Promise<void>,
  onDirty: () => void
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  
  return {
    trigger() { /* schedule auto save */ },
    cancel() { /* clear timer */ },
  };
}
```

### importExportService.ts

```typescript
export function createImportExportService(draftStore: DraftSlice) {
  return {
    async exportAsJson() { /* ... */ },
    async importFromFile(file: File) { /* ... */ },
  };
}
```

### executionService.ts

```typescript
export function createExecutionService(
  graphSlice: GraphSlice,
  executionSlice: ExecutionSlice
) {
  return {
    async execute(): Promise<ExecutorResult> { /* ... */ },
    cancel() { /* ... */ },
  };
}
```

## 4. UI 组件迁移策略

按文件逐个迁移：
1. WorkflowCanvas.tsx — 订阅 graphSlice + selectionSlice
2. Inspector/index.tsx — 订阅 inspectorSlice
3. ParamPanel.tsx — 订阅 graphSlice
4. NodePanel.tsx — 订阅 graphSlice
5. Header 组件 — 订阅 draftSlice

## 5. 禁止事项

- **禁止**直接跨 slice 访问 state（必须通过组合器）
- **禁止**在 slice 中调用其他 slice 的 actions（必须通过组合器）
- **禁止**在 UI 组件中直接调用 storage adapter（必须走 repository）
