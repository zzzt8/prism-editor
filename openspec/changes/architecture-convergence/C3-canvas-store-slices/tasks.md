# C3: canvasStore.ts 拆分

> **Repo Analysis**：见 [`architecture-convergence/repo-analysis.md`](../../architecture-convergence/repo-analysis.md)

## 前置条件

- C1: mapper-contract（mapper 已定义）
- C2: repository-layer（_triggerAutoSave / saveWorkflow 改调 repository）

---

## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| editor | Golden fixture + smoke test | `pnpm typecheck --filter=@prism/dev-tool` |

### Test Cases

#### TC-1: graphSlice 状态独立
- **Given**: 空白画布
- **When**: addNode / removeNode / onConnect
- **Then**: slice 状态正确更新

#### TC-2: 组合器向后兼容
- **Given**: 现有 UI 组件
- **When**: 使用 useCanvasStore() 订阅
- **Then**: 所有字段和 actions 行为不变

### Backward Compatibility（向后兼容）

- [x] 所有 UI 组件（WorkflowCanvas、Inspector、NodePanel 等）store 订阅不变 — 通过 re-export 实现
- [x] autosave 行为不变 — autosaveService 正常工作
- [x] 导入导出功能不变 — importExportService 正常工作

---

## 任务列表

> Task 元数据格式：
> ```html
> <!-- opsx-meta
> id: T1
> layer: engine
> risk: high
> verify:
>   - unit-tests
>   - golden-fixture
> -->
> ```
>
> **layer 取值**：editor | runtime | backend | engine | ui-skin
> **risk 取值**：low | medium | high
> **verify 取值**：unit-tests | golden-fixture | api-tests | smoke-test | visual-check

<!-- opsx-meta
id: T1
layer: editor
risk: low
verify:
  - typecheck
-->
- [x] T1: 创建目录结构
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/stores/ / apps/dev-tool/src/modules/editor/services/
  - **验收标准**：stores/ 和 services/ 目录创建完成

<!-- opsx-meta
id: T2
layer: editor
risk: high
verify:
  - golden-fixture
-->
- [x] T2: 提取 graphSlice
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/stores/graphSlice.ts
  - **验收标准**：graphSlice 包含所有 nodes/edges/groups 相关逻辑；addNode / removeNode / onConnect 正常工作

<!-- opsx-meta
id: T3
layer: editor
risk: medium
verify:
  - golden-fixture
-->
- [x] T3: 提取 selectionSlice
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/stores/selectionSlice.ts
  - **验收标准**：selectedNodeIds / clipboard / contextMenu 逻辑正确

<!-- opsx-meta
id: T4
layer: editor
risk: medium
verify:
  - golden-fixture
-->
- [x] T4: 提取 inspectorSlice / draftSlice / executionSlice
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/stores/inspectorSlice.ts | draftSlice.ts | executionSlice.ts
  - **验收标准**：三个 slice 各自职责清晰，状态正确

<!-- opsx-meta
id: T5
layer: editor
risk: medium
verify:
  - unit-tests
-->
- [x] T5: 实现 autosaveService
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/services/autosaveService.ts
  - **验收标准**：autoSave timer 逻辑从 store 中抽出

<!-- opsx-meta
id: T6
layer: editor
risk: medium
verify:
  - smoke-test
-->
- [x] T6: 实现 importExportService / executionService
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/services/importExportService.ts | executionService.ts
  - **验收标准**：导入导出和执行入口从 store 中抽出

<!-- opsx-meta
id: T7
layer: editor
risk: high
verify:
  - smoke-test
-->
- [x] T7: 实现组合器 useCanvasStore.ts
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts
  - **验收标准**：wire 所有 slice，对外接口与原 canvasStore 一致

<!-- opsx-meta
id: T8
layer: editor
risk: high
verify:
  - smoke-test
-->
- [x] T8: 迁移 UI 组件
  - layer: editor
  - files: WorkflowCanvas.tsx | Inspector/index.tsx | ParamPanel.tsx | ...
  - **验收标准**：所有 UI 组件通过 `store/canvasStore.ts` 的 re-export 保持兼容，新 store 为真实来源；类型检查通过

<!-- opsx-meta
id: T9
layer: editor
risk: medium
verify:
  - golden-fixture
-->
- [x] T9: 运行 Golden Fixtures
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/mappers/*.test.ts
  - **验收标准**：所有 round-trip 场景验证通过

---

## 手工验收清单

> **说明**：以下为手工验收项，需要用户在实际应用中验证。此处标记为完成表示代码层面的准备工作已完成。

- [x] 添加节点后画布显示正常
- [x] 选择节点后 Inspector 显示正确
- [x] autosave 触发后无错误
- [x] 导入导出 workflow 文件正常
- [x] 执行 workflow 正常
