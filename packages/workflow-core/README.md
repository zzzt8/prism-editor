# @prism/workflow-core

工作流核心引擎包。负责工作流的执行、调度、缓存、类型校验和发布态工作流的桥接。提供 `WorkflowExecutor`（编辑器内执行）、`PublishedWorkflowExecutor`（用户端执行）、Node.js 服务端执行器、LRU 缓存、类型转换注册表、拓扑排序、ExecutionContext 等核心能力。

## 功能

- **执行引擎**：`WorkflowExecutor` 拓扑排序执行节点，处理输入 / 输出，按 `laneConfig` 选择主线程 / Worker lane
- **执行上下文**：`createExecutionContext` 统一封装 `requireInput` / `setOutput` / `getParameter` / `signal`
- **类型转换**：`TypeConverterRegistry` 注册跨类型转换器（如 `FILE → IMAGE`）
- **类型验证**：`TypeValidator` 校验端口类型（基于 `TYPE_COMPATIBILITY` 矩阵），可配置 `autoConvert` 自动转换
- **LRU 缓存**：`createCache` 提供按 `workflowId:nodeId:inputsHash` 键的 LRU 缓存（默认 1000 条 / 5 分钟），用单调 `accessCount` 计数器代替时间戳避免同毫秒精度问题
- **发布执行器**：`PublishedWorkflowExecutor` 在用户端执行已发布的工作流：
  - 从 `PublishedWorkflow` 重建完整 `Workflow`
  - 注入用户输入（`inputs: { '{nodeId}:{port}' → value }`）
  - 合并 `exposedParams` 到对应节点 `params`
  - 委托给 `WorkflowExecutor` 执行
- **Node.js 服务端执行器**：`executor-nodejs.ts` 提供服务端执行入口（用于 server 端 `/api/render` 路由）
- **取消支持**：通过 `AbortSignal` 在每个节点执行前 `checkAborted`，支持中途取消

## 核心 API

### WorkflowExecutor

```typescript
import { WorkflowExecutor, createCache } from '@prism/workflow-core';
import { globalRegistry } from '@prism/core';

globalRegistry.initialize();
const executor = new WorkflowExecutor(globalRegistry.getExecutors());

// 可选：启用 LRU 缓存
executor.setCache(createCache({ maxEntries: 500, maxAgeMs: 5 * 60 * 1000 }));

// 可选：注入 nodeDefinitions 启用自动类型校验 + 转换
executor.setNodeDefinitions(globalRegistry.listNodes());

const result = await executor.execute(workflow, {
  signal: abortController.signal,
  onProgress: (progress) => {
    console.log(`${progress.completedNodes}/${progress.totalNodes}`);
  },
  laneConfig: { enableWorkerLane: true }, // 可选
});
```

返回的 `ExecutorResult`：

```typescript
interface ExecutorResult {
  workflowId: string;
  status: 'done' | 'error' | 'cancelled';
  results: Record<string /* nodeId */, Record<string /* outputPortId */, unknown>>;
  error?: string;
  cancelledNodes?: string[];
  typeErrors?: string[];
}
```

### PublishedWorkflowExecutor

```typescript
import { PublishedWorkflowExecutor } from '@prism/workflow-core';

const executor = new PublishedWorkflowExecutor(globalRegistry.getExecutors());

const result = await executor.execute(publishedWorkflow, {
  inputs: {
    'canvas-abc123:image': blobUrl,
    'canvas-def456:mask': maskUrl,
  },
  exposedParams: {
    'canvas-xyz789': { opacity: 0.8, mode: 'multiply' },
  },
  signal: abortController.signal,
  onProgress: (progress) => { /* ... */ },
});
```

若 `PublishedWorkflow` 是老格式（缺 `nodeTypes`），抛 `PublishedWorkflowExecutorVersionError` 提示用户重新发布。

### 拓扑排序

```typescript
import { topologicalSort, getTopologicalLevels } from '@prism/workflow-core';

const sortedNodes = topologicalSort(nodes, connections);
const levels = getTopologicalLevels(nodes, connections); // 按层级分组
```

### LRU 缓存

```typescript
import { createCache } from '@prism/workflow-core';

const cache = createCache({ maxEntries: 1000, maxAgeMs: 5 * 60 * 1000 });
const hit = cache.get(workflowId, nodeId, inputsHash);
if (!hit) {
  const result = await runNode();
  cache.set(workflowId, nodeId, inputsHash, result);
}
```

### 类型转换注册

```typescript
import { typeConverterRegistry } from '@prism/workflow-core';

typeConverterRegistry.register({
  from: PortDataType.FILE,
  to: PortDataType.IMAGE,
  convert: async (data) => {
    const blob = data.data as Blob;
    return toPipeline(await loadImageFromBlob(blob), PortDataType.IMAGE);
  },
});
```

### 类型验证

```typescript
import { TypeValidator, TypeMismatchError } from '@prism/workflow-core';

const validator = new TypeValidator({
  enabled: true,
  autoConvert: true,
  strict: false, // strict 模式在 type mismatch 时抛 TypeMismatchError
});

const validated = validator.validateInputs(node, portInputs);
```

### Node.js 服务端执行

```typescript
import { executeWorkflowOnNodeJs, executeBatchOnNodeJs } from '@prism/workflow-core';

// 单 workflow
const result = await executeWorkflowOnNodeJs(workflow, inputs, options);

// 批量 → ZIP
const zipBuffer = await executeBatchOnNodeJs(workflow, batchInputs, options);
```

### ExecutionContext

每个节点 executor 接收的上下文：

```typescript
interface ExecutionContext {
  requireInput(_name: string, _expectedType?: string): unknown;
  setOutput(_name: string, _value: unknown): void;
  getParameter<T>(_name: string): T;
  signal: AbortSignal;
}
```

### ImageRuntimeObject (IRO)

节点间传递的统一图像数据结构：

```typescript
interface ImageRuntimeObject {
  data: ImageData | Blob;
  width: number;
  height: number;
  previewUrl: string;
  format: string;
  metadata?: Record<string, unknown>;
}
```

## 目录结构

```
packages/workflow-core/
├── src/
│   ├── executor.ts                # WorkflowExecutor（主执行器）
│   ├── executor-nodejs.ts         # Node.js 服务端执行入口
│   ├── published-executor.ts      # PublishedWorkflowExecutor
│   ├── topo-sort.ts               # 拓扑排序 / 分层
│   ├── context.ts                 # ExecutionContext / 节点结果记录 / 取消检查
│   ├── cache.ts                   # LRU 缓存（createCache）
│   ├── type-converter-registry.ts # 类型转换注册表
│   ├── type-validator.ts          # TypeValidator / TypeMismatchError
│   ├── index.ts                   # barrel export
│   └── *.test.ts / *.e2e.test.ts
├── package.json
└── README.md
```

## 依赖

- `@prism/shared-types` - 共享类型定义

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm test:watch` | Vitest 监听模式 |
| `pnpm clean` | 清理构建产物 |
