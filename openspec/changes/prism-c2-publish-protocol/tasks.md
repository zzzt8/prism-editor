## 任务列表

<!-- opsx-meta
id: T1
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T1: 扩展 PublishedParamDefinition 类型
  - layer: engine
  - 文件: `packages/shared-types/src/published.ts`
  - 内容:
    - `PublishedParamDefinition` 接口：nodeId, paramId, label, controlType, options, defaultValue, validation, visibility, description
    - `PublishedParamValidation` 接口：required, min, max, pattern
    - `ParamControlType` 枚举：select | number | string | boolean | image-file
    - `PublishedConfig` 中新增 `paramDefinitions?: PublishedParamDefinition[]` 字段（保留 exposedParams 兼容）
  - 验证命令: `pnpm typecheck --filter=@prism/shared-types`

<!-- opsx-meta
id: T2
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T2: 扩展 NodeDefinition 接口增加 paramSchema
  - layer: engine
  - 文件: `packages/shared-types/src/node.ts`（或 `packages/node-definitions/src/`）
  - 内容:
    - 在 NodeDefinition 中确认或新增 `paramSchema` 字段，包含参数类型信息
    - 若 paramSchema 不存在，创建基础版本（{ [paramId]: { type: string } }）
  - 验证命令: `pnpm typecheck --filter=@prism/shared-types`

<!-- opsx-meta
id: T3
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1, T2]
-->
- [x] T3: 扩展 workflowToPublished mapper 实现控件类型推断
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/editor/mappers/workflowToPublished.ts`
  - 内容:
    - 实现 `inferControlType(paramSchemaType: string): ParamControlType` 函数
    - 实现 `inferOptions(nodeDef, paramId): Array<{label, value}>` 函数
    - 发布时对每个暴露参数自动填充 controlType、options、defaultValue
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

<!-- opsx-meta
id: T4
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1, T3]
-->
- [x] T4: 新增 publishSlice 状态管理
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/editor/stores/publishSlice.ts`
  - 内容:
    - 管理发布对话框状态：选中的暴露参数、参数配置、可见性状态
    - 提供 `updateParamDefinition(nodeId, paramId, patch)` action
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

<!-- opsx-meta
id: T5
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1, T4]
-->
- [x] T5: 重构 PublishDialog 参数配置 UI
  - layer: editor
  - 文件: `apps/dev-tool/src/components/header/PublishDialog.tsx`
  - 内容:
    - 每个 exposedParam 显示：参数名、来源节点、显示名输入、控件类型选择（下拉）、默认值、可见性切换（眼睛图标/锁定图标）、校验规则折叠面板
    - 集成 publishSlice 管理状态
  - 验证命令: 手工测试发布流程，填写参数配置，确认发布成功

<!-- opsx-meta
id: T6
layer: runtime
verify: smoke-test
dependencies:
  - type: task
    refs: [T1]
-->
- [x] T6: 扩展 user-app 端 ParamsSection 渲染器
  - layer: runtime
  - 文件: `apps/user-app/src/components/ParamsSection/`
  - 内容:
    - 实现 `ParamControlRenderer` 组件，按 controlType 渲染对应控件
    - SelectControl: 下拉选择
    - NumberControl: 数字输入（支持 min/max）
    - StringControl: 文本输入
    - BooleanControl: Switch 切换
    - ImageFileControl: 图像上传
    - locked 状态：所有控件加 disabled 属性
    - 优先读取 paramDefinitions，降级 fallback 到 exposedParams（渲染为 StringControl）
  - 验证命令: 手工测试 user-app 参数渲染

<!-- opsx-meta
id: T7
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T3, T5]
-->
- [x] T7: 端到端验证——发布含参数的 workflow 并在 user-app 渲染
  - layer: editor
  - 内容:
    - 在编辑器中配置含参数的节点，发布
    - 在 user-app 加载发布物，确认参数控件正确渲染
    - 填写参数，执行，确认结果正确
  - 验证命令: 手工验收

---

### 手工验收清单

- [x] workflowToPublished 发布时自动推断 controlType（不崩溃）
- [x] PublishDialog 中可编辑参数可见性
- [x] 发布的 PublishedWorkflow 包含 paramDefinitions 字段
- [x] user-app 读取 paramDefinitions 并正确渲染（select → 下拉，boolean → switch）
- [x] 降级：仅有 exposedParams 无 paramDefinitions 时，user-app 不崩溃（渲染为文本输入）
- [x] typecheck 通过
