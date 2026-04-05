# C6: 版本号归服务端

> 派生自 meta-change: `architecture-convergence`

## Why

现在 saveWorkflow() 里"算新版本"和"保存旧版本字段"分离，版本历史无法追溯正确快照。前端只提交 content + baseRevision，服务端生成 version，diff 和 rollback 以服务端为准。

## What Changes

- 移除前端 saveWorkflow() 中的版本号自增逻辑
- 服务端生成 WorkflowVersion 快照
- 前端只提交 content 和 baseRevision

## Impact Summary

| Layer | 文件 | 影响 |
|-------|------|------|
| editor | `apps/dev-tool/src/store/canvasStore.ts` | 移除 newVersion 计算 |
| backend | `server/src/routes/workflow.ts` | 版本生成逻辑 |
| backend | `server/src/routes/versions.ts` | GET versions / rollback |
