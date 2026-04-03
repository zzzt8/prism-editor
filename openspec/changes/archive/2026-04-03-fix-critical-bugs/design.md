## Context

当前项目存在 6 个 Critical/High 级别的 bug，需要系统性地修复。这些问题涉及：
- 跨应用数据流（Dev Tool → Server → User App）
- React 性能（组件订阅导致全局重渲染）
- 错误处理（缺少 Error Boundary）
- 存储迁移（数据破坏）
- 类型转换（静默失败）

---

## Goals / Non-Goals

**Goals:**
- 修复所有 Critical 和 High 级别 bug
- 确保导入/发布工作流能完整往返
- 提升 Canvas 执行性能
- 防止 App 因未捕获异常白屏

**Non-Goals:**
- 不做大规模重构
- 不改变现有的数据模型
- 不添加新功能
- 不修改工作流执行引擎核心逻辑

---

## Decisions

### 决策 1: 数据流修复方案

**问题根因**：
Dev Tool publish 时，`server/src/routes/published.ts` 存储的是 `workflow.content`（原始 `Workflow` JSON），而不是 `PublishedWorkflow` 结构。User App 加载时，`publishedStore.selectWorkflow()` 期望从 `config.inputs` 等字段读取，但数据不存在。

**方案选择**：在 Dev Tool 端序列化完整 `PublishedWorkflow`，服务器原样存储

```
Dev Tool                    Server                    User App
   │                          │                          │
   ├─── publish() ──────────▶│                          │
   │   POST /api/published    │                          │
   │   body: PublishedWorkflow│                          │
   │   (完整结构，包含 config) │─── store content ───────▶│
   │                          │                          │
   │                          ├─── GET /published ──────▶│
   │                          │   content: PublishedWorkflow JSON
   │                          │                          ├─── parse ──▶ 完整数据
```

**实现**：
1. `PublishDialog.tsx` 在发布时将完整 `PublishedWorkflow` JSON 序列化到 `content` 字段
2. 服务器 `POST /api/published/import` 直接存储这个 JSON
3. User App `loadPublished` 解析 JSON，返回 `PublishedWorkflow` 类型
4. 移除 `publishedStore.selectWorkflow()` 中的手动重组逻辑

**理由**：不需要改服务器 schema，只需要改序列化的内容。改动最小，风险可控。

---

### 决策 2: PrismNode 性能优化

**问题根因**：
`PrismNode` 组件订阅 `useCanvasStore((s) => s._currentNodeId)`，任何节点执行时都会触发所有 `PrismNode` 重渲染。

**方案选择**：移除对 `_currentNodeId` 的订阅，改用 React Flow 的 `data` prop 传递执行状态

```tsx
// 当前（有问题）
const currentNodeId = useCanvasStore((s) => s._currentNodeId);
const isRunning = currentNodeId === nodeId;

// 修复后（正确）
const data = useNode().data;
const isRunning = data._executingNodeId === nodeId;
```

**理由**：React Flow 传递 `data` 作为 prop，节点自己的 `data` 变化时只会重渲染该节点，不会触发其他节点。

---

### 决策 3: Error Boundary 添加位置

**问题根因**：只有 `WorkflowCanvas` 有 Error Boundary，其他组件崩溃导致整个 App 白屏。

**方案选择**：在每个 App 的根组件添加 Error Boundary

```
apps/dev-tool/src/App.tsx
├── ErrorBoundary ← 新增：捕获所有未处理错误
│   ├── DevToolLayout
│   │   ├── Header
│   │   ├── WorkflowsView ← 现有 Boundary 保留
│   │   └── WorkflowCanvas ← 现有 Boundary 保留
│   └── Modals (PublishDialog, NewWorkflowModal)
│
apps/user-app/src/App.tsx
├── ErrorBoundary ← 新增：捕获所有未处理错误
│   ├── WorkflowListPage
│   └── WorkflowRunPage
```

**理由**：根级 Error Boundary 捕获所有未处理的异常，防止白屏。子级 Boundary 保留用于隔离局部错误（画布崩溃时其他 UI 仍可用）。

---

### 决策 4: localStorage 迁移逻辑修复

