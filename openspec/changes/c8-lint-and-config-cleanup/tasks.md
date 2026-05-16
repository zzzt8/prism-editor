## N. 质量合规性验收

> 本 change 涉及 editor layer 组件修复和质量工具配置，主要相关维度：N.4 交互完整性、N.5 安全与类型

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互
- [ ] N.4.2 错误文案可读性检查

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查（仅测试文件例外）

---

## 任务列表

### 1. meta layer 配置修复

- [x] T1.1: 修复 `tsconfig.json`，添加 `"jsx": "react-jsx"` 和 `"module": "ESNext"` 配置
  - 文件: `tsconfig.json`
  - 验证命令: `npx tsc --noEmit 2>&1 | findstr "TS17004 TS6142" | findstr /V "was resolved" | findstr /V "--jsx" | findstr /V "Cannot use"` — 应只输出非 JSX 的真实类型错误

- [x] T1.2: 删除 `.npmrc` 中的 pnpm-only 配置（`shamefully-hoist`、`auto-install-peers`）
  - 文件: `.npmrc`
  - 将 `"shamefully-hoist": true` 和 `"auto-install-peers": true` 删除，回归 pnpm 默认行为
  - 验证命令: `npm run typecheck 2>&1` — 无 npm warn about pnpm config

- [x] T1.3: 在 `eslint.config.js` 中添加 `react-hooks` 插件
  - 文件: `eslint.config.js`
  - 安装 `eslint-plugin-react-hooks` 并引入插件和 `react-hooks/exhaustive-deps` 规则
  - 验证命令: `npm run lint 2>&1 | findstr "react-hooks/exhaustive-deps"` — 不应再有 "Definition for rule" 错误

### 2. editor layer — 编译错误修复

- [x] T2.1: 修复 `NodePanel.tsx` 中的 `setInitError` 未定义问题
  - 文件: `apps/dev-tool/src/components/NodePanel.tsx`
  - 将第 125、129 行的 `setInitError(...)` 调用改为 `console.warn(...)`
  - 验证命令: `npx tsc --noEmit -p apps/dev-tool/tsconfig.json 2>&1` — 无 TS2304 错误

### 3. editor layer — 未使用变量清理

以下任务均需在 `apps/dev-tool/src/` 下执行，按文件清理，验证命令统一为 `npm run lint 2>&1`。

#### 3.1 TemplateCenter 模块

- [x] T3.1a: 清理 `TemplateFilter.tsx` 中未使用的 `category`、`tag` 参数
  - 文件: `apps/dev-tool/src/components/TemplateCenter/TemplateFilter.tsx`
  - 重命名为 `_category`、`_tag`

- [x] T3.1b: 清理 `TemplateList.tsx` 中未使用的 `id` 参数
  - 文件: `apps/dev-tool/src/components/TemplateCenter/TemplateList.tsx`
  - 重命名为 `_id`

- [x] T3.1c: 清理 `TemplateSearch.tsx` 中未使用的 `value` 参数
  - 文件: `apps/dev-tool/src/components/TemplateCenter/TemplateSearch.tsx`
  - 重命名为 `_value`

- [x] T3.1d: 清理 `TemplateVersionHistory.tsx` 中未使用的 `DiffFn`、`fromId`、`toId`
  - 文件: `apps/dev-tool/src/components/TemplateCenter/TemplateVersionHistory.tsx`
  - 重命名为 `_DiffFn`、`_fromId`、`_toId`

- [x] T3.1e: 清理 `TemplateCenter/index.tsx` 中未使用的 `id` 参数
  - 文件: `apps/dev-tool/src/components/TemplateCenter/index.tsx`
  - 重命名为 `_id`

#### 3.2 TemplateManager 模块

- [x] T3.2a: 清理 `CreateFromTemplate.tsx` 中未使用的 `t` 参数
  - 文件: `apps/dev-tool/src/components/TemplateManager/CreateFromTemplate.tsx`
  - 重命名为 `_t`

- [x] T3.2b: 清理 `TemplateList.tsx` 中未使用的 `id`、`onDelete` 参数
  - 文件: `apps/dev-tool/src/components/TemplateManager/TemplateList.tsx`
  - 重命名为 `_id`、`_onDelete`

