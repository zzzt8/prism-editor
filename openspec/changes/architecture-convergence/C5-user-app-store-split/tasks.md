# C5: user-app store 拆分

> **Repo Analysis**：见 [`architecture-convergence/repo-analysis.md`](../../architecture-convergence/repo-analysis.md)

## 前置条件

- C4: published-workflow-v2（节点包加载逻辑验证需要 V2 协议）

---

## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| runtime | Smoke test | `pnpm typecheck --filter=@prism/user-app` |

### Test Cases

#### TC-1: store 职责隔离
- **Given**: user-app 启动
- **When**: 加载 workflow 列表
- **Then**: workflowCatalogStore 独立加载，selectedWorkflowStore 独立选择

### Backward Compatibility（向后兼容）

> C5 拆分后，所有 store/service 均通过 App.tsx 初始化，无新增外部依赖。验证如下：

- [x] **user-app 启动流程不变**
  - 启动入口仍是 `main.tsx` → `globalRegistry.initialize()` → `App` → 路由解析
  - store 初始化分散到各组件（WorkflowListPage 触发 `loadWorkflows`，WorkflowRunPage 依赖 `selectedWorkflow`）
  - 无破坏性变更

- [x] **节点包加载行为不变（C7 才有安全边界）**
  - `nodePackageLoader.loadRequiredNodes` 逻辑与原 `loadRequiredNodes` 完全一致
  - 缓存策略、校验流程、错误收集方式保持不变
  - C7 只需在 `nodePackageLoader.ts` 中添加安全边界逻辑，无需修改调用方

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
layer: runtime
risk: low
verify:
  - typecheck
-->
- [x] T1: 创建目录结构
  - layer: runtime
  - files: apps/user-app/src/modules/
  - **验收标准**：`apps/user-app/src/modules/` 子目录创建完成

<!-- opsx-meta
id: T2
layer: runtime
risk: low
verify:
  - smoke-test
-->
- [x] T2: 实现 workflowCatalogStore
  - layer: runtime
  - files: apps/user-app/src/modules/catalog/workflowCatalogStore.ts
  - **验收标准**：列表加载、排序功能正常

<!-- opsx-meta
id: T3
layer: runtime
risk: low
verify:
  - smoke-test
-->
- [x] T3: 实现 selectedWorkflowStore
  - layer: runtime
  - files: apps/user-app/src/modules/selection/selectedWorkflowStore.ts
  - **验收标准**：select / clear / 当前 workflow 功能正常

<!-- opsx-meta
id: T4
layer: runtime
risk: medium
verify:
  - unit-tests
-->
- [x] T4: 拆分 nodePackageLoader
  - layer: runtime
  - files: apps/user-app/src/modules/node-runtime/nodePackageLoader.ts
  - **验收标准**：节点包加载逻辑为独立 service

<!-- opsx-meta
id: T5
layer: runtime
risk: medium
verify:
  - smoke-test
-->
- [x] T5: 实现 runStore / runWorkflow
  - layer: runtime
  - files: apps/user-app/src/modules/runner/runStore.ts | runWorkflow.ts
  - **验收标准**：runState 和执行入口功能正常

<!-- opsx-meta
id: T6
layer: runtime
risk: low
verify:
  - smoke-test
-->
- [x] T6: 更新 App.tsx
  - layer: runtime
  - files: apps/user-app/src/App.tsx
  - **验收标准**：store 初始化正确

<!-- opsx-meta
id: T7
layer: runtime
risk: low
verify:
  - typecheck
-->
- [x] T7: 实现 runtimeRegistry
  - layer: runtime
  - files: apps/user-app/src/modules/runtime/runtimeRegistry.ts
  - **验收标准**：registry 组装逻辑为独立 service

---

## 手工验收清单

> 手动验证通过于 2026-04-06

- [x] user-app 启动后显示已发布 workflow 列表
- [x] 点击选择 workflow 后详情正确加载
- [x] 运行 workflow 正常