**问题根因**：`LocalStorageAdapter.ts` 迁移时，如果新格式键存在，会用旧数据覆盖。

**方案选择**：迁移前先检查新格式是否存在，存在则跳过

```typescript
// 当前（有 bug）
for (const legacyKey of legacyKeys) {
  const newKey = legacyKey.replace(LEGACY_WORKFLOW_PREFIX, '');
  // 直接写入新键，覆盖可能存在的新数据
  localStorage.setItem(newKey, legacyData);
}

// 修复后
for (const legacyKey of legacyKeys) {
  const newKey = legacyKey.replace(LEGACY_WORKFLOW_PREFIX, '');
  const existingData = localStorage.getItem(newKey);
  if (existingData) {
    // 新格式已存在，跳过（不覆盖）
    continue;
  }
  localStorage.setItem(newKey, legacyData);
}
```

---

### 决策 5: 异步类型转换器处理

**问题根因**：`type-validator.ts` 中异步转换器返回 `Promise` 时，executor 传入未转换的值。

**方案选择**：对于异步转换，改为同步等待（因为实际的 image-ops 都是同步的）

```typescript
// 当前（有问题）
if (converted instanceof Promise) {
  result[port.id] = value; // 传入未转换值
}

// 修复后：改为抛出错误，因为我们的场景不应该有异步转换
if (converted instanceof Promise) {
  throw new Error(
    `Async type converters are not supported. ` +
    `Node '${nodeId}' port '${port.id}' returned a Promise.`
  );
}
```

**理由**：当前项目所有 image-ops 都是同步的 Canvas API。如果有异步需求，需要重构 executor 支持 async/await，而不是静默传递错误类型。

---

## 数据流详细设计

### Publish 流程（修复后）

```
1. Dev Tool: PublishDialog 调用 store 的 publish 方法
   ↓
2. store.publish() 构建 PublishedWorkflow 对象：
   {
     sourceId: workflow.id,
     name: 'My Workflow',
     sourceName: workflowMeta.name,  // 保留原始名称
     version: '1.0.0',
     inputs: [...],        // 暴露的输入端口
     outputs: [...],       // 暴露的输出端口
     config: {
       connections: [...],
       nodeTypes: {...},
       nodeIndexMap: {...},
       nodeConfigs: {...},
       exposedParams: [...],
       inputs: [...],
       outputs: [...]
     },
     publishedAt: new Date().toISOString()
   }
   ↓
3. JSON.stringify 序列化完整对象
   ↓
4. POST /api/published/import
   {
     name: 'My Workflow',
     content: '<完整 PublishedWorkflow JSON 字符串>',
     ...
   }
   ↓
5. Server 存储到 PublishedWorkflow.content
   ↓
6. User App GET /api/published?limit=100
   返回每个 PublishedWorkflow 记录，content 字段包含完整 JSON
   ↓
7. User App 解析 content，直接得到 PublishedWorkflow 对象
   无需手动重组
```

### Import 流程（修复后）

```
1. User App: 用户选择 JSON 文件
   ↓
2. WorkflowImport.validateAndParse() 验证 JSON 结构
   ↓
3. ApiStorageAdapter.importWorkflow()
   POST /api/published/import
   {
     name: workflow.name,
     content: JSON.stringify(workflow),  // 完整的 PublishedWorkflow
     ...
   }
   ↓
4. Server 存储到 Workflow.content + PublishedWorkflow.content
   ↓
5. User App 列表刷新，新导入的工作流出现在列表中
```

---

## 组件订阅优化设计

### PrismNode 当前订阅（有问题）

```typescript
// 问题：任何 canvasStore 状态变化都会触发重渲染
const currentNodeId = useCanvasStore((s) => s._currentNodeId);
const updateNodeParams = useCanvasStore((s) => s.updateNodeParams);
```

### PrismNode 优化后

```typescript
// 优化：只订阅当前节点的 params 变化
const nodeId = useNode().id;
const params = useCanvasStore((s) => {
  const node = s.nodes.find(n => n.id === nodeId);
  return node?.data?.params;
});

// 执行状态从 React Flow data prop 读取
const data = useNode().data;
const executionResult = data?.executionResult;
const isRunning = data?._executingNodeId === nodeId;
```

