## 任务列表

<!-- opsx-meta
id: T1
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T1: 定义 Template 类型并导出
  - layer: engine
  - 文件: `packages/shared-types/src/template.ts`
  - 内容:
    - `Template` 接口（id, name, version, description, tags, author, createdAt, updatedAt, workflowMeta, nodes, edges, groups, inputs, outputs）
    - `TemplateInput` / `TemplateOutput` 类型（复用 WorkflowInput/WorkflowOutput）
    - `TemplateMetadata` 类型（author, tags, category, description）
    - `TemplateSummary` 类型（列表页用，不含节点快照）

<!-- opsx-meta
id: T2
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: [T1]
-->
- [ ] T2: 在 shared-types index.ts 中导出 Template
  - layer: engine
  - 文件: `packages/shared-types/src/index.ts`

<!-- opsx-meta
id: T3
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1, T2]
-->
- [ ] T3: 实现 ITemplateRepository 接口与 TemplateRepository
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/repositories/templateRepository.ts`
  - 内容:
    - `ITemplateRepository` 接口（list/save/get/delete/exists）
    - `TemplateRepository` 实现，复用 `IndexedDBStorageAdapter` 模式
    - 独立的 IndexedDB object store：`templates`
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

<!-- opsx-meta
id: T4
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T3]
-->
- [ ] T4: 在 repositories/index.ts 中导出 TemplateRepository
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/repositories/index.ts`

<!-- opsx-meta
id: T5
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T3]
-->
- [ ] T5: 扩展 SaveDialog 增加"另存为模板"选项
  - layer: editor
  - 文件: `apps/dev-tool/src/components/header/SaveDialog.tsx`
  - 内容:
    - 新增"保存类型"选择（保存草稿 / 另存为模板）
    - 选择"模板"时显示：名称（必填）、描述（选填）、标签（选填）
    - 调用 `TemplateRepository.save()` 保存
  - 验证命令: 手工测试保存为模板流程

<!-- opsx-meta
id: T6
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T3]
-->
- [ ] T6: 新增 TemplateManager UI 组件
  - layer: editor
  - 目录: `apps/dev-tool/src/components/TemplateManager/`
  - 文件:
    - `index.tsx`（主入口，Tab 切换：列表/详情）
    - `TemplateList.tsx`（模板列表，调用 TemplateRepository.list()）
    - `TemplateCard.tsx`（单个模板卡片）
    - `CreateFromTemplate.tsx`（从模板创建，调用 TemplateRepository.get() + canvasStore.loadFromTemplate()）
  - 验证命令: 手工测试列表加载、模板创建

<!-- opsx-meta
id: T7
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T5, T6]
-->
- [ ] T7: 扩展 canvasStore 支持从模板加载
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/editor/stores/canvasStore.ts`
  - 内容:
    - `loadFromTemplate(template: Template)` 方法：生成新节点 ID、加载节点和边、生成新 workflowMeta
  - 验证命令: 手工测试从模板创建工作流

---

### 手工验收清单

- [ ] 模板列表正常加载（无数据时显示空状态）
- [ ] 保存为模板后，模板列表中出现新记录
- [ ] 从模板创建后，编辑器加载节点，进入可编辑状态
- [ ] 删除模板后，已派生的工作流内容不受影响
- [ ] typecheck 通过
