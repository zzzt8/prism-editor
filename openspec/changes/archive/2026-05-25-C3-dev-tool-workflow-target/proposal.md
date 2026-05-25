# proposal: dev-tool-workflow-target

**change_class: medium**

reason: 改造 `NewWorkflowModal` 添加平台选择 Radio，以及在 workflow metadata 中记录 `targetPlatform`，涉及 UI 层改动但不改变核心数据流。

---

## Why

用户选择"新建前端工作流"或"新建后端工作流"，这个选择需要持久化到 workflow metadata 中，后续编辑器只展示对应平台的节点。

---

## What Changes

1. `apps/dev-tool/src/components/NewWorkflowModal.tsx` 增加 Radio 选择：Frontend Preview Workflow / Backend Production Workflow
2. `packages/shared-types/src/workflow.ts` 的 `WorkflowMetadata` 在 Change 2 已新增 `targetPlatform`，此处使用
3. IndexedDB storage adapter 的 `createWorkflow` 调用传入 `targetPlatform`
4. 节点面板（NodePalette）在编辑器加载时，根据 `targetPlatform` 过滤节点

---

## Capabilities

- 新建工作流时明确选择执行平台
- 编辑器节点面板只展示目标平台支持的节点
- 后端工作流编辑器不展示纯浏览器节点（如文件选择类节点）

---

## Impact

| layer | 影响 |
|-------|------|
| `apps/dev-tool` | NewWorkflowModal 改造；NodePalette 按平台过滤 |
| `packages/shared-types` | 仅使用已添加的 `WorkflowMetadata.targetPlatform` |
| `packages/node-definitions` | 无改动 |

---

## Out of Scope

- 后端 executor 实现（Change 4）
- SKU 模型（Change 5）
- 生产渲染接口（Change 6）
