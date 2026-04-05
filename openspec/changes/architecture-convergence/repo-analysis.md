# Repo Analysis: 架构收敛全局分析

> 本分析由 meta-change `architecture-convergence` 生成。
> 所有子 change 共享本分析结论，请在派生子 change 时引用本文件。
> 不要在子 change 中重复扫描以下模块。

## 1. 全局模块状态总览

| 模块 | Layer | 职责 | 当前状态 | 问题 |
|------|-------|------|---------|------|
| `packages/workflow-core/` | engine | 执行引擎、拓扑排序、类型校验、缓存 | **稳定**，核心护城河 | none |
| `packages/image-ops/` | engine | Canvas 图像操作、主线程/Worker | **可用**，轻 worker 范式 | 重图像流会吃性能 |
| `packages/node-definitions/` | engine | 节点元数据、输入输出、参数 | **稳定** | none |
| `packages/core/` | engine | globalRegistry 单例、inline executor | **可用** | global singleton 污染风险 |
| `packages/shared-types/` | cross | 类型与 DTO 契约 | **可用** | 无 |
| `packages/shared-ui/` | ui-skin | 设计系统、共享组件 | **可用** | 无 |
| `apps/dev-tool/` | editor | 画布编辑、workflow 管理 | **膨胀中** | canvasStore 耦合重、存储边界分裂 |
| `apps/user-app/` | runtime | 加载发布物、节点包、执行 | **膨胀中** | publishedStore 职责耦合 |
| `server/` | backend | Fastify + Prisma/SQLite CRUD + 认证 | **可用** | content 存 JSON 字符串、PublishedWorkflow 协议未统一 |

## 2. 高耦合区域分析

### 2.1 canvasStore.ts（1073 行）— 最高耦合点

**职责一览**：
- 画布状态（nodes, edges, groups, selectedNodeIds, viewport）
- 自动保存（scheduleAutoSave / cancelAutoSave / _triggerAutoSave）
- 导入导出（exportWorkflowAsJson / importWorkflowFromFile）
- 执行（executeWorkflow / cancelExecution / clearExecution）
- 动态端口（addExtraInput / removeExtraInput）
- Draft 元数据（workflowMeta / isDirty / renameWorkflow / newWorkflow）
- 剪贴板（clipboard / copyNodes / cutNodes / pasteNodes）
- 上下文菜单（contextMenu / setContextMenu）
- Group 操作（addGroup / removeGroup / updateGroup / moveGroup）

**映射逻辑散在**：
- `toWorkflow()` — canvas → Workflow
- `loadWorkflow()` — Workflow → canvas
- `saveWorkflow()` — canvas → StorageAdapter
- `_triggerAutoSave()` — 内联拼 Workflow 对象
- `executeWorkflow()` — 内联拼 Workflow 对象

**结论**：这个 store 不是"store"，而是"编辑器总控器"。拆分成 slices 后，映射逻辑应抽出成独立 mapper 文件。

### 2.2 publishedStore.ts（263 行）— 次高耦合点

**职责一览**：
- Workflow 列表加载（loadWorkflows）
- Workflow 选择（selectWorkflow）
- 运行态管理（runState）
- 节点包加载（loadRequiredNodes / importRequiredNode）
- inline executor 解析（parseInlineExecutor）
- URL executor 代理（fetch(url, { method: 'POST' })）
- 错误收集（nodeLoadErrors）

**结论**：拆成 catalog / selection / node-runtime / runner 四个 store 后，节点包加载应独立为 `nodePackageLoader.ts` service。

### 2.3 存储边界分裂

**现状**：
- `apps/dev-tool/src/storage/index.ts`：导出 `activeStorageAdapter`，根据 `VITE_STRICT_API` 环境变量选 IndexedDB 或 ApiStorageAdapter
- `apps/dev-tool/src/store/workflowStore.ts`：直接引用 `indexedDBStorageAdapter`
- `apps/user-app/src/storage/index.ts`：只导出 `userAppStorage = new IndexedDBStorageAdapter()`，无 API 路径
- `server/src/routes/published.ts`：接收 `input.content` 字符串存储，content 内含完整 PublishedWorkflow JSON

**问题**：storage adapter 语义在 dev-tool 和 user-app 不一致；前端仍在 localStorage/IndexedDB 阶段，服务端 migration 尚未彻底完成。

### 2.4 版本号漂移

**现状**：
- `saveWorkflow()` 里计算 `newVersion = major.minor+1.0`
- 但实际保存的 `workflow.version` 写入旧 `workflowMeta.version`
- 保存完成后才更新 `workflowMeta.version = newVersion`
- 服务端 `WorkflowVersion` 模型已存在但未被前端使用

