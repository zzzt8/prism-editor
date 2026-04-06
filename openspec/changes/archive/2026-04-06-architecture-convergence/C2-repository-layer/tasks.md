# C2: Repository 层引入

> **Repo Analysis**：见 [`architecture-convergence/repo-analysis.md`](../../architecture-convergence/repo-analysis.md)

## 前置条件

- C1: mapper-contract（定义 IWorkflowRepository 接口需要 Mapper 类型）

---

## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| editor | 单元测试 | `pnpm typecheck --filter=@prism/dev-tool` |
| runtime | 单元测试 | `pnpm typecheck --filter=@prism/user-app` |

### Test Cases

#### TC-1: WorkflowRepository CRUD
- **Given**: 空的 IndexedDB
- **When**: 调用 save / get / list / delete
- **Then**: 数据正确存取

#### TC-2: VersionRepository 快照
- **Given**: 已保存的 Workflow
- **When**: 调用 create / rollback
- **Then**: 版本历史正确生成

### Backward Compatibility（向后兼容）

- [x] dev-tool 保存/加载 workflow 行为不变
- [x] user-app 发布流程不受影响

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
files:
  - apps/dev-tool/src/modules/repositories/
status: done
-->
- [x] T1: 创建 dev-tool repositories 目录结构
  - layer: editor
  - files: apps/dev-tool/src/modules/repositories/
  - **验收标准**：`apps/dev-tool/src/modules/repositories/` 目录创建完成

<!-- opsx-meta
id: T2
layer: editor
risk: medium
verify:
  - unit-tests
files:
  - apps/dev-tool/src/modules/repositories/workflowRepository.ts
status: done
-->
- [x] T2: 实现 WorkflowRepository
  - layer: editor
  - files: apps/dev-tool/src/modules/repositories/workflowRepository.ts
  - **验收标准**：`list()` 返回 WorkflowMeta[]；`save()` 正确序列化；`delete()` 正确移除

<!-- opsx-meta
id: T3
layer: editor
risk: medium
verify:
  - unit-tests
files:
  - apps/dev-tool/src/modules/repositories/versionRepository.ts
status: done
-->
- [x] T3: 实现 VersionRepository
  - layer: editor
  - files: apps/dev-tool/src/modules/repositories/versionRepository.ts
  - **验收标准**：`list()` 返回 WorkflowVersion[]；`create()` 生成快照；`rollback()` 返回指定版本

<!-- opsx-meta
id: T4
layer: editor
risk: medium
verify:
  - unit-tests
files:
  - apps/dev-tool/src/modules/repositories/publishRepository.ts
status: done
-->
- [x] T4: 实现 PublishRepository
  - layer: editor
  - files: apps/dev-tool/src/modules/repositories/publishRepository.ts
  - **验收标准**：`publish()` 保存 PublishedWorkflow JSON；`listPublished()` 返回元数据列表

<!-- opsx-meta
id: T5
layer: editor
risk: low
verify:
  - smoke-test
files:
  - apps/dev-tool/src/store/workflowStore.ts
status: done
-->
- [x] T5: 更新 workflowStore.ts
  - layer: editor
  - files: apps/dev-tool/src/store/workflowStore.ts
  - **验收标准**：loadSavedWorkflows 改调 repository.list()；deleteSavedWorkflow 改调 repository.delete()

<!-- opsx-meta
id: T6
layer: runtime
risk: low
verify:
  - unit-tests
files:
  - apps/user-app/src/modules/repositories/
status: done
-->
- [x] T6: 创建 user-app repositories
  - layer: runtime
  - files: apps/user-app/src/modules/repositories/
  - **验收标准**：PublishedWorkflowRepository 实现 IPublishRepository；NodePackageRepository 处理节点包存储

---

## 手工验收清单

- [x] dev-tool 打开后能加载已有 workflow 列表
- [x] 保存 workflow 后刷新页面能加载
- [x] user-app 能正确显示已发布 workflow
