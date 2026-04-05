# C1: Mapper 契约定义

> 引用自 meta-change `architecture-convergence/design.md` 的拆分原则。

## 1. 三个唯一真源定义

### 1.1 EditorDraft

```typescript
// 画布编辑态（从 canvasStore 抽象出来）
export interface EditorDraft {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups: NodeGroup[];
  viewport: { x: number; y: number; zoom: number };
  workflowMeta: { id: string; name: string; version: string };
  isDirty: boolean;
  selectedNodeIds: string[];
  clipboard: CanvasNode[] | null;
  contextMenu: ContextMenuState | null;
}
```

### 1.2 StoredWorkflow

```typescript
// 保存态（Workflow JSON）
// 见 packages/shared-types/src/workflow.ts
export interface Workflow {
  id: string;
  name: string;
  version: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  metadata: WorkflowMetadata;
}
```

### 1.3 PublishedWorkflowV2

```typescript
// 发布态（config 结构）
// 见 packages/shared-types/src/published.ts
export interface PublishedWorkflowV2 {
  id: string;
  sourceId: string;
  name: string;
  config: PublishedConfig;
  version: string;
  publishedAt: string;
}
```

## 2. Mapper 契约

### 2.1 canvasToWorkflow.ts

```typescript
/**
 * 将 EditorDraft 转换为 StoredWorkflow
 * 用于保存和导出
 */
export function canvasToWorkflow(draft: EditorDraft): Workflow;
```

**规则**：
- `nodes` 从 CanvasNode[] 映射为 WorkflowNode[]（取 id/type/position/params）
- `edges` 从 CanvasEdge[] 映射为 Connection[]（取 id/from/to）
- `metadata.createdAt` 取自现有 workflow 或新建
- `metadata.updatedAt` 始终为当前时间

### 2.2 workflowToCanvas.ts

```typescript
/**
 * 将 StoredWorkflow 转换为 EditorDraft
 * 用于加载和编辑
 */
export function workflowToCanvas(workflow: Workflow): EditorDraft;
```

**规则**：
- `WorkflowNode[]` 映射为 CanvasNode[]（补全 definition 从 globalRegistry）
- `Connection[]` 映射为 CanvasEdge[]（附 color 样式）
- 重置 `isDirty: false`
- 清空 `selectedNodeIds`, `clipboard`, `contextMenu`

### 2.3 workflowToPublished.ts

```typescript
/**
 * 将 StoredWorkflow 转换为 PublishedWorkflowV2
 * 用于发布
 */
export function workflowToPublished(workflow: Workflow, config: PublishConfig): PublishedWorkflowV2;
```

**规则**：
- `nodeTypes` 用 canvas nodeId UUID 做 key
- `nodeConfigs` 取节点 params（userInputNodes 的 dataUrl 剥离）
- `inputs` 从 userInputNodes 构建 PublishedInputConfig[]
- `outputs` 从 export/composite 节点构建 PublishedOutputConfig[]

### 2.4 publishedToWorkflow.ts

```typescript
/**
 * 将 PublishedWorkflowV2 重建为 StoredWorkflow
 * 用于 runtime 重建可执行 Workflow
 */
export function publishedToWorkflow(published: PublishedWorkflowV2, userInputs: Record<string, unknown>): Workflow;
```

**规则**：
- 从 `config.nodeTypes` / `config.nodeConfigs` 重建节点
- 从 `config.connections` 重建连线
- 从 `config.inputs` 注入 userInputs
- 拓扑排序输出

## 3. 禁止事项

- **禁止**在 store action 中内联拼装 Workflow JSON
- **禁止**mapper 返回 undefined（内部抛 TypeError）
- **禁止**在 mapper 中直接调用 storage adapter

## 4. 异常处理

| 场景 | 处理 |
|------|------|
| nodeId 在 globalRegistry 中不存在 | warn + 使用 fallback label |
| connection 引用不存在的 nodeId | 过滤掉该 connection |
| PublishedWorkflow 无 nodeTypes | 抛 `PublishedWorkflowExecutorVersionError`（见 C4）|
