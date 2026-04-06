# C1: Mapper 契约定义

> **Repo Analysis**：见 [`architecture-convergence/repo-analysis.md`](../../architecture-convergence/repo-analysis.md)

## 前置条件

无。

---

## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| engine | 单元测试 + golden fixture | `pnpm test --filter=@prism/workflow-core` |
| editor | 单元测试 + golden fixture | `pnpm typecheck --filter=@prism/dev-tool` |

### Test Cases

#### TC-1: canvasToWorkflow round-trip
- **Given**: 空 EditorDraft
- **When**: 执行 canvasToWorkflow → workflowToCanvas
- **Then**: 节点数量/类型不变

#### TC-2: workflowToCanvas round-trip
- **Given**: 完整 Workflow
- **When**: 执行 workflowToCanvas → canvasToWorkflow
- **Then**: Workflow JSON 一致

#### TC-3: 单节点画布
- **Given**: 含单节点的 EditorDraft
- **When**: canvasToWorkflow
- **Then**: Workflow.nodes 包含 id/type/position/params

### Backward Compatibility（向后兼容）

- [ ] 现有 canvasStore 不因新增 mapper 而行为变化
- [ ] 现有保存的 Workflow JSON 仍可加载

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
  - unit-tests
-->
- [x] T1: 定义 EditorDraft 类型
  - layer: editor
  - files: packages/shared-types/src/workflow.ts
  - **验收标准**：`EditorDraft` 类型覆盖 canvasStore 所有状态字段，不包含运行时状态

<!-- opsx-meta
id: T2
layer: editor
risk: low
verify:
  - unit-tests
  - golden-fixture
-->
- [x] T2: 实现 canvasToWorkflow.ts
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/mappers/canvasToWorkflow.ts
  - **验收标准**：空 CanvasNode[] 输出空 Workflow.nodes；metadata.updatedAt 为当前时间

<!-- opsx-meta
id: T3
layer: editor
risk: low
verify:
  - unit-tests
  - golden-fixture
-->
- [x] T3: 实现 workflowToCanvas.ts
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/mappers/workflowToCanvas.ts
  - **验收标准**：节点映射带 definition；isDirty = false；nodeCounter 重置

<!-- opsx-meta
id: T4
layer: editor
risk: medium
verify:
  - unit-tests
-->
- [x] T4: 实现 workflowToPublished.ts
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/mappers/workflowToPublished.ts
  - **验收标准**：config.nodeTypes 用 nodeId UUID 做 key

<!-- opsx-meta
id: T5
layer: engine
risk: medium
verify:
  - unit-tests
  - golden-fixture
-->
- [x] T5: 实现 publishedToWorkflow.ts（runtime 重建）
  - layer: engine
  - files: apps/dev-tool/src/modules/persistence/mappers/publishedToWorkflow.ts
  - **验收标准**：从 nodeTypes/nodeConfigs 正确重建节点；拓扑排序输出

<!-- opsx-meta
id: T6
layer: editor
risk: low
verify:
  - golden-fixture
-->
- [x] T6: 添 Golden Fixtures 测试
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/mappers/*.test.ts
  - **验收标准**：空画布/单节点/两节点+边/带 extraInputs 场景均测试

---

## 手工验收清单

- [x] 新建空白画布后保存，Workflow JSON 格式正确
- [x] 加载已有 Workflow，节点定义完整
- [x] 发布流程生成 V2 config
