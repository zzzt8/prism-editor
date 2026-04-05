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

- [ ] user-app 启动流程不变
- [ ] 节点包加载行为不变（C7 才有安全边界）

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
- [ ] T1: 创建目录结构
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
- [ ] T2: 实现 workflowCatalogStore
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
- [ ] T3: 实现 selectedWorkflowStore
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
- [ ] T4: 拆分 nodePackageLoader
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
- [ ] T5: 实现 runStore / runWorkflow
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
- [ ] T6: 更新 App.tsx
  - layer: runtime
  - files: apps/user-app/src/App.tsx
  - **验收标准**：store 初始化正确

---

## 手工验收清单

- [ ] user-app 启动后显示已发布 workflow 列表
- [ ] 点击选择 workflow 后详情正确加载
- [ ] 运行 workflow 正常
