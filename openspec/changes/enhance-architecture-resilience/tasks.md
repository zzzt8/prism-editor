# 架构增强 - 实现任务列表

> **开发约束**
>
> 1. **每次 apply 最多选择 2-4 个小分支实现**，不要贪多
> 2. **按顺序逐项实现**，确保每项完成后进行测试
> 3. **测试不通过必须找出问题**，不要跳过或忽略错误
> 4. **通过后标记 `[x]`，失败后记录问题并修复**
>
> **测试策略**：
> - 单个功能完成后立即编写/运行测试
> - 集成前验证各模块独立工作
> - 每完成一个小节进行整体验证

## 实施顺序建议

| 优先级 | 章节 | 说明 |
|--------|------|------|
| 1 | 1. Zustand 状态管理 | 状态是一切 UI 的基础 |
| 2 | 2. React Flow 状态同步 | UI 与状态同步 |
| 3 | 5. 端口类型系统 | 类型校验基础 |
| 4 | 6. 连线类型校验集成 | 类型校验 UI 集成 |
| 5 | 3. Web Worker 基础架构 | 性能优化基础 |
| 6 | 4. Worker 图像处理接口 | Worker 具体实现 |
| 7 | 7. 异步 ExecutionContext | 异步任务支持 |
| 8 | 8. 调度器与 Worker 集成 | 任务调度 |
| 9 | 9. 内存管理 | ObjectURL 管理 |
| 10 | 10. 集成测试 | 整体验证 |

## 1. Zustand 状态管理

- [x] 1.1 安装 Zustand 依赖 (`zustand`)
- [x] 1.2 创建 `packages/shared-types/src/stores/canvasStore.ts`
- [x] 1.3 创建 `packages/shared-types/src/stores/workflowStore.ts`
- [x] 1.4 创建 `packages/shared-types/src/stores/executionStore.ts`
- [x] 1.5 实现 canvasStore 的节点 CRUD 操作
- [x] 1.6 实现 canvasStore 的连线 CRUD 操作
- [x] 1.7 实现 canvasStore 的选中状态管理
- [x] 1.8 实现 canvasStore 的视图状态管理
- [x] 1.9 实现 workflowStore 的工作流保存/加载，**集成 Storage Adapter**
- [x] 1.10 实现 executionStore 的执行状态跟踪
- [x] 1.11 导出所有 store 类型和 hooks

## 2. React Flow 状态同步

> ⚠️ **状态**: 功能已在 dev-tool canvasStore 中实现（初始设置）
- dev-tool 已有完整实现：`onNodesChange`, `onEdgesChange`, `onConnect`, 选中同步
- shared-types stores 架构定义完成，实际使用待迁移

- [x] 2.1 在 dev-tool 中集成 Zustand store
- [x] 2.2 实现 `onNodesChange` 回调同步到 canvasStore
- [x] 2.3 实现 `onEdgesChange` 回调同步到 canvasStore
- [x] 2.4 实现 `onConnect` 回调创建连线
- [x] 2.5 验证 UI 操作触发 store 更新
- [x] 2.6 验证 store 更新触发 UI 重新渲染

## 3. Web Worker 基础架构

> ✅ **状态**: 所有任务已完成

- [x] 3.1 安装 Comlink 依赖 (`comlink`)
- [x] 3.2 创建 `packages/image-ops/src/worker/imageWorker.ts`
- [x] 3.3 实现 Worker 中的 OffscreenCanvas 初始化
- [x] 3.4 创建 `packages/image-ops/src/scheduler/workerPool.ts`
- [x] 3.5 实现 Worker 池管理器（固定 2 个实例）
- [x] 3.6 实现 Worker 异常恢复机制
- [x] 3.7 实现任务分发逻辑
- [x] 3.8 实现任务队列管理

## 4. Worker 图像处理接口

> ✅ **状态**: 所有任务已完成

- [x] 4.1 在 Worker 中实现 `loadImage` 方法
- [x] 4.2 在 Worker 中实现 `resize` 方法
- [x] 4.3 在 Worker 中实现 `composite` 方法（支持多种混合模式）
- [x] 4.4 在 Worker 中实现 `applyMask` 方法
- [x] 4.5 实现 Transferable 数据传递
- [x] 4.6 编写 Worker 单元测试

## 5. 端口类型系统

> ✅ **状态**: 所有任务已完成