**问题**：保存时"算出版本"和"写入版本"分离，版本历史无法追溯正确快照。

### 2.5 PublishedWorkflowExecutor 协议演化

**现状**（published-executor.ts）：
- 检查 `config.nodeTypes` 是否为空，空则抛 `PublishedWorkflowExecutorVersionError`
- 兼容 legacy `pw.inputs[].id` 格式（`{nodeId}:{portId}`）
- 兼容 v2 `config.inputs[].nodeId` 格式
- `nodeTypes` / `nodeConfigs` 用 canvas nodeId UUID 做 key
- `connections` from/to 已用 canvas nodeId，无需重映射

**问题**：同时兼容两套格式说明协议未稳定，需要声明 V2 为唯一写入格式。

## 3. 核心依赖链

```
packages/shared-types/ (类型契约)
  ↓
packages/workflow-core/ → packages/core/ → packages/image-ops/
  ↓
apps/dev-tool/ (编辑态)     apps/user-app/ (运行态)
  ↓                               ↓
storage/IndexedDBStorageAdapter   storage/IndexedDBStorageAdapter
  ↓                               ↓
server/prisma/ (Workflow/WorkflowVersion/PublishedWorkflow)
```

**关键依赖**：
- `canvasStore.ts` → `globalRegistry` → `node-definitions`
- `publishedStore.ts` → `globalRegistry` → `node-definitions`
- `canvasStore.ts` → `activeStorageAdapter`
- `userAppStorage` → `IndexedDBStorageAdapter`
- `server/prisma/` → `WorkflowVersion` 模型已存在

## 4. 跨层联动点

| 联动点 | Layer 组合 | 说明 |
|--------|-----------|------|
| Workflow ↔ PublishedWorkflow | editor ↔ backend | buildPublishedConfig 从 canvas 拼 PublishedWorkflow JSON，存入 server |
| PublishedWorkflow ↔ runtime | backend ↔ runtime | PublishedWorkflowExecutor.reconstruct() 从 JSON 重建 Workflow |
| nodeTypes / nodeConfigs | editor ↔ runtime | canvas nodeId UUID 作为 stable key，两端共用 |
| requiredNodes / nodePackage | runtime ↔ engine | user-app 加载节点包，注册到 globalRegistry |
| version 生成 | editor ↔ backend | 前端 saveWorkflow() 生成 version，服务端 WorkflowVersion 表存储快照 |

## 5. 全局约束

1. **server schema 必须在 app 之前稳定**：跨层协议改动需要 architecture-review + test-plan
2. **canvasStore.ts 拆分后才能统一保存/发布流**：否则映射逻辑会继续散在 store 中
3. **Repository 层先于 API adapter 引入**：否则 storage adapter 迁移会破坏现有功能
4. **PublishedWorkflow V2 协议必须先声明**：runtime 兼容逻辑才可收敛
5. **版本号生成必须归服务端**：前端自增会导致版本历史错乱

## 6. 识别的高风险区域

| 区域 | 风险类型 | 说明 |
|------|---------|------|
| canvasStore.ts → mapper 迁移 | 映射回归 | "能编辑、不能发布"或"能发布、不能运行" |
| 版本号生成迁移 | 版本漂移 | diff 和 rollback 解释困难 |
| 存储边界统一 | 功能回归 | activeStorageAdapter 切换导致数据丢失 |
| 节点包安全 | 安全风险 | inline executor 解析 + URL executor 代理无沙箱隔离 |
| global singleton | 测试隔离 | 跨测试用例状态残留 |

## 7. 推荐的 golden fixtures

重构前后应验证以下场景的 round-trip：

1. 空画布 → save → load → 仍是空画布
2. 单节点（load-image） → save → load → 节点数量/类型不变
3. 两节点 + 一条边 → save → load → 边连通性保持
4. 带 extraInputs 的节点 → save → load → extraInputs 保留
5. 导出 PublishedWorkflow → PublishedWorkflowExecutor.reconstruct() → 执行成功
6. 旧格式 PublishedWorkflow（无 nodeTypes）→ 抛 PublishedWorkflowExecutorVersionError
7. 节点包加载 → register 到 globalRegistry → 节点可执行
8. 复制粘贴节点 → 边连通性保持，ID 唯一
9. Group 操作 → save → load → group 和子节点位置保持
10. 版本号递增 → save 两次 → 两次 version 不同