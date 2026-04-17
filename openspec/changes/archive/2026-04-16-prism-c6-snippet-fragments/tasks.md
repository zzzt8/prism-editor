## 任务列表

<!-- opsx-meta
|id: T1
|layer: engine
|verify: unit-tests
|dependencies:
  - type: task
    refs: []
-->
- [x] T1: 定义 SnippetFragment 类型
  - layer: engine
  - 文件: `packages/shared-types/src/snippet.ts`
  - 内容:
    - `SnippetFragment` 接口：id, name, description, createdAt, nodes[], edges[], groups[]（不含 runtime state）
    - `nodes[]`: 只含 id/type/position/data，不含执行状态
    - `edges[]`: 只含 source/target，不含执行时的动态边
    - `groups[]`: 只含基础字段
    - `SnippetSummary` 接口：id, name, createdAt（列表页轻量展示用）
  - 验证命令: `pnpm typecheck --filter=@prism/shared-types`

<!-- opsx-meta
|id: T2
|layer: editor
|verify: unit-tests
|dependencies:
  - type: task
    refs: []
-->
- [x] T2: 实现 SnippetRepository（IndexedDB CRUD）
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/repositories/snippetRepository.ts`
  - 内容:
    - 复刻 `TemplateRepository` 的 IndexedDB 模式
    - `DB_NAME = 'prism-editor'`, `OBJECT_STORE = 'snippets'`
    - `save(fragment: SnippetFragment): Promise<string>` — 新增或覆盖
    - `list(): Promise<SnippetSummary[]>` — 读全部，按字母排序
    - `get(id): Promise<SnippetFragment | null>` — 按 id 读取
    - `delete(id): Promise<void>` — 按 id 删除
    - 保存时过滤掉不含 definition 的节点（避免无效节点）
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

<!-- opsx-meta
|id: T3
|layer: editor
|verify: smoke-test
|dependencies:
  - type: task
    refs: [T1, T2]
-->
- [x] T3: 抽取 selectionSlice.pasteNodes 的 ID 重映射逻辑
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`
  - 内容:
    - 抽取 `remapNodeIds(nodes, edges, oldToNewIdMap)` 为独立函数（或保留在 pasteNodes 内供 insertSnippet 调用）
    - 片段插入时复用同一重映射逻辑
    - 边过滤：只保留两端 nodeId 都在 oldToNewIdMap 中的边
    - 位置偏移：插入后整体偏移 (40, 40)
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

<!-- opsx-meta
|id: T4
|layer: editor
|verify: smoke-test
|dependencies:
  - type: task
    refs: [T1, T2]
-->
- [x] T4: canvasStore 新增 snippet 相关 actions
  - layer: editor
  - 文件: `apps/dev-tool/src/store/canvasStore.ts`
  - 内容:
    - `snippetSave(name, description, selectedNodeIds)` action：选中节点 → 快照 → SnippetRepository.save()
    - `snippetList(): SnippetSummary[]` selector：从 IndexedDB 读取列表
    - `insertSnippet(snippetId, position)` action：读取片段 → ID 重映射 → 追加到 nodes/edges
    - `deleteSnippet(id)` action：调用 SnippetRepository.delete
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

<!-- opsx-meta
|id: T5
|layer: editor
|verify: smoke-test
|dependencies:
  - type: task
    refs: [T4]
-->
- [x] T5: NodeContextMenu 新增「保存为片段」菜单项
  - layer: editor
  - 文件: `apps/dev-tool/src/components/canvas/NodeContextMenu.tsx`
  - 内容:
    - 选中 1 个或多个节点时，显示「保存为片段」菜单项
    - 点击后弹出简化的保存弹窗（输入名称 + 描述）
    - 确认后调用 canvasStore.snippetSave
    - 无选中节点时不显示该菜单项
  - 验证命令: 手工测试节点右键菜单

<!-- opsx-meta
|id: T6
|layer: editor
|verify: smoke-test
|dependencies:
  - type: task
    refs: [T4]
-->
- [x] T6: WorkflowCanvas 新增 pane 级右键菜单（插入片段）
  - layer: editor
  - 文件: `apps/dev-tool/src/components/canvas/WorkflowCanvas.tsx`
  - 内容:
    - 监听 `onPaneContextMenu` 事件，记录右键点击坐标
    - 显示「插入片段」子菜单（调用 snippetList 读取已有片段）
    - 子菜单项：按字母排序的片段列表 + 「无片段」空状态
    - 点击片段后调用 `insertSnippet(snippetId, screenPos)`，通过 `screenToFlowPosition` 转坐标
    - 共用现有 contextMenu 关闭逻辑
  - 验证命令: 手工测试画布空白处右键

<!-- opsx-meta
|id: T7
|layer: editor
|verify: smoke-test
|dependencies:
  - type: task
    refs: [T5, T6]
-->
- [x] T7: 端到端验证——保存并插入片段
  - layer: editor
  - 内容:
    - 选中若干节点 → 右键「保存为片段」→ 填写名称 → 确认保存
    - 画布空白处右键 → 「插入片段」→ 选择刚保存的片段
    - 确认节点正确插入（ID 不冲突、位置偏移正确、边连接正确）
    - 页面刷新后片段列表仍存在（持久化验证）
  - 验证命令: 手工验收

<!-- opsx-meta
|id: T8
|layer: ui-skin
|verify: visual-check
|dependencies:
  - type: task
    refs: [T7]
-->
- [x] T8: 移除顶栏「模板管理」按钮
  - layer: ui-skin
  - 文件: `apps/dev-tool/src/components/WorkflowsView.tsx`
  - 内容:
    - 删除「模板管理」按钮（第 203-208 行）
    - 删除 `showTemplateManager` state（第 84 行）
    - 删除 `TemplateManager` import（第 9 行）
    - 删除 `{showTemplateManager && ...}` 条件渲染（第 479-481 行）
    - `TemplateManager` 组件文件（`src/components/TemplateManager/`）保留，标记废弃注释，暂不删除
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

---

### 手工验收清单

- [x] typecheck 通过
- [x] snippetRepository.save/list/get/delete 正常工作
- [x] 选中节点 → 右键「保存为片段」→ 输入名称 → 保存成功
- [x] 画布空白处右键 → 「插入片段」子菜单显示已保存片段
- [x] 插入后节点 ID 不与现有节点冲突
- [x] 页面刷新后片段列表仍存在（IndexedDB 持久化）
- [x] 边过滤正确（只保留两端节点都在片段内的边）
- [x] 降级：片段含未知 nodeType 时跳过该节点 + console.warn，不崩溃
- [x] WorkflowsView 顶栏不再显示「模板管理」按钮
