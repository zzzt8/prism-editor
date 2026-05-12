---
name: c6-ux-cleanup
change_class: low
change_profile: low
reason: "删除调试代码、补完 UI 功能桩，无业务逻辑变更"
---

## Task Anchor Echo

- **原始任务**: 修复 prism-editor 全部硬伤，分多步走
- **change 名称**: `c6-ux-cleanup`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] 这是收尾阶段，把 C1-C5 里没覆盖的零散问题修了

## Why

代码库里散落着调试用 `console.log`（用户隐私风险）、三个未完成的功能桩（版本历史/对比/回滚）点了都报错、Worker 超时时间写死了不可配置。

## What Changes

1. 删除所有 `console.log`（user-app 的 workflowCatalogStore、WorkflowRunPage、InputSection；dev-tool 全局确认无残留）
2. 三个未完成功能按钮从 UI 上隐藏或改为 alert 提示"开发中"
3. ~~Worker 超时可配置~~（已移至 C3 T7）

## Capabilities

### Modified Capabilities

- **User-App Console**: 浏览器控制台无调试输出
- **Version Features**: 未实现功能不再展示

## Impact

- apps/user-app/src/modules/catalog/workflowCatalogStore.ts
- apps/user-app/src/pages/WorkflowRunPage.tsx
- apps/user-app/src/components/InputSection/index.tsx
- apps/dev-tool/src/App.tsx
- packages/image-ops/src/scheduler/workerPool.ts（MAX_ATTEMPTS 可配置已移至 C3 T7）

## Out of Scope

- `console.warn` / `console.error`（这些是有效的错误输出，保留）
- 完整的版本历史/对比/回滚实现（属于未来功能）
- MAX_ATTEMPTS 可配置（已移至 C3）
