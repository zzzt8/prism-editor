# Design: 架构收敛拆分原则

> 本设计由 meta-change `architecture-convergence` 生成。

## 1. 拆分维度

| 维度 | 触发条件 | 示例 |
|------|---------|------|
| **按 layer** | 改动分布在不同 app/package | dev-tool 改动 vs user-app 改动 |
| **按协议** | 涉及跨系统的接口/协议变更 | PublishedWorkflow 协议单独成 change |
| **按依赖链** | A 改动是 B 改动的前置 | C1 先定义 mapper，C2 才能拆分 store |
| **按风险** | 某部分改动风险极高需隔离 | 节点安全沙箱单独成 change |
| **按原子性** | 可独立验证的最小单元 | 一个 mapper 的完整实现（定义+测试） |

## 2. 允许跨层还是按 layer 切

**按 layer 切为主，跨 layer 协议改动单独成 change**。

原则：
- `engine` 层（packages/*）的改动是基础，先完成
- `backend` 层（server/）紧跟其后，为 app 层提供 API
- `editor` 层（apps/dev-tool/）和 `runtime` 层（apps/user-app/）可并行，但各自内部有依赖
- `ui-skin` 层（packages/shared-ui/）最后，最独立

跨 layer 规则：
- 若改动涉及 `editor` + `backend`（如保存/发布契约），归为"协议 change"，需 architecture-review
- 若改动涉及 `engine` + `editor`（如 mapper 依赖 engine 类型），归为"engine change"，先做

## 3. 协议一致性保证

### 3.1 EditorDraft / StoredWorkflow / PublishedWorkflowV2 三个唯一真源

```
EditorDraft        = 画布编辑态（nodes/edges/viewport/draftMeta/isDirty）
StoredWorkflow     = 保存态（Workflow JSON，存 IndexedDB/API）
PublishedWorkflowV2 = 发布态（config.nodeTypes/config.inputs/config.outputs）
```

映射关系：
- `canvasToWorkflow.ts` — EditorDraft → StoredWorkflow
- `workflowToCanvas.ts` — StoredWorkflow → EditorDraft
- `workflowToPublished.ts` — StoredWorkflow → PublishedWorkflowV2
- `publishedToWorkflow.ts` — PublishedWorkflowV2 → StoredWorkflow（runtime 重建）

**禁止**：在 store action 中内联拼装 JSON。所有映射走 mapper。

### 3.2 存储层抽象

```
App Layer (canvasStore / publishedStore)
  ↓ (只调 Repository 接口)
Repository Layer (workflowRepository / publishRepository / versionRepository)
  ↓ (内部仍包旧 adapter)
Adapter Layer (IndexedDBStorageAdapter / ApiStorageAdapter)
```

Repository 接口按域划分：
- `IWorkflowRepository` — CRUD 操作
- `IPublishRepository` — 发布/取消发布
- `IVersionRepository` — 版本快照创建/读取/回滚

Phase 1 内部仍用旧 adapter，实现无行为改变迁移。Phase 2 切 API 时只需换 adapter。

### 3.3 版本号生成规则

- **前端只提交**：`workflow content + baseRevision`
- **服务端生成**：`WorkflowVersion.version`（语义化版本）
- **发布时固定引用**：PublishedWorkflow 引用某个 WorkflowVersion.id
- **diff / rollback 以服务端为准**：前端不再计算版本号

## 4. 全局约束

### 4.1 Phase 执行约束

| Phase | 约束 |
|-------|------|
| Phase 0 | 必须先完成契约定义，否则后续所有 change 都会因映射不一致回归 |
| Phase 1 | Repository 层必须覆盖所有现有 storage 调用，否则切换时会丢失数据 |
| Phase 2 | canvasStore slices 之间的 state 传递必须通过组合器，不直接跨 slice 访问 |
| Phase 3 | 服务端 WorkflowVersion 生成逻辑必须先于前端版本号移除，否则会空写 |
| Phase 4 | PublishedWorkflow V2 必须先声明为唯一写入格式，否则 legacy 兼容无法移除 |
| Phase 5 | nodePackageLoader 必须先从 store 拆出，否则安全边界无法独立验证 |
| Phase 6 | 执行入口统一后才能做 Worker 化，否则 lane 切换会导致状态丢失 |

### 4.2 禁止事项

- **禁止**在 store action 中直接拼�� Workflow JSON（必须走 mapper）
- **禁止**在 canvasStore 或 publishedStore 中直接调用 IndexedDB/API adapter（必须走 repository）
- **禁止**前端自增版本号（必须由服务端生成）
- **禁止**在 PublishedWorkflow 中写入 legacy 格式（必须写 V2）
- **禁止**在 globalRegistry 外直接修改节点注册表

## 5. 依赖优先级矩阵

```
P0 (必须先做):
  - C1: mapper 契约定义（依赖 shared-types）
  - C2: Repository 层（依赖 C1 定义的接口）
  - C3: canvasStore slices（依赖 C1 的 mapper）

P1 (重要但不阻塞):
  - C4: PublishedWorkflow V2 协议（依赖 shared-types + C1）
  - C5: user-app store 拆分（依赖 C4）
  - C6: 版本号归服务端（依赖 server + C2）

P2 (可延后):
  - C7: 节点包安全（依赖 C5）
  - C8: Worker 化（依赖 C3 + C6）
  - C9: 文档清理（无依赖）
```

## 6. 验证策略

### 6.1 按 layer 增量验证

```bash
# Phase 0/1: mapper + repository（engine layer 先验证）
pnpm typecheck --filter=@prism/shared-types
pnpm test --filter=@prism/workflow-core

# Phase 2: canvasStore 拆分（editor layer）
pnpm typecheck --filter=@prism/dev-tool
pnpm build --filter=@prism/dev-tool

# Phase 3: 版本号归服务端（backend layer）
pnpm typecheck --filter=@prism/server
pnpm test --filter=@prism/server

# Phase 4: V2 协议（engine layer 重新验证）
pnpm test --filter=@prism/workflow-core

# Phase 5: 节点安全（runtime layer）
pnpm test --filter=@prism/user-app

# Phase 6: Worker（按文件增量）
# 只改 image-ops/src/ 时：
pnpm test --filter=@prism/image-ops
```

### 6.2 Golden fixtures 验证

每次重大 change 完成后，必须运行以下 round-trip 测试：

| # | 场景 | 验证点 |
|---|------|-------|
| 1 | 空画布 → save → load | 仍是空画布 |
| 2 | 单节点 → save → load | 节点数量/类型不变 |
| 3 | 两节点+边 → save → load | 边连通性保持 |
| 4 | 带 extraInputs → save → load | extraInputs 保留 |
| 5 | PublishedWorkflow → reconstruct → execute | 执行成功 |
| 6 | 旧格式（无 nodeTypes）→ 抛 VersionError | 正确错误类型 |
| 7 | 节点包加载 → register → 可执行 | 节点在 globalRegistry |
| 8 | 复制粘贴 → 边连通，ID 唯一 | ID 无冲突 |
| 9 | Group → save → load | group 和子节点位置保持 |
| 10 | 版本号递增 → save 两次 | 两次 version 不同 |

### 6.3 回归检测

每次 change 后检查：
- dev-tool 能正常打开/保存/发布工作流
- user-app 能正常加载/运行发布的工作流
- 旧版 PublishedWorkflow 仍能（只读）运行
- 文档与实际实现一致

## 7. 文件结构约束

### 7.1 mapper 位置

```
apps/dev-tool/src/
  modules/
    editor/
      mappers/
        canvasToWorkflow.ts    # EditorDraft → Workflow
        workflowToCanvas.ts    # Workflow → EditorDraft
        workflowToPublished.ts # Workflow → PublishedWorkflowV2
    persistence/
      mappers/
        publishedToWorkflow.ts # PublishedWorkflowV2 → Workflow (runtime)
```

### 7.2 repository 位置

```
apps/dev-tool/src/
  modules/
    repositories/
      workflowRepository.ts
      versionRepository.ts
      publishRepository.ts

apps/user-app/src/
  modules/
    repositories/
      publishedWorkflowRepository.ts
      nodePackageRepository.ts
```

### 7.3 store slices 位置

```
apps/dev-tool/src/
  modules/
    editor/
      stores/
        graphSlice.ts         # nodes / edges / groups / dynamic ports
        selectionSlice.ts     # selectedNodeIds / selectedEdgeIds / contextMenu
        inspectorSlice.ts     # inspectorTab / node panel UI state
        draftSlice.ts         # workflowMeta / isDirty / rename / new workflow
        executionSlice.ts     # executionStatus / progress / node results
      services/
        autosaveService.ts
        importExportService.ts
        executionService.ts

apps/user-app/src/
  modules/
    catalog/
      workflowCatalogStore.ts
    selection/
      selectedWorkflowStore.ts
    node-runtime/
      nodePackageLoader.ts
      runtimeRegistry.ts
    runner/
      runStore.ts
      runWorkflow.ts
```

## 8. 异常处理

| 场景 | 处理策略 |
|------|---------|
| mapper 导出 undefined | mapper 内部抛 TypeError，不在 store 中隐式处理 |
| repository 调用失败 | 捕获后 set({ error: ... })，不吐到 UI 顶层 |
| PublishedWorkflow V1 写入 | 禁止，publish 入口统一检查 config.nodeTypes 是否存在 |
| globalRegistry 冲突注册 | warn + skip，不覆盖已有定义 |
| 版本号冲突 | 服务端事务回滚，前端显示 error |