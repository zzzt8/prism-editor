## Why

经过全面代码审查，发现项目存在 60+ 个潜在问题，其中 **6 个 Critical/High 级别** 的问题直接影响核心功能可用性：

### 1. 数据流断裂 — 导入的工作流无法使用（最严重）

用户从 Dev Tool 导出的 JSON 导入到 User App 后：
- 打开工作流显示"工作流不存在"
- 列表显示的 `sourceName` 被覆盖为用户显示名
- `inputCount`/`outputCount` 硬编码为 0

**根本原因**：`Workflow`（草稿）类型和 `PublishedWorkflow`（发布）类型是完全不同的结构，但存储和加载时未正确转换。

### 2. 内存泄漏 — 每个节点在执行时全部重渲染

`PrismNode` 组件订阅了 `canvasStore._currentNodeId`：
- 任何节点执行时，`_currentNodeId` 更新
- **所有节点组件重新渲染**（即使只是显示执行进度）
- 10 个节点 = 10 次完整重绘

### 3. 缺少 Error Boundary — 任何未捕获错误让整个 App 白屏

整个 Dev Tool 和 User App 只有 1 个 Error Boundary（仅包裹画布区域）。任何组件的未捕获异常都会导致整个 App 崩溃。

### 4. localStorage 迁移逻辑会破坏数据

`LocalStorageAdapter` 迁移旧格式时，如果新格式键已存在，**会用旧数据覆盖新数据**。

### 5. 异步类型转换静默失败

`type-validator.ts` 中异步类型转换器返回 `Promise` 时，executor 传入未转换的原始值。

### 6. 多个竞态条件和内存泄漏

- `GroupNode` 拖拽时卸载，`mousemove` 监听器泄漏
- `MigrationStorageAdapter` 创建多个并发健康检查定时器
- `canvasStore` AutoSave 竞态条件

---

## What Changes

### 第一阶段：止血（Critical + High）

1. **修复数据流** — 重构 publish 流程，正确序列化/反序列化 `PublishedWorkflow`
2. **修复性能** — 移除 `PrismNode` 对 `_currentNodeId` 的订阅
3. **添加 Error Boundary** — 为两个 App 添加根级错误边界
4. **修复内存泄漏** — `GroupNode`、`MigrationStorageAdapter`、Blob URL 清理
5. **修复竞态条件** — AutoSave、`MigrationStorageAdapter` 双写

### 第二阶段：强化（Medium）

6. **API 层加固** — 所有 Prisma 操作添加 try/catch，content 字段添加验证
7. **存储层修复** — localStorage 迁移逻辑、双写失败处理、nodeCache 驱逐策略
8. **UI 完善** — `inputCount`/`outputCount` 正确统计、错误状态正确处理

---

## Capabilities

### New Capabilities

- `root-error-boundary`: 为 Dev Tool 和 User App 添加根级 Error Boundary
- `node-memoization`: 为 PrismNode 等重组件添加 React.memo 优化

### Modified Capabilities

- `cross-app-data-flow`: 重构 publish/import 流程，修复数据丢失
- `canvas-execution`: 修复 PrismNode 订阅问题，提升执行性能
- `storage-migration`: 修复数据破坏 bug，添加健康检查
- `api-error-handling`: 统一 API 层错误处理

---

## Impact

### 修改文件

**Critical 数据流修复：**
- `apps/dev-tool/src/components/header/PublishDialog.tsx`
- `apps/dev-tool/src/storage/ApiStorageAdapter.ts`
- `apps/user-app/src/storage/ApiStorageAdapter.ts`
- `apps/user-app/src/store/publishedStore.ts`
- `server/src/routes/published.ts`

**性能修复：**
- `apps/dev-tool/src/components/nodes/PrismNode.tsx`
- `apps/dev-tool/src/components/nodes/GroupNode.tsx`
- `apps/dev-tool/src/components/canvas/useCanvasDragDrop.ts`

**稳定性修复：**
- `apps/dev-tool/src/App.tsx`
- `apps/user-app/src/App.tsx`
- `apps/dev-tool/src/storage/LocalStorageAdapter.ts`
- `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`
- `packages/workflow-core/src/type-validator.ts`

**API 层修复：**
- `server/src/routes/workflow.ts`
- `server/src/routes/published.ts`
