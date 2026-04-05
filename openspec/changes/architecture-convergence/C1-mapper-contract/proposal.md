# C1: Mapper 契约定义

> 派生自 meta-change: `architecture-convergence`

## Why

映射逻辑现在散在 `canvasStore.ts` 各 action 中（`toWorkflow` / `loadWorkflow` / `_triggerAutoSave` / `executeWorkflow` / `saveWorkflow`），无法独立测试，且易出现"能编辑、不能发布"回归。必须先定义 mapper 契约，后续 store 拆分才有依据。

## What Changes

定义 EditorDraft / StoredWorkflow / PublishedWorkflowV2 三个唯一真源及其双向映射：

- **EditorDraft**：画布编辑态（nodes/edges/viewport/draftMeta/isDirty）
- **StoredWorkflow**：保存态（Workflow JSON，存 IndexedDB/API）
- **PublishedWorkflowV2**：发布态（config.nodeTypes/config.inputs/config.outputs）

## Impact Summary

| Layer | 文件 | 影响 |
|-------|------|------|
| editor | `apps/dev-tool/src/modules/editor/mappers/` | 新增目录，3 个 mapper 文件 |
| engine | `packages/shared-types/src/` | 可能需补充 EditorDraft 类型 |

**约束**：所有映射走 mapper，禁止在 store action 中内联拼装 JSON。