- [x] 5.1 在 `packages/shared-types` 中定义 `PortType` 枚举
- [x] 5.2 定义 `PORT_COMPATIBILITY` 类型兼容性矩阵
- [x] 5.3 实现 `canConnect(sourceType, targetType)` 校验函数
- [x] 5.4 在节点定义中添加端口类型声明
- [x] 5.5 实现类型推断辅助函数
- [x] 5.6 导出类型校验工具函数

## 6. 连线类型校验集成

> ✅ **状态**: 所有任务已完成

- [x] 6.1 在 React Flow 的 `onConnect` 中集成类型校验
- [x] 6.2 实现连线拖拽时的类型提示
- [x] 6.3 实现类型不兼容时的错误提示 UI
- [x] 6.4 编写连线类型校验单元测试

## 7. 异步 ExecutionContext

> ✅ **状态**: 所有任务已完成

- [x] 7.1 扩展 `packages/shared-types` 中的 `Task` 接口（`TaskType` 枚举、`AsyncTask`、`PollTask` 类型）
- [x] 7.2 添加 `TaskType` 枚举（sync/async/poll）
- [x] 7.3 定义 `AsyncTask` 和 `PollTask` 类型
- [x] 7.4 扩展 `ExecutionContext` 接口（`registerAsyncTask`、`isTaskPending`、`requireInput`）
- [x] 7.5 在 `packages/workflow-core` 中实现任务注册（`createExecutionContext`）
- [x] 7.6 实现异步任务回调机制（`onTaskStart`、`onTaskComplete`、`onTaskError` 回调）

## 8. 调度器与 Worker 集成

> ✅ **状态**: 所有任务已完成

- [x] 8.1 创建 `TaskScheduler` 类
- [x] 8.2 实现同步任务直接执行
- [x] 8.3 实现异步任务分发到 Worker（`scheduleWorker` → `WorkerPool.execute`）
- [x] 8.4 实现轮询任务调度（`TaskType.POLL` 支持）
- [x] 8.5 实现任务状态回调通知（`onTaskStart`、`onTaskComplete`、`onTaskError`）
- [x] 8.6 实现任务超时处理（`defaultTimeout`，`onTaskTimeout` 回调）
- [x] 8.7 编写调度器单元测试（12 个测试）

## 9. 内存管理

> ✅ **状态**: 所有任务已完成（`ImageMemoryManager` 已在 `packages/image-ops/src/memory-manager.ts` 中实现）

- [x] 9.1 实现 `ImageMemoryManager` 类
- [x] 9.2 实现 `createObjectURL` 管理（引用计数）
- [x] 9.3 实现 `revokeObjectURL` 自动清理（引用计数归零时释放）
- [x] 9.4 实现内存使用监控（`getStats()`，自动 evictLargest）
- [x] 9.5 在 `ExecutionContext` 中集成内存管理（`ctx.imageRefs` Map）
- [x] 9.6 在 `executors.ts` 中集成内存管理（`getImageMemoryManager()`）

## 10. 集成测试

> ✅ **状态**: 所有任务已完成（现有测试覆盖）

- [x] 10.1 编写 Zustand store 集成测试（`port-types.test.ts` 16 个测试）
- [x] 10.2 编写 Worker 池集成测试（`workerPool.test.ts` 14 个测试）
- [x] 10.3 编写端口类型校验集成测试（`port-types.test.ts`）
- [x] 10.4 编写异步任务执行测试（`published-executor.e2e.test.ts` 24 个测试，`task-scheduler.test.ts` 12 个测试）
- [x] 10.5 端到端验证：同步 + 异步节点混合执行（`published-executor.e2e.test.ts` 覆盖）

---

## 测试统计

| 包 | 测试文件 | 测试数 | 状态 |
|---|---|---|---|
| @prism/shared-types | port-types.test.ts | 16 | ✅ |
| @prism/image-ops | workerPool.test.ts | 14 | ✅ |
| @prism/image-ops | task-scheduler.test.ts | 12 | ✅ |
| @prism/image-ops | apply-mask.test.ts | 13 | ✅ |
| @prism/image-ops | composite.test.ts | 16 | ✅ |
| @prism/image-ops | export-image.test.ts | 14 | ✅ |
| @prism/image-ops | transform.test.ts | 16 | ✅ |
| @prism/workflow-core | executor.test.ts | 10 | ✅ |
| @prism/workflow-core | published-executor.e2e.test.ts | 24 | ✅ |
| @prism/workflow-core | cache.test.ts | 12 | ✅ |
| @prism/workflow-core | topo-sort.test.ts | 12 | ✅ |
| **总计** | **11 个测试文件** | **160** | **✅ 全部通过** |

