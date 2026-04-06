# C4: PublishedWorkflow V2 协议收紧

> **Repo Analysis**：见 [`architecture-convergence/repo-analysis.md`](../../architecture-convergence/repo-analysis.md)

## 前置条件

- C1: mapper-contract（workflowToPublished mapper 已定义）

---

## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| engine | 单元测试 | `pnpm test --filter=@prism/workflow-core` |
| backend | API 验证 | `pnpm typecheck --filter=@prism/server` |

### Test Cases

#### TC-1: V2 写入
- **Given**: 含节点的 Workflow
- **When**: 执行 publish
- **Then**: config.nodeTypes / config.nodeConfigs / config.connections 存在

#### TC-2: Legacy 读取兼容
- **Given**: 旧格式 PublishedWorkflow（无 config.nodeTypes）
- **When**: runtime 加载
- **Then**: 仍可执行，仅警告

### Backward Compatibility（向后兼容）

- [x] 已发布的旧 workflow 仍可运行
- [x] 新发布统一为 V2 格式

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
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T1: 添加 version 字段
  - layer: engine
  - files: packages/shared-types/src/published.ts
  - **验收标准**：PublishedWorkflow 类型添加 version 字段标记 V2

<!-- opsx-meta
id: T2
layer: engine
risk: medium
verify:
  - unit-tests
-->
- [x] T2: 更新 PublishedWorkflowExecutor
  - layer: engine
  - files: packages/workflow-core/src/published-executor.ts
  - **验收标准**：无 nodeTypes 时不再抛错误，改为可选警告；legacy pw.inputs[] 仍可读取

<!-- opsx-meta
id: T3
layer: editor
risk: medium
verify:
  - smoke-test
-->
- [x] T3: 更新 PublishDialog
  - layer: editor
  - files: apps/dev-tool/src/components/header/PublishDialog.tsx
  - **验收标准**：统一输出 V2 格式

<!-- opsx-meta
id: T4
layer: backend
risk: high
verify:
  - api-tests
-->
- [x] T4: 添加 Migration Script
  - layer: backend
  - files: server/src/scripts/migrate-published-v2.ts
  - **验收标准**：旧 published 数据补齐 V2 字段

---

## 手工验收清单

- [x] 发布新 workflow，PublishedWorkflow 包含 config.nodeTypes
- [x] 加载旧 published workflow（无 config），runtime 给出警告但仍可执行
- [x] migration script 正确补齐旧数据
