# 架构增强 - 技术设计

## Context

Prism Editor 的 MVP 基础架构已设计完成。在开始实现前，需要解决几个关键技术问题：

1. **状态管理缺失**：React Flow 与 React Context 的结合会导致不必要的全局重渲染，需要引入 Zustand
2. **性能隐患**：图像处理在主线程执行会阻塞 UI，OffscreenCanvas 的提及尚未落地为具体方案
3. **类型安全隐患**：端口连线没有类型校验，可能导致运行时错误
4. **扩展性受限**：ExecutionContext 设计为同步执行，无法支持未来的 AI 节点

## Goals / Non-Goals

**Goals:**
- Zustand 状态管理：统一管理画布节点、参数配置、执行状态
- Web Worker 调度池：将图像处理任务分流到 Worker 线程
- 端口类型系统：定义 PortType 枚举，实现类型安全的连线校验
- 异步 ExecutionContext：支持同步任务、异步任务、轮询任务三种模式

**Non-Goals:**
- 不实现完整的 Web Worker 池化策略（固定 2 个 Worker）
- 不实现 AI 节点的具体实现（仅预留接口）
- 不实现复杂的任务优先级队列

## Decisions

### 1. Zustand 状态管理

**决策**：dev-tool 使用 Zustand 管理所有状态

**Store 结构**：
```typescript
// canvasStore - 画布状态
interface CanvasStore {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  viewport: { x: number; y: number; zoom: number };
  addNode: (type: string, position: XYPosition) => void;
  removeNode: (id: string) => void;
  updateNodeParams: (id: string, params: Record<string, any>) => void;
}

// workflowStore - 工作流状态
interface WorkflowStore {
  currentWorkflow: Workflow | null;
  isDirty: boolean;
  save: () => Promise<void>;
  load: (id: string) => Promise<void>;
}

// executionStore - 执行状态
interface ExecutionStore {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: { current: number; total: number };
  currentNodeId: string | null;
  results: Map<string, ImageData>;
}
```

**原因**：
- React Flow 官方推荐，与自定义节点组件配合良好
- TypeScript 支持好，类型推断准确
- 性能优秀，避免不必要的重渲染
- API 简洁，学习成本低

**替代方案**：
- Redux Toolkit：过于重量级，MVP 阶段不必要
- React Context：会导致全局重渲染，不适合频繁更新的节点数据
- Jotai：原子化设计优秀，但 Zustand 与 React Flow 集成更成熟

### 2. Web Worker 任务调度

**决策**：使用 Comlink 简化 Worker 通信，固定 2 个 Worker 实例

**架构**：
```
┌─────────────────────────────────────────────┐
│              Main Thread                     │
│  ┌─────────────┐    ┌─────────────────┐    │
│  │ TaskQueue   │───▶│ TaskScheduler   │    │
│  └─────────────┘    └────────┬────────┘    │
│                              │              │
└──────────────────────────────┼──────────────┘
                               │ postMessage
        ┌──────────────────────┼──────────────┐
        │                      │              │
        ▼                      ▼              │
   ┌─────────┐           ┌─────────┐          │
   │ Worker1 │           │ Worker2 │          │
   │ (Idle)  │           │ (Busy)  │          │
   └─────────┘           └─────────┘          │
              Web Worker Pool                   │
```

**Worker 通信协议**：
```typescript
// Worker 暴露的接口
interface ImageWorker {
  processImage(task: ImageTask): Promise<ImageResult>;
  resize(data: ImageData, width: number, height: number): Promise<ImageData>;
  composite(data1: ImageData, data2: ImageData, mode: BlendMode): Promise<ImageData>;
}
```

**原因**：
- Comlink 隐藏了 postMessage 的复杂性，提供类似本地函数的调用体验
- 固定 2 个 Worker 足够满足 MVP 阶段的并发需求
- OffscreenCanvas 在 Worker 中执行，不影响主线程

**替代方案**：
- 原生 postMessage：需要手写序列化/反序列化，代码量大
- Webpack worker-loader：增加构建复杂度
- PoolManager 动态创建/销毁 Worker：过早优化，Worker 创建成本不高

### 3. 端口类型校验

**决策**：定义 PortType 枚举，连接时校验类型兼容性

**PortType 定义**：
```typescript
enum PortType {
  IMAGE = 'image',      // 图像数据
  MASK = 'mask',        // Mask 数据
  NUMBER = 'number',    // 数值参数
  STRING = 'string',    // 字符串参数
  BOOLEAN = 'boolean', // 布尔参数
}
```

