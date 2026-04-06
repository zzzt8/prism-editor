# Change Index

> 本 index 由 meta-change `architecture-convergence` 全局分析生成。
> 所有子 change 均派生自本 index，请勿单独定义不在本 index 中的 change。

## 拆分原则

- 按 Layer 优先级：engine > backend > editor > runtime > ui-skin
- 跨 Layer 的协议改动单独成 change
- 避免跨 change 的循环依赖
- P0 = 核心依赖 / 阻塞性改动；P1 = 重要但不阻塞；P2 = 可延后

---

## C1: Mapper 契约定义

- **goal**: 定义 EditorDraft / StoredWorkflow / PublishedWorkflowV2 三个唯一真源及其双向映射
- **layer**: engine, editor
- **depends_on**: none
- **priority**: P0
- **risk**: low
- **scope**: `apps/dev-tool/src/modules/editor/mappers/`, `packages/shared-types/src/`
- **reason**: 映射逻辑现在散在 canvasStore.ts 各 action 中（toWorkflow / loadWorkflow / _triggerAutoSave / executeWorkflow / saveWorkflow），无法独立测试，且易出现"能编辑、不能发布"回归。必须先定义 mapper 契约，后续 store 拆分才有依据。
- **blocked_by**: none
- **status**: planned

**文件清单**：
- `apps/dev-tool/src/modules/editor/mappers/canvasToWorkflow.ts` — EditorDraft → Workflow
- `apps/dev-tool/src/modules/editor/mappers/workflowToCanvas.ts` — Workflow → EditorDraft
- `apps/dev-tool/src/modules/editor/mappers/workflowToPublished.ts` — Workflow → PublishedWorkflowV2
- `apps/dev-tool/src/modules/persistence/mappers/publishedToWorkflow.ts` — PublishedWorkflowV2 → Workflow（runtime 重建）
- 测试文件（fixture round-trip）

---

## C2: Repository 层引入

- **goal**: 抽象存储层，所有 app 层只调 repository，repository 内部包 adapter
- **layer**: editor, backend
- **depends_on**: C1
- **priority**: P0
- **risk**: medium
- **scope**: `apps/dev-tool/src/modules/repositories/`, `apps/user-app/src/modules/repositories/`
- **reason**: dev-tool 和 user-app 的存储边界仍在分裂（dev-tool 用 activeStorageAdapter + VITE_STRICT_API 切换，user-app 只用 IndexedDBStorageAdapter）。引入 repository 层后，Phase 1 内部仍包旧 adapter，Phase 2 换 API adapter 时只需改 repository 实现，不用动 store。
- **blocked_by**: C1 未完成时，Repository 接口无法定义
- **status**: planned

**文件清单**：
- `apps/dev-tool/src/modules/repositories/workflowRepository.ts` — CRUD
- `apps/dev-tool/src/modules/repositories/versionRepository.ts` — 版本快照
- `apps/dev-tool/src/modules/repositories/publishRepository.ts` — 发布/取消发布
- `apps/user-app/src/modules/repositories/publishedWorkflowRepository.ts` — 发布列表/详情
- `apps/user-app/src/modules/repositories/nodePackageRepository.ts` — 节点包
- 更新 `apps/dev-tool/src/store/workflowStore.ts` — 改调 workflowRepository
- 更新 `apps/dev-tool/src/store/canvasStore.ts` — _triggerAutoSave / saveWorkflow / loadWorkflowFromStore 改调 repository

---

## C3: canvasStore.ts 拆分为 Zustand Slices

- **goal**: 把 1073 行的 canvasStore.ts 拆成 5 个 slice + 1 个组合器
- **layer**: editor
- **depends_on**: C1, C2
- **priority**: P0
- **risk**: high
- **scope**: `apps/dev-tool/src/modules/editor/stores/`
- **reason**: canvasStore.ts 同时承担画布状态、自动保存、导入导出、执行、动态端口、draft 元数据、剪贴板、上下文菜单、Group 操作——典型的"总控器"反模式。拆成 slice 后每个 slice 可独立测试，组合器只负责 wire 逻辑。
- **blocked_by**: C1 未完成时，mapper 无法从 store 中抽出；C2 未完成时，_triggerAutoSave / saveWorkflow 仍直接调 adapter
- **status**: planned

