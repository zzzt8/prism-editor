# tasks: dev-tool-workflow-target

- [ ] **Task 1: NewWorkflowModal 增加 Frontend/Backend Radio**
  - 在 `apps/dev-tool/src/components/NewWorkflowModal.tsx` 增加平台选择 Radio
  - 选项："Frontend Preview Workflow" / "Backend Production Workflow"
  - 默认选择 Frontend
  - 验收：`npm run typecheck --workspace=@prism/dev-tool`

- [ ] **Task 2: createWorkflow 调用传入 targetPlatform**
  - 在 `apps/dev-tool/src/storage/` 的 indexedDB storage adapter 的 `createWorkflow` 方法增加 `targetPlatform` 参数
  - 将 `targetPlatform` 写入 workflow metadata
  - 验收：`npm run typecheck --workspace=@prism/dev-tool`

- [ ] **Task 3: NodePalette 按 targetPlatform 过滤节点**
  - 在 `apps/dev-tool/src/` 的 NodePalette 组件读取当前 workflow 的 `targetPlatform`
  - 使用 `listByPlatform`（Change 2）过滤可用节点
  - 验收：`npm run typecheck --workspace=@prism/dev-tool`

- [ ] **Task 4: 完整 typecheck 验证**
  - 验收：`npm run typecheck --workspace=@prism/dev-tool && npm run typecheck --workspace=@prism/workflow-core`

- [ ] **Task 5: dev-tool 冒烟测试**
  - 新建 Frontend Workflow：确认节点面板只展示 browser 节点
  - 新建 Backend Workflow：确认节点面板展示 both + nodejs 节点
  - 验收：手动验证，composite 节点在两种模式下均可用