**类型兼容性矩阵**：
```typescript
const PORT_COMPATIBILITY: Record<PortType, PortType[]> = {
  [PortType.IMAGE]: [PortType.IMAGE],
  [PortType.MASK]: [PortType.MASK, PortType.IMAGE],  // Mask 可接受图像输入
  [PortType.NUMBER]: [PortType.NUMBER],
  [PortType.STRING]: [PortType.STRING],
  [PortType.BOOLEAN]: [PortType.BOOLEAN],
};
```

**连线校验逻辑**：
```typescript
function canConnect(sourceType: PortType, targetType: PortType): boolean {
  return PORT_COMPATIBILITY[targetType].includes(sourceType);
}
```

**原因**：
- 枚举比字符串比较更安全，TypeScript 能在编译期发现问题
- 兼容性矩阵清晰定义类型转换规则
- 在 React Flow 的 `onConnect` 回调中拦截无效连接

**替代方案**：
- 运行时类型推断：增加复杂度，MVP 阶段不必要
- 严格的 1:1 类型匹配：过于死板，Mask 接受 Image 是合理的需求

### 4. 异步 ExecutionContext

**决策**：Task 支持三种执行模式，预留 AI 节点扩展能力

**Task 类型定义**：
```typescript
type TaskType = 'sync' | 'async' | 'poll';

interface Task {
  id: string;
  type: TaskType;
  execute(ctx: ExecutionContext): Promise<void>;
}

interface AsyncTask extends Task {
  type: 'async';
  // 外部 API 调用、HTTP 请求等
  pollInterval?: never;
}

interface PollTask extends Task {
  type: 'poll';
  // 轮询检查外部状态（如 AI 模型处理进度）
  pollInterval: number;
  maxPolls: number;
}
```

**ExecutionContext 扩展**：
```typescript
interface ExecutionContext {
  // ... 原有字段
  registerTask(task: Task): void;
  onTaskComplete(taskId: string, result: any): void;
  onTaskError(taskId: string, error: Error): void;
}
```

**原因**：
- 三种模式覆盖了所有图像处理场景
- 未来接入 AI API 时，只需实现 AsyncTask 或 PollTask
- 调度器统一管理任务队列，对调用方透明

**替代方案**：
- Promise.all 并行执行：无法控制并发数，可能导致浏览器卡顿
- 单一 Worker 队列：无法利用多核并行

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Worker 调试困难 | Worker 中断点调试不如主线程方便 | 使用 Comlink 的 RPC 风格，逻辑保持在主线程可调试 |
| Zustand 与 React Flow 状态同步 | 两套状态可能不一致 | 统一使用 canvasStore，React Flow 的 onNodesChange 同步到 store |
| 内存泄漏 | ImageData 未释放导致内存膨胀 | 显式调用 revokeObjectURL，建立内存使用监控 |
| 类型校验增加复杂度 | 每个节点需要声明端口类型 | 提供类型推断辅助，常见模式有默认值 |

## Migration Plan

1. **阶段一**：添加 Zustand store，迁移现有 React Flow 状态
2. **阶段二**：创建 Web Worker，实现简单的图像缩放任务
3. **阶段三**：扩展 Worker 支持所有图像处理操作
4. **阶段四**：添加端口类型校验
5. **阶段五**：扩展 ExecutionContext 支持异步任务

**回滚策略**：每个阶段独立可回滚，使用 Feature Flag 控制新功能启用

## Open Questions

~~1. **Worker 数量动态调整**：是否需要根据设备核心数动态调整 Worker 数量？~~
2. **共享内存传递**：ImageData 是否使用 Transferable 传递以提高性能？
~~3. **AI 节点具体形式**：是通过 API 调用还是 WebSocket 连接？~~
4. **本地存储方案**：IndexedDB vs localStorage，哪个更适合存储工作流数据？

> ~~删除线~~ 表示已解答的问题。

## Answered Questions

### Answered: Worker 数量（Open Question 1）

**决策**：MVP 阶段固定 2 个 Worker，不动态调整

**原因**：
- Worker 创建成本不高，固定数量足够满足 MVP 需求
- 动态调整增加复杂度，当前阶段不必要的优化
- 未来可按需扩展

### Answered: AI 节点形式（Open Question 3）

**决策**：通过 AsyncTask/PollTask 接口支持 API 调用

**具体实现**：
- AsyncTask：用于单次 API 调用（如 AI 图像生成）
- PollTask：用于轮询 AI 处理状态（如 Stable Diffusion 队列）
- 通过 ExecutionContext.registerTask 注册，由 TaskScheduler 统一调度