**文件清单**：
- `apps/dev-tool/src/modules/editor/stores/graphSlice.ts` — nodes / edges / groups / dynamic ports
- `apps/dev-tool/src/modules/editor/stores/selectionSlice.ts` — selectedNodeIds / selectedEdgeIds / clipboard / contextMenu
- `apps/dev-tool/src/modules/editor/stores/inspectorSlice.ts` — inspectorTab / node panel UI state
- `apps/dev-tool/src/modules/editor/stores/draftSlice.ts` — workflowMeta / isDirty / rename / new workflow
- `apps/dev-tool/src/modules/editor/stores/executionSlice.ts` — executionStatus / progress / node results / abort
- `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts` — 组合器，wire 所有 slice
- `apps/dev-tool/src/modules/editor/services/autosaveService.ts` — autoSave 逻辑（从 store 中抽出 timer 管理）
- `apps/dev-tool/src/modules/editor/services/importExportService.ts` — 导入导出（从 store 中抽出）
- `apps/dev-tool/src/modules/editor/services/executionService.ts` — 执行入口统一（从 store 中抽出）

**回滚风险**：改完 store 后，UI 组件（WorkflowCanvas、Inspector、NodePanel 等）的 store 订阅必须更新为使用新组合器或对应 slice。这是最大回归风险点，需要 golden fixtures 保护。

---

## C4: PublishedWorkflow V2 协议收紧

- **goal**: 宣布 V2 为唯一写入格式，runtime 保留 legacy 只读兼容，移除 PublishedWorkflowExecutor 中硬编码的版本错误
- **layer**: engine, backend
- **depends_on**: C1
- **priority**: P0
- **risk**: medium
- **scope**: `packages/shared-types/src/published.ts`, `packages/workflow-core/src/published-executor.ts`, `server/src/routes/published.ts`
- **reason**: PublishedWorkflowExecutor 同时兼容 legacy pw.inputs[] 和 v2 config.inputs[]，说明协议仍在演化。声明 V2 后，publish 入口统一写 V2，runtime 保留 legacy 读兼容但不写。这样每加一个运行时能力，不用再问"legacy 还是 v2"。
- **blocked_by**: none（可与 C1 并行，但需等 C1 定义的 mapper）
- **status**: planned

**文件清单**：
- 更新 `packages/shared-types/src/published.ts` — 添加 version 字段标记 V2
- 更新 `packages/workflow-core/src/published-executor.ts` — 移除 PublishedWorkflowExecutorVersionError 抛出逻辑（改为可选警告），保留 legacy 读兼容
- 更新 `server/src/routes/published.ts` — publish 入口检查 config.nodeTypes 存在
- 添加 migration script — 把旧 published 数据补齐 config.nodeTypes / nodeConfigs / connections / inputs

---

## C5: user-app store 拆分

- **goal**: 把 publishedStore.ts 拆成 catalog / selection / node-runtime / runner 四个 store
- **layer**: runtime
- **depends_on**: C4
- **priority**: P1
- **risk**: medium
- **scope**: `apps/user-app/src/modules/`
- **reason**: publishedStore.ts 混了 workflow 列表加载、详情选择、runState 管理、节点包下载/校验/缓存/注册、inline executor 解析、URL executor 代理。拆后每个 store 职责单一，节点包加载可独立做安全边界。
- **blocked_by**: C4 未完成时，节点包加载逻辑无法独立验证
- **status**: planned

**文件清单**：
- `apps/user-app/src/modules/catalog/workflowCatalogStore.ts` — 列表加载、排序
- `apps/user-app/src/modules/selection/selectedWorkflowStore.ts` — select / clear / 当前 workflow
- `apps/user-app/src/modules/node-runtime/nodePackageLoader.ts` — requiredNodes 加载、缓存、校验（独立 service）
- `apps/user-app/src/modules/node-runtime/runtimeRegistry.ts` — registry 组装
- `apps/user-app/src/modules/runner/runStore.ts` — runState
- `apps/user-app/src/modules/runner/runWorkflow.ts` — 执行入口
- 更新 `apps/user-app/src/App.tsx` — store 初始化

---

## C6: 版本号归服务端

- **goal**: 移除前端 saveWorkflow() 中的版本号自增逻辑，服务端生成 WorkflowVersion 快照
- **layer**: editor, backend
- **depends_on**: C2
- **priority**: P1
- **risk**: high
- **scope**: `apps/dev-tool/src/modules/editor/stores/draftSlice.ts`, `server/src/routes/versions.ts`, `server/src/routes/workflow.ts`
- **reason**: 现在 saveWorkflow() 里"算新版本"和"保存旧版本字段"分离，版本历史无法追溯正确快照。前端只提交 content + baseRevision，服务端生成 version，diff 和 rollback 以服务端为准。
- **blocked_by**: C2 未完成时，前端仍在调 adapter 而非 repository，无法统一版本号生成逻辑
- **status**: planned