- [x] T3.2c: 清理 `TemplateManager/index.tsx` 中未使用的 `t` 参数
  - 文件: `apps/dev-tool/src/components/TemplateManager/index.tsx`
  - 重命名为 `_t`

#### 3.3 VersionHistory 模块

- [x] T3.3a: 清理 `VersionDiff.tsx` 中未使用的 `onBack` 参数
  - 文件: `apps/dev-tool/src/components/VersionHistory/VersionDiff.tsx`
  - 重命名为 `_onBack`

- [x] T3.3b: 清理 `VersionList.tsx` 中未使用的 `versionId`、`version`、`page` 参数
  - 文件: `apps/dev-tool/src/components/VersionHistory/VersionList.tsx`
  - 重命名为 `_versionId`、`_version`、`_page`

- [x] T3.3c: 清理 `VersionHistory/index.tsx` 中未使用的导入和参数
  - 文件: `apps/dev-tool/src/components/VersionHistory/index.tsx`
  - 删除 `RotateCcw`、`ChevronRight` 导入；重命名 `page`、`limit`、`versionId`、`fromId`、`toId`、`newVersion`、`getVersionContent` 为 `_` 前缀

#### 3.4 canvas 模块

- [x] T3.4a: 清理 `CanvasToolbar.tsx` 中未使用的 `X` 导入
  - 文件: `apps/dev-tool/src/components/canvas/CanvasToolbar.tsx`
  - 删除 `X` 导入

- [x] T3.4b: 清理 `NodeContextMenu.tsx` 中未使用的参数
  - 文件: `apps/dev-tool/src/components/canvas/NodeContextMenu.tsx`
  - 重命名第 46 行 `name`、`description`、`ids`；第 173、174 行 `id` 为 `_` 前缀

- [x] T3.4c: 清理 `NodeSearchModal.tsx` 中未使用的 `center` 赋值
  - 文件: `apps/dev-tool/src/components/canvas/NodeSearchModal.tsx`
  - 删除或注释 `center` 赋值

- [x] T3.4d: 清理 `useCanvasSelectionSync.ts` 中未使用的 `useEffect` 导入
  - 文件: `apps/dev-tool/src/components/canvas/useCanvasSelectionSync.ts`
  - 删除 `useEffect` 导入

#### 3.5 nodes 模块

- [x] T3.5a: 清理 `GroupNode.tsx` 中未使用的 `id`、`e` 参数
  - 文件: `apps/dev-tool/src/components/nodes/GroupNode.tsx`
  - 重命名为 `_id`、`_e`

- [x] T3.5b: 清理 `PrismNodeControls.tsx` 中未使用的 `id`、`params`、`onShowPreview` 参数
  - 文件: `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx`
  - 批量重命名所有 `onShowPreview` 参数为 `_onShowPreview`；`id`、`params` 视具体位置决定重命名

- [x] T3.5c: 清理 `PrismNodeHeader.tsx` 中未使用的 `categoryColor` 参数
  - 文件: `apps/dev-tool/src/components/nodes/PrismNodeHeader.tsx`
  - 重命名为 `_categoryColor`

#### 3.6 header 模块

- [x] T3.6a: 清理 `PublishDialog.tsx` 中未使用的 `prev` 参数
  - 文件: `apps/dev-tool/src/components/header/PublishDialog.tsx`
  - 重命名为 `_prev`

- [x] T3.6b: 清理 `SaveDialog.tsx` 中未使用的 `FileText` 导入和 `templateId`、`viewport` 参数
  - 文件: `apps/dev-tool/src/components/header/SaveDialog.tsx`
  - 删除 `FileText` 导入；重命名 `templateId`、`viewport` 为 `_templateId`、`_viewport`

- [x] T3.6c: 清理 `WorkflowHeader.tsx` 中未使用的 `leftPanelOpen`、`rightPanelOpen` 参数
  - 文件: `apps/dev-tool/src/components/header/WorkflowHeader.tsx`
  - 重命名为 `_leftPanelOpen`、`_rightPanelOpen`

