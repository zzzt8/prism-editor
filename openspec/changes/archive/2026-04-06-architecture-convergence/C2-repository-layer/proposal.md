# C2: Repository 层引入

> 派生自 meta-change: `architecture-convergence`

## Why

dev-tool 和 user-app 的存储边界仍在分裂（dev-tool 用 activeStorageAdapter + VITE_STRICT_API 切换，user-app 只用 IndexedDBStorageAdapter）。引入 repository 层后，Phase 1 内部仍包旧 adapter，Phase 2 换 API adapter 时只需改 repository 实现，不用动 store。

## What Changes

按域划分 Repository 接口：
- **IWorkflowRepository**：CRUD 操作
- **IPublishRepository**：发布/取消发布
- **IVersionRepository**：版本快照创建/读取/回滚

dev-tool 和 user-app 所有 app 层只调 repository。

## Impact Summary

| Layer | 文件 | 影响 |
|-------|------|------|
| editor | `apps/dev-tool/src/modules/repositories/` | 新增目录，3 个 repository 文件 |
| runtime | `apps/user-app/src/modules/repositories/` | 新增目录，2 个 repository 文件 |
| editor | `apps/dev-tool/src/store/workflowStore.ts` | 改调 workflowRepository |
| editor | `apps/dev-tool/src/store/canvasStore.ts` | _triggerAutoSave / saveWorkflow / loadWorkflowFromStore 改调 repository |

**约束**：Phase 1 内部仍用旧 adapter，实现无行为改变迁移。
