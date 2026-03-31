## ADDED Requirements

### Requirement: 重复文件清理
项目 SHALL 删除所有因 Windows 路径大小写不敏感导致的重复文件。

#### Scenario: 删除 dev-tool 组件重复文件
- **WHEN** 存在 `apps\dev-tool\src\components\` 下与 `apps/dev-tool/src/components/` 同名的未追踪文件
- **THEN** 对比两版本内容，若相同则删除反斜杠路径版本；若不同则保留正斜杠路径版本（git staged 版本），并删除反斜杠路径版本

#### Scenario: 删除 ui desgin 目录
- **WHEN** 项目根目录存在名为 `ui desgin/` 的目录（注意空格和拼写）
- **THEN** 删除该目录及其所有内容

#### Scenario: 删除 image-ops 错误位置测试文件
- **WHEN** `packages/image-ops/src/test-setup.ts` 存在
- **THEN** 删除该文件及其对应的 dist 输出文件
- **AND** 确认 Vitest 配置已从正确路径读取 test setup

### Requirement: OpenSpec 归档冲突解决
项目 SHALL 删除与活跃变更冲突的 OpenSpec 归档目录。

#### Scenario: 删除 comfyui-refactor 归档
- **WHEN** 活跃目录 `openspec/changes/node-editor-comfyui-refactor/` 已存在
- **THEN** 删除 `openspec/changes/archive/2026-03-31-node-editor-comfyui-refactor/` 目录

#### Scenario: 删除 publish-dialog-refactor 归档
- **WHEN** 活跃目录 `openspec/changes/publish-dialog-refactor/` 已存在
- **THEN** 删除 `openspec/changes/archive/2026-03-31-publish-dialog-refactor/` 目录

#### Scenario: 统一归档目录结构
- **WHEN** 归档目录中存在 `specs/` 子目录层级
- **THEN** 将所有归档平铺到 `archive/` 根目录下，移除多余的 `specs/` 嵌套

### Requirement: shared-types stores 迁移
项目 SHALL 将 Zustand store 从 shared-types 迁移到 dev-tool。

#### Scenario: 迁移 canvasStore
- **WHEN** `packages/shared-types/src/stores/canvasStore.ts` 存在
- **THEN** 将其复制到 `apps/dev-tool/src/store/canvasStore.ts`
- **AND** 更新所有从 `@prism/shared-types` import canvasStore 的文件
- **AND** 从 shared-types 删除原文件

#### Scenario: 迁移 workflowStore
- **WHEN** `packages/shared-types/src/stores/workflowStore.ts` 存在
- **THEN** 将其复制到 `apps/dev-tool/src/store/workflowStore.ts`
- **AND** 更新所有从 `@prism/shared-types` import workflowStore 的文件
- **AND** 从 shared-types 删除原文件

#### Scenario: 迁移 executionStore
- **WHEN** `packages/shared-types/src/stores/executionStore.ts` 存在
- **THEN** 将其复制到 `apps/dev-tool/src/store/executionStore.ts`
- **AND** 更新所有从 `@prism/shared-types` import executionStore 的文件
- **AND** 从 shared-types 删除原文件

#### Scenario: 更新 shared-types 导出
- **WHEN** `packages/shared-types/src/index.ts` 导出了 stores
- **THEN** 从 index.ts 中移除所有 store 的 export 语句

### Requirement: 大文件拆分
项目 SHALL 拆分过大的单一文件以提升可维护性。

#### Scenario: 拆分 PrismNode.tsx
- **WHEN** `apps/dev-tool/src/components/nodes/PrismNode.tsx` 超过 800 行
- **THEN** 将其拆分为 `PrismNodeHeader.tsx`、`PrismNodePorts.tsx`、`PrismNodeControls.tsx`
- **AND** `PrismNode.tsx` 仅作为组合层，负责组装子组件

#### Scenario: 拆分 executors.ts
- **WHEN** `packages/image-ops/src/executors.ts` 包含所有节点类型的 executor 实现
- **THEN** 将每个 executor 实现移入其对应节点的文件中（如 `load-image.ts`、`composite.ts`）
- **AND** `executors.ts` 改为 re-export 聚合文件

#### Scenario: 拆分 WorkflowCanvas.tsx
- **WHEN** `apps/dev-tool/src/components/canvas/WorkflowCanvas.tsx` 超过 800 行
- **THEN** 按关注点（如节点拖拽、边连接、工具栏、预览）拆分为子组件