#### 3.7 editor/stores 模块

- [x] T3.7a: 清理 `draftSlice.ts` 中 Reducer 参数的未使用变量
  - 文件: `apps/dev-tool/src/modules/editor/stores/draftSlice.ts`
  - 重命名 reducer 参数中未使用的 `meta`、`name`、`viewport`、`dragging`

- [x] T3.7b: 清理 `executionSlice.ts` 中 Reducer 参数的未使用变量
  - 文件: `apps/dev-tool/src/modules/editor/stores/executionSlice.ts`
  - 重命名 reducer 参数中未使用的 `nodeId`、`status`、`error`、`abort`、`progress`

- [x] T3.7c: 清理 `graphSlice.ts` 中 Reducer 参数的未使用变量
  - 文件: `apps/dev-tool/src/modules/editor/stores/graphSlice.ts`
  - 重命名 reducer 参数中未使用的 `type`、`position`、`id`、`data`、`nodes`、`edges`、`changes`、`connection`、`label`、`nodeIds`、`groupId`、`updates`、`deltaX`、`deltaY`

- [x] T3.7d: 清理 `inspectorSlice.ts` 中 Reducer 参数的未使用变量
  - 文件: `apps/dev-tool/src/modules/editor/stores/inspectorSlice.ts`
  - 重命名 reducer 参数中未使用的 `tab`、`nodeId`

- [x] T3.7e: 清理 `publishSlice.ts` 中 Reducer 参数的未使用变量
  - 文件: `apps/dev-tool/src/modules/editor/stores/publishSlice.ts`
  - 重命名所有 reducer 参数中未使用的变量

- [x] T3.7f: 清理 `selectionSlice.ts` 中 Reducer 参数的未使用变量
  - 文件: `apps/dev-tool/src/modules/editor/stores/selectionSlice.ts`
  - 重命名 reducer 参数中未使用的 `id`、`multi`、`nodeIds`、`edgeIds`

#### 3.8 services 模块

- [x] T3.8a: 清理 `autosaveService.ts` 中未使用的参数
  - 文件: `apps/dev-tool/src/modules/editor/services/autosaveService.ts`
  - 重命名 `workflowMeta`、`nodes`、`edges`、`onDone`、`autoSaveWorkflowId` 为 `_` 前缀

- [x] T3.8b: 清理 `executionService.ts` 中未使用的参数
  - 文件: `apps/dev-tool/src/modules/editor/services/executionService.ts`
  - 重命名 `progress`、`workflowMeta`、`nodes`、`edges`、`options`、`WorkflowExecutorType`、`workflow` 为 `_` 前缀

- [x] T3.8c: 清理 `importExportService.ts` 中未使用的参数
  - 文件: `apps/dev-tool/src/modules/editor/services/importExportService.ts`
  - 重命名 `workflowMeta`、`nodes`、`edges`、`file` 为 `_` 前缀

#### 3.9 其他模块

- [ ] T3.9a: 清理 `WorkflowsView.tsx` 中未使用的 `newWorkflow` 赋值
  - 文件: `apps/dev-tool/src/components/WorkflowsView.tsx`
  - 删除或注释 `newWorkflow` 赋值

- [ ] T3.9b: 清理 `mappers/` 下未使用的导入
  - 文件: `apps/dev-tool/src/modules/editor/mappers/canvasToWorkflow.ts`、`workflowToCanvas.ts`、`workflowToPublished.ts`
  - 删除未使用的 `WorkflowMetadata`、`EditorWorkflowMeta`、`Connection`、`PublishedParamDefinition`、`PortDataType`、`NodeDefinition` 导入

---

### 4. 验收清单

- [ ] `npx tsc --noEmit -p apps/dev-tool/tsconfig.json 2>&1` 无 TS 错误（0 errors）
- [ ] `npm run lint 2>&1` 无 lint 错误（0 errors）
- [ ] 手工验收：dev-tool 能正常启动（`npm run dev:dev-tool`）
- [ ] 手工验收：user-app 能正常启动（`npm run dev:user-app`）