### 需要的 canvasStore 变更

移除 `_currentNodeId` 作为全局执行状态，改为在节点的 `data` 对象中存储：

```typescript
// canvasStore.executeWorkflow 中
// 之前：set({ _currentNodeId: nodeId })
// 之后：updateNodeData(nodeId, { _executingNodeId: nodeId })

// 之前：set({ _executionStatus: 'idle' })
// 之后：updateNodeData(completedNodeId, { _executingNodeId: null, executionResult })
```

---

## Error Boundary 设计

### ErrorBoundary 组件

```typescript
class RootErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Root error:', error, info);
    // 可选：上报到监控服务
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 使用方式

```tsx
// apps/dev-tool/src/App.tsx
<RootErrorBoundary>
  <DevToolLayout>
    ...
  </DevToolLayout>
</RootErrorBoundary>

// apps/user-app/src/App.tsx
<RootErrorBoundary>
  <HashRouter>
    ...
  </HashRouter>
</RootErrorBoundary>
```

---

## API 错误处理设计

### 全局错误处理

```typescript
// server/src/app.ts
app.setErrorHandler((error, request, reply) => {
  // Zod 验证错误
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation failed',
      details: error.validation,
    });
  }

  // Prisma 错误
  if (error.code?.startsWith('P')) {
    if (error.code === 'P2002') {
      return reply.status(409).send({ error: 'Resource already exists' });
    }
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Resource not found' });
    }
    return reply.status(500).send({ error: 'Database error' });
  }

  // 其他错误
  console.error('Unhandled error:', error);
  return reply.status(500).send({ error: 'Internal server error' });
});
```

### Prisma 操作包装

```typescript
// 封装所有 Prisma 操作
async function safePrisma<T>(
  fn: () => Promise<T>,
  errorMessage = 'Database operation failed'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw error; // 让全局错误处理器处理
    }
    throw new Error(`${errorMessage}: ${error.message}`);
  }
}
```

---

## MigrationStorageAdapter 修复设计

### 定时器管理

```typescript
class MigrationStorageAdapter {
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  init() {
    // 清理可能存在的旧定时器
    this.destroy();
    this.startPeriodicHealthCheck();
  }

  destroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private startPeriodicHealthCheck() {
    this.healthCheckTimer = setInterval(() => {
      this.checkApiHealth();
    }, API_CHECK_INTERVAL);
  }
}
```

### 双写失败处理

```typescript
async save(workflow: Workflow): Promise<void> {
  const results: { api?: Error; local?: Error } = {};

  // API 写入
  if (this.isApiAvailable) {
    try {
      await this.apiAdapter.save(workflow);
    } catch (error) {
      results.api = error instanceof Error ? error : new Error(String(error));
    }
  }

  // localStorage 写入（始终执行）
  try {
    await this.localStorageAdapter.save(workflow);
  } catch (error) {
    results.local = error instanceof Error ? error : new Error(String(String));
  }

  // 任一失败都抛出错误
  if (results.api || results.local) {
    throw new Error(
      `Save failed${results.api ? ` API: ${results.api.message}` : ''}` +
      `${results.local ? ` LocalStorage: ${results.local.message}` : ''}`
    );
  }
}
```

---

## 内存泄漏修复清单

| 位置 | 问题 | 修复 |
|------|------|------|
| `GroupNode.tsx` | `handleMouseMove` 监听器在 unmount 时未清理 | 返回 `() => { document.removeEventListener(...) }` |
| `MigrationStorageAdapter` | `init()` 被调用多次时创建多个定时器 | `destroy()` 中清理现有定时器 |
| `WorkflowListPage.tsx` | `setTimeout` 未在 unmount 时清理 | 存储 timer ID，unmount 时 `clearTimeout` |
| `WorkflowHeader.tsx` | 同上 | 同上 |
| `WorkflowCanvas.tsx` | 同上 | 同上 |
| `nodeCache.ts` | 缓存无驱逐策略 | 添加 LRU 驱逐，超过 50 条时移除最老的 |
