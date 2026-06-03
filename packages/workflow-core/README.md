# @prism/workflow-core

工作流核心引擎包，负责工作流的执行、调度和缓存。

## 功能

- **执行引擎**: 拓扑排序执行节点，处理输入输出
- **执行上下文**: 管理节点间的数据传递和状态
- **类型转换**: 自动转换端口数据类型
- **类型验证**: 验证端口连接的兼容性 (`PORT_COMPATIBILITY`)
- **LRU 缓存**: 缓存执行结果，提高性能
- **发布执行器**: `PublishedWorkflowExecutor` 在用户端执行已发布的工作流
- **参数合并**: 支持 params → _internalParams → exposedParams 的合并策略

## 核心 API

### 执行工作流

```typescript
import { executeWorkflow } from '@prism/workflow-core';

const result = await executeWorkflow(workflow, {
  inputs: { image: imageData },
  signal: abortController.signal
});
```

### 拓扑排序

```typescript
import { topologicalSort } from '@prism/workflow-core';

const sortedNodes = topologicalSort(nodes, connections);
```

### 类型转换注册

```typescript
import { registerTypeConverter } from '@prism/workflow-core';

registerTypeConverter('image/png', 'image/webp', async (value) => {
  // 转换逻辑
  return convertedValue;
});
```

### 类型验证

```typescript
import { validateConnection } from '@prism/workflow-core';

const isValid = validateConnection(sourcePort, targetPort);
```

### 执行上下文

```typescript
import type { ExecutionContext } from '@prism/workflow-core';

async function execute(context: ExecutionContext) {
  // 获取输入
  const image = context.requireInput('image', 'image/*');
  
  // 处理...
  
  // 设置输出
  context.setOutput('result', processedImage);
}
```

### 发布工作流执行器

```typescript
import { PublishedWorkflowExecutor } from '@prism/workflow-core';

const executor = new PublishedWorkflowExecutor(publishedWorkflow);
const result = await executor.execute(userInputs, { signal });
```

## ImageRuntimeObject (IRO)

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

## 执行上下文

每个节点执行器接收 `ExecutionContext`：

```typescript
interface ExecutionContext {
  // 获取上游输出，缺失则抛错
  requireInput(name: string, expectedType?: string): unknown;
  
  // 存储执行结果
  setOutput(name: string, value: unknown): void;
  
  // 获取用户配置参数
  getParameter<T>(name: string): T;
  
  // AbortSignal，用于取消执行
  signal: AbortSignal;
}
```

## 依赖

- `@prism/shared-types` - 共享类型定义

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm test:watch` | 监听模式运行测试 |
| `pnpm clean` | 清理构建产物 |
