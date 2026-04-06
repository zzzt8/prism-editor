# C8: Worker 化

> 引用自 meta-change `architecture-convergence/design.md` 的拆分原则。

## 1. Lane 策略

| 节点类型 | Lane | 原因 |
|---------|------|------|
| load-image | main-thread | 需要 CORS 校验、URL 管理 |
| transform | worker | CPU 密集 |
| composite | worker | CPU 密集 |
| apply-mask | worker | CPU 密集 |
| export | main-thread | 需要 Blob URL 管理 |

## 2. Lane 选择

```typescript
interface ExecutionLane {
  type: 'main-thread' | 'worker';
  workerPool?: WorkerPool;
}

function selectLane(nodeType: string): ExecutionLane {
  if (['transform', 'composite', 'apply-mask'].includes(nodeType)) {
    return { type: 'worker', workerPool: defaultWorkerPool };
  }
  return { type: 'main-thread' };
}
```

## 3. Worker 通信协议

```typescript
interface WorkerTask {
  nodeId: string;
  executorType: string;
  inputs: Record<string, unknown>;
  params: Record<string, unknown>;
}

interface WorkerResult {
  nodeId: string;
  outputs: Record<string, unknown>;
  error?: string;
}
```
