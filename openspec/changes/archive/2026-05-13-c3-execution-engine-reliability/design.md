## Context

流水线执行存在 3 个具体 bug：
1. **取消无效**：`executionService.ts` 的 `cancel()` 方法只打了日志，没有实际停止执行。`WorkflowExecutor` 支持 `AbortSignal`，但调用方没有传递。
2. **Worker 调度错误**：`workerPool.ts` 在 Worker 错误超限后调用 `replaceWorker()`，之后用旧的 `workerIndex` 重新查找，可能指向已被替换的 Worker 槽位。
3. **错误信息错误**：`useCanvasStore.ts` 的 `toWorkflow()` 里 targetHandle 缺失时报错信息写的是 `"sourceHandle is required"`。
4. **Worker 超时不可配置**：`workerPool.ts` 的 `MAX_ATTEMPTS = 200` 硬编码，无法按部署环境调优。

## Goals / Non-Goals

**Goals:**
- 取消操作真正停止流水线执行
- Worker 重试分配到正确的 Worker
- 错误信息准确
- Worker 超时可配置（环境变量）

**Non-Goals:**
- 不做节点级取消（只做流水线级取消）
- 不做 Worker 动态调度
- 不重写 WorkflowExecutor

## Decisions

### 1: AbortController 链实现

```
用户点取消 → executionService.cancel() → 
  abortController.abort() →
  WorkflowExecutor 收到 signal → checkAborted() 返回 true →
  当前批次节点完成后停止调度新节点
```

dev-tool: `executionService.ts` 在 `execute()` 开始时创建 `AbortController`，保存引用。`cancel()` 调用 `abortController.abort()`。将 `signal` 传 `WorkflowExecutorOptions` 中的 `abortSignal`。

user-app: 同样在 `runWorkflow.ts` 的 `run()` 中创建 `AbortController`，`cancel()` 调用 `abort()`。

### 2: Worker 池重试索引修复

```ts
// 修复前（bug）：
const fresh = workerIndex !== -1 ? this.workers[workerIndex] : null;

// 修复后：
// replaceWorker 后 workers 数组已更新，workerIndex 可能已失效
// 改用 findFirstAvailable() 重新找可用槽位
const fresh = this.findFirstAvailable();
```

### 3: 错误信息修复

```ts
// 修复前：
port: e.targetHandle ?? (() => { throw new Error('sourceHandle is required'); })(),

// 修复后：
port: e.targetHandle ?? (() => { throw new Error('targetHandle is required'); })(),
```

## Risks / Trade-offs

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| AbortSignal 传播不完整 | 中 | 取消仍不完全 | 每个节点执行前检查 `checkAborted()` |
| Worker 池修复后任务堆积 | 低 | 队列积压 | 限流 maxConcurrentTasks |
| TypeScript 改动引入新类型错误 | 低 | 编译失败 | 每步后跑 typecheck |

**回滚方案**: `git revert` 一次性回滚所有文件

---

## Architecture Review（技术方案评审）

### 目标

让流水线执行可取消、Worker 调度可靠、错误信息准确。

### 约束

- 技术约束：WorkflowExecutor 已支持 AbortSignal，只需传递；WorkerPool 的类型系统不变
- 不变量：执行结果不变（取消前已完成的部分仍然有效）

### 候选方案

#### 方案 A：在 WorkflowExecutor 层面统一处理 abort signal
**Pros**: 所有节点的 abort 检查集中管理
**Cons**: 需要修改 WorkflowExecutor 核心逻辑

#### 方案 B：每个节点执行前检查 abort signal
**Pros**: 改动分散，每个节点局部
**Cons**: 容易遗漏节点

### 决策

选择方案 A 的思路 + 方案 B 的实现：在 `WorkflowExecutor` 的主循环（topological sort 遍历时）检查 signal，每个节点执行器内部通过 `ExecutionContext.isAborted()` 检查。`ExecutionContext` 已有 `checkAborted()` 方法，只需将 `signal` 注入到 context 中。

### 风险与回滚

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 某些节点执行器忘记检查 abort | 中 | 节点继续跑 | 在 base executor 层面统一拦截 |
| Worker index bug 修复后引入新 bug | 低 | 任务分配错误 | 加单元测试覆盖重试路径 |

**回滚方案**: `git revert packages/image-ops/src/scheduler/workerPool.ts apps/dev-tool/src/modules/editor/services/executionService.ts`

### Migration Strategy（迁移策略）

1. 先修复 Worker index bug（最小改动，可独立验证）
2. 再实现 AbortController 链（修改面较大）
3. 最后修错误信息（最小改动）

---

## 评审清单

> 适用于 change_class = high

- [ ] 方案是否覆盖了 proposal 中的所有 goal 和 acceptance criteria？
- [ ] 是否存在更简单的替代方案？已在 design.md 中选择
- [ ] 最坏情况的回退路径是什么？`git revert`
- [ ] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED 语义变化？
  - 流水线执行：MODIFIED 行为（可取消）
  - Worker 调度：MODIFIED 行为（重试逻辑）
- [ ] Layer 间是否有隐式依赖未在设计层面显式声明？
  - engine → editor: WorkflowExecutor 接口变了（加了 abortSignal）
  - engine → runtime: 同样加了 abortSignal