**文件清单**：
- 更新 `apps/dev-tool/src/modules/editor/stores/draftSlice.ts` — save 时只传 content 和 baseRevision
- 更新 `server/src/routes/workflow.ts` — 创建/更新 workflow 时生成 WorkflowVersion
- 更新 `server/src/routes/versions.ts` — GET versions / rollback
- 移除 `apps/dev-tool/src/store/canvasStore.ts` 中 saveWorkflow() 里的 newVersion 计算逻辑
- 添加 server migration — 把现有 workflow 的 content 存入 WorkflowVersion

---

## C7: 节点包安全边界

- **goal**: 把节点包加载器从 store 中移出，加 manifest 白名单 / 版本签名 / worker 隔离 / source policy
- **layer**: runtime, engine
- **depends_on**: C5
- **priority**: P1
- **risk**: high
- **scope**: `apps/user-app/src/modules/node-runtime/`, `packages/core/src/`
- **reason**: 当前运行时已能 parseInlineExecutor、代理 URL executor，但无沙箱隔离。OpenSpec 把自定义节点视作生态核心，必须先上安全边界才能作为产品卖点。
- **blocked_by**: C5 未完成时，nodePackageLoader 未从 store 中拆出，无法独立加安全边界
- **status**: planned

**文件清单**：
- 更新 `apps/user-app/src/modules/node-runtime/nodePackageLoader.ts` — 加 manifest 校验、签名验证、worker 隔离
- 更新 `packages/core/src/executorUtils.ts` — sandbox eval for inline executor
- 添加 source policy 配置 — inline / url / package 的信任级别
- 添加白名单配置 — 允许的 URL 前缀 / package registry

---

## C8: Worker 化

- **goal**: 把 image-ops 中重的节点操作迁移到 Worker，支持 main-thread / worker 双 lane
- **layer**: engine
- **depends_on**: C3, C6
- **priority**: P2
- **risk**: medium
- **scope**: `packages/image-ops/src/`, `apps/dev-tool/src/modules/editor/services/executionService.ts`
- **reason**: 主线程图像处理会阻塞 UI。OpenSpec 已有 worker-scheduler 意识，image-ops 的 scheduler/index.ts 和 workerPool.ts 已存在，先统一执行入口，再让重的节点走 worker lane。
- **blocked_by**: C3 未完成时，executionService 未统一，Worker 化会导致 lane 切换状态丢失；C6 未完成时，版本号归服务端未确认，无法验证 Worker 内执行的版本对应
- **status**: planned

**文件清单**：
- 更新 `apps/dev-tool/src/modules/editor/services/executionService.ts` — 支持 main-thread / worker 两种 lane
- 更新 `packages/image-ops/src/scheduler/taskQueue.ts` — 与 executionService 对接
- 迁移 Transform / Composite / ApplyMask 节点到 worker
- 更新 `packages/image-ops/src/executors.ts` — worker executor 包装

---

## C9: 文档清理

- **goal**: 修复文档漂移（server/README PostgreSQL vs SQLite，README license 冲突）
- **layer**: ui-skin
- **depends_on**: none
- **priority**: P2
- **risk**: low
- **scope**: `README.md`, `server/README.md`
- **reason**: 文档影响外部对项目成熟度的判断。server/README 写 PostgreSQL 示例，实际是 SQLite；README 末尾同时出现 "Private. All rights reserved." 和 MIT license。这些不是核心架构问题，但会在重构时制造认知噪音。
- **blocked_by**: none
- **status**: planned

**文件清单**：
- 更新 `README.md` — 移除 license 冲突，写明 SQLite
- 更新 `server/README.md` — 修正 DATABASE_URL 示例为 SQLite 路径，补充 Prisma migration 说明

---

## Recommended Execution Order

### Phase 1: 基础设施（P0，必须先做）

1. **C1: Mapper 契约定义** — 定义 EditorDraft / StoredWorkflow / PublishedWorkflowV2 三个唯一���源
2. **C2: Repository 层** — 依赖 C1，抽象存储层

### Phase 2: 核心实���（P0/P1，可并行）

3. **C3: canvasStore.ts 拆分** — 依赖 C1、C2，拆分 5 slices + 组合器
4. **C4: PublishedWorkflow V2 协议** — 依赖 C1，宣布 V2 为唯一写入格式

### Phase 3: 界面落地（P1）

5. **C5: user-app store 拆分** — 依赖 C4
6. **C6: 版本号归服务端** — 依赖 C2

### Phase 4: 收尾（P2）

7. **C7: 节点包安全边界** — 依赖 C5
8. **C8: Worker 化** — 依赖 C3、C6
9. **C9: 文档清理** — 无依赖，随时可做

### 依赖关系图

```
C1 ──┬─ C2 ── C6 ── C8
     │              ↑
     └─ C3 ── C5 ──┘
          ↑
          └── C4
              ↑
              └── C7
                  
C9 (无依赖，随时可做)
```