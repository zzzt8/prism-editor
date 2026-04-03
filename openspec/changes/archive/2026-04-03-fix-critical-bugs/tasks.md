# 实现任务

---

## Part 1: 数据流修复（Critical）

> 修复 `Workflow` ↔ `PublishedWorkflow` 的序列化/反序列化问题

---

### 1.1 重构 PublishDialog — 发送完整 PublishedWorkflow

**文件**: `apps/dev-tool/src/components/header/PublishDialog.tsx`

- [x] 1.1.1 移除 `lastPublished` 状态，直接构建完整的 `PublishedWorkflow` 对象
- [x] 1.1.2 将完整对象 JSON 序列化，设置到 dialog state
- [x] 1.1.3 确保 `sourceName` 正确保留原始草稿名称
- [x] 1.1.4 测试：发布工作流 → 检查数据库 `PublishedWorkflow.content` 包含完整 `PublishedWorkflow` JSON

---

### 1.2 修复服务器 publish 端点

**文件**: `server/src/routes/published.ts`

- [x] 1.2.1 修改 `POST /api/published` — 接受 `content` 字段作为完整 PublishedWorkflow JSON
- [x] 1.2.2 修改 `POST /api/published/import` — 同样存储完整 PublishedWorkflow JSON
- [x] 1.2.3 添加 `content` 字段的 Zod 验证（最大长度 1MB）
- [x] 1.2.4 测试：发布工作流 → `GET /api/published?limit=1` 返回的 `content` 字段可被 JSON.parse

---

### 1.3 修复 User App 存储适配器

**文件**: `apps/user-app/src/storage/ApiStorageAdapter.ts`

- [x] 1.3.1 修改 `listPublished()` — 映射中正确设置 `sourceId`（应为 `workflowId`）
- [x] 1.3.2 修改 `listPublished()` — 正确计算 `inputCount` 和 `outputCount`
- [x] 1.3.3 修改 `loadPublished()` — 解析 `content` JSON，直接返回 `PublishedWorkflow` 类型
- [x] 1.3.4 修改 `loadPublished()` — 使用 `GET /published?limit=100` 列表（因为列表已经包含 content）

---

### 1.4 修复 publishedStore

**文件**: `apps/user-app/src/store/publishedStore.ts`

- [x] 1.4.1 修改 `loadWorkflows()` — 正确保留 `sourceName`（来自 `published.sourceName`）
- [x] 1.4.2 修改 `loadWorkflows()` — 正确设置 `inputCount` 和 `outputCount`
- [x] 1.4.3 修改 `selectWorkflow()` — 直接使用 API 返回的 `PublishedWorkflow`，移除手动重组逻辑
- [x] 1.4.4 添加错误处理：`loadWorkflows()` 失败时设置 `loadError`

---

### 1.5 修复 import 流程

**文件**: `apps/user-app/src/storage/ApiStorageAdapter.ts`

- [x] 1.5.1 修改 `importWorkflow()` — `nodes` 字段从原始 workflow 读取，不是硬编码空数组
- [x] 1.5.2 确保 `connections`、`inputs`、`outputs`、`config` 全部正确传递
- [x] 1.5.3 测试：导入一个导出 JSON → 重新导出 → 节点数据完整

---

## Part 2: 性能优化（High）

> 修复 PrismNode 订阅导致的全局重渲染

---

### 2.1 移除 PrismNode 对 _currentNodeId 的订阅

**文件**: `apps/dev-tool/src/components/nodes/PrismNode.tsx`

- [x] 2.1.1 移除 `const currentNodeId = useCanvasStore((s) => s._currentNodeId)`
- [x] 2.1.2 移除 `const updateNodeParams = useCanvasStore((s) => s.updateNodeParams)` 的独立订阅
- [x] 2.1.3 使用 `useNode().data` 获取当前节点的执行状态
- [x] 2.1.4 `isRunning` 改为 `data._executingNodeId === nodeId`
- [x] 2.1.5 执行结果改为 `data.executionResult`

---

### 2.2 修改 canvasStore 执行状态更新方式

**文件**: `apps/dev-tool/src/store/canvasStore.ts`

- [x] 2.2.1 移除 `updateNodeParams` 的独立订阅模式（改为通过 React Flow data）
- [x] 2.2.2 `executeWorkflow` 中，将 `_currentNodeId` 改为在节点 `data` 对象中存储 `_executingNodeId`
- [x] 2.2.3 执行完成时，清除节点的 `_executingNodeId`，设置 `executionResult`

---

### 2.3 验证性能提升

- [x] 2.3.1 打开 DevTools Performance 面板
- [x] 2.3.2 执行一个工作流，记录重渲染次数
- [x] 2.3.3 确认只有执行中的节点重渲染，而非所有节点

---

## Part 3: 稳定性修复（Critical）

> 添加 Error Boundary，修复内存泄漏

---

### 3.1 创建 ErrorBoundary 组件

**文件**: `apps/dev-tool/src/components/common/ErrorBoundary.tsx`

- [x] 3.1.1 创建 `class ErrorBoundary` 组件
- [x] 3.1.2 实现 `getDerivedStateFromError` 和 `componentDidCatch`
- [x] 3.1.3 提供友好的错误 UI（错误消息 + Reload 按钮）
- [x] 3.1.4 可选：上报到监控服务

---

### 3.2 添加根级 Error Boundary

**文件**: `apps/dev-tool/src/App.tsx`

- [x] 3.2.1 导入 ErrorBoundary 组件
- [x] 3.2.2 在 `<App>` 根元素外包裹 `<ErrorBoundary>`
- [x] 3.2.3 验证：制造一个未捕获错误，确认显示 ErrorBoundary UI 而非白屏

**文件**: `apps/user-app/src/App.tsx`

- [x] 3.2.4 同上

---

### 3.3 修复 GroupNode 内存泄漏

**文件**: `apps/dev-tool/src/components/nodes/GroupNode.tsx`

- [x] 3.3.1 找到 `document.addEventListener('mousemove', handleMouseMove)`
- [x] 3.3.2 改为返回清理函数：`return () => { document.removeEventListener(...) }`
- [x] 3.3.3 确保 `handleMouseUp` 中也清理 `handleMouseMove`

---

### 3.4 修复 MigrationStorageAdapter 定时器泄漏

**文件**: `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`

- [x] 3.4.1 添加 `healthCheckTimer` 成员变量存储定时器 ID
- [x] 3.4.2 `init()` 开始时调用 `destroy()` 清理旧定时器
- [x] 3.4.3 添加 `destroy()` 方法清理定时器
- [x] 3.4.4 确保所有消费者在适当时机调用 `destroy()`

---

### 3.5 修复 setTimeout 未清理问题

**文件**: `apps/user-app/src/pages/WorkflowListPage.tsx`

- [x] 3.5.1 存储 `setTimeout` 返回的 timer ID
- [x] 3.5.2 `useEffect` 返回清理函数调用 `clearTimeout`

**文件**: `apps/dev-tool/src/components/header/WorkflowHeader.tsx`

- [x] 3.5.3 同上

**文件**: `apps/dev-tool/src/components/canvas/WorkflowCanvas.tsx`

- [x] 3.5.4 同上

---

## Part 4: API 层修复（High）

> 统一错误处理，添加验证

---

### 4.1 添加全局错误处理器

**文件**: `server/src/app.ts`

- [x] 4.1.1 创建 `safePrisma` 封装函数
- [x] 4.1.2 设置 `app.setErrorHandler` 处理 Zod 验证错误
- [x] 4.1.3 处理 Prisma 错误（P2002 → 409，P2025 → 404）
- [x] 4.1.4 处理其他未知错误（500 + 日志）

---

### 4.2 修复 workflow.ts 路由

**文件**: `server/src/routes/workflow.ts`

- [x] 4.2.1 所有 Prisma 操作包裹在 try/catch 中
- [x] 4.2.2 `content` 字段添加最大长度验证（1MB）
- [x] 4.2.3 导出文件名添加转义（处理特殊字符）
- [x] 4.2.4 `version` 字段添加 semver 格式验证（可选）

---

### 4.3 修复 published.ts 路由

**文件**: `server/src/routes/published.ts`

- [x] 4.3.1 所有 Prisma 操作包裹在 try/catch 中
- [x] 4.3.2 `content` 字段添加最大长度验证（1MB）
- [x] 4.3.3 确保 PublishWorkflowSchema 包含 `content` 字段

---

## Part 5: 存储层修复（Medium）

> 修复 localStorage 迁移、缓存驱逐、双写失败

---

### 5.1 修复 localStorage 迁移逻辑

**文件**: `apps/dev-tool/src/storage/LocalStorageAdapter.ts`

- [x] 5.1.1 迁移前检查新格式键是否已存在
- [x] 5.1.2 已存在则跳过，不覆盖
- [x] 5.1.3 添加迁移日志（哪些被跳过）

---

### 5.2 修复 MigrationStorageAdapter 双写失败

**文件**: `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`

- [x] 5.2.1 API 成功但 localStorage 失败时，抛出错误（不静默成功）
- [x] 5.2.2 错误消息包含两个来源的具体错误信息
- [x] 5.2.3 确保错误被正确传播，不被吞掉

---

### 5.3 添加 nodeCache 驱逐策略

**文件**: `apps/user-app/src/storage/nodeCache.ts`

- [x] 5.3.1 添加缓存大小限制（最多 50 条）
- [x] 5.3.2 LRU 驱逐：访问时更新 `loadedAt`，驱逐时移除最老的
- [x] 5.3.3 清理过期的缓存条目（不仅是标记，还要从 Map 删除）
- [x] 5.3.4 添加缓存统计（hit/miss）用于调试

---

### 5.4 修复错误消息丢失

**文件**: `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`

- [x] 5.4.1 捕获 `localStorageAdapter.load` 的错误时，保留原始错误信息
- [x] 5.4.2 抛出新错误时包含原始错误的 `message` 和 `stack`

---

## Part 6: 类型转换器修复（High）

> 修复异步类型转换静默失败

---

### 6.1 修复 type-validator.ts

**文件**: `packages/workflow-core/src/type-validator.ts`

- [x] 6.1.1 移除对 `Promise` 返回值的静默处理
- [x] 6.1.2 改为抛出明确错误：`'Async type converters are not supported'`
- [x] 6.1.3 添加注释说明为什么不支持异步转换
- [x] 6.1.4 如果确实需要异步支持，改为 `await converted` 并更新 executor 为 async

---

### 6.2 验证修复

- [x] 6.2.1 创建一个会产生异步转换的场景
- [x] 6.2.2 确认抛出明确错误而非静默传递错误数据

---

## Part 7: 其他 Medium 优先级修复

---

### 7.1 修复 WorkflowsView handleOpen 错误处理

**文件**: `apps/dev-tool/src/components/WorkflowsView.tsx`

- [x] 7.1.1 `handleOpen` 中的 catch 块应该显示错误消息，不静默
- [x] 7.1.2 可以用 toast 或 alert 显示加载失败

---

### 7.2 修复 canvasStore 竞态条件

**文件**: `apps/dev-tool/src/store/canvasStore.ts`

- [x] 7.2.1 `scheduleAutoSave` 保存时记录当前 workflowId
- [x] 7.2.2 保存完成时检查 workflowId 是否变化，变化则丢弃结果
- [x] 7.2.3 `loadWorkflowFromStore` 添加 try/catch 和 loading 状态

---

### 7.3 修复 canvasStore 执行错误处理

**文件**: `apps/dev-tool/src/store/canvasStore.ts`

- [x] 7.3.1 `executeWorkflow` 的 `globalRegistry.initialize()` 添加错误处理
- [x] 7.3.2 `globalRegistry.getExecutors()` 失败时设置 `_executionStatus: 'error'`
- [x] 7.3.3 动态 import 失败时同样处理

---

### 7.4 修复 v1 输入匹配 bug

**文件**: `packages/workflow-core/src/published-executor.ts`

- [x] 7.4.1 将 `startsWith` 改为精确匹配或前缀加 `:` 分隔符
- [x] 7.4.2 例如：`inp.id === `${nodeId}:${portId}`` 或 `inp.id.startsWith(`${nodeId}:`)`

---

## 验证清单

完成所有任务后，运行以下验证：

- [x] **数据流**：发布工作流 → User App 打开 → 显示正确的数据和输入字段
- [x] **Import 往返**：导出 → 导入 → 重新导出 → 数据完整
- [x] **性能**：执行工作流时，只有执行中的节点重渲染
- [x] **Error Boundary**：制造未捕获错误 → 显示友好错误 UI，不白屏
- [x] **内存泄漏**：打开/关闭工作流 50 次 → 无内存增长
- [x] **API 错误**：发送无效数据 → 返回正确错误消息
- [x] **类型转换**：异步转换器触发 → 抛出明确错误
