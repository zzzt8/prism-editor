# tasks: node-definition-platforms

- [x] **Task 1: shared-types 新增 `platforms` 字段到 `NodeDefinition`**
  - 在 `packages/shared-types/src/node.ts` 的 `NodeDefinition` 接口新增 `platforms?: ('browser' | 'nodejs' | 'both')[]`
  - 验收：`npm run typecheck --workspace=@prism/shared-types`

- [x] **Task 2: shared-types 新增 `targetPlatform` 到 `WorkflowMetadata`**
  - 在 `packages/shared-types/src/workflow.ts` 的 `WorkflowMetadata` 新增 `targetPlatform?: 'browser' | 'nodejs'`
  - 验收：`npm run typecheck --workspace=@prism/shared-types`

- [ ] **Task 3: registry 新增 `listByPlatform` 函数**
  - 在 `packages/node-definitions/src/registry.ts` 新增 `listByPlatform(registry, platform) → NodeDefinition[]`
  - 过滤逻辑：返回 `platforms` 包含 `both` 或包含目标平台的节点
  - 验收：`npm run typecheck --workspace=@prism/node-definitions`

- [ ] **Task 4: 所有现有节点添加 `platforms: ['browser']`**
  - 在 `packages/node-definitions/src/definitions.ts` 的 7 个节点定义全部添加 `platforms: ['browser']`
  - 验收：`npm run typecheck --workspace=@prism/node-definitions`

- [ ] **Task 5: 完整 typecheck 验证**
  - 运行所有相关 package 的 typecheck
  - 验收：`npm run typecheck --workspace=@prism/shared-types && npm run typecheck --workspace=@prism/node-definitions && npm run typecheck --workspace=@prism/workflow-core && npm run typecheck --workspace=@prism/dev-tool`
