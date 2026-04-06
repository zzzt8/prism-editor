# C6: 版本号归服务端

> **Repo Analysis**：见 [`architecture-convergence/repo-analysis.md`](../../architecture-convergence/repo-analysis.md)

## 前置条件

- C2: repository-layer（前端改调 repository）

---

## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| backend | API 验证 | `pnpm test --filter=@prism/server` |
| editor | Smoke test | `pnpm typecheck --filter=@prism/dev-tool` |

### Test Cases

#### TC-1: 服务端版本生成
- **Given**: 前端提交 content + baseRevision
- **When**: POST /api/workflows/:id/versions
- **Then**: 服务端生成 WorkflowVersion，返回新 version

#### TC-2: 版本回滚
- **Given**: 已保存的多个版本
- **When**: POST /api/workflows/:id/rollback
- **Then**: 返回指定版本内容，生成新 snapshot

### Backward Compatibility（向后兼容）

- [x] 前端保存 workflow 行为不变
- [x] 现有 workflow 的版本历史不受影响

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
risk: medium
verify:
  - smoke-test
-->
- [x] T1: 移除前端版本号自增
  - layer: editor
  - files: apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts
  - **验收标准**：保存后 version 不再自增；保存只传 content

<!-- opsx-meta
id: T2
layer: backend
risk: high
verify:
  - api-tests
-->
- [x] T2: 更新服务端 WorkflowVersion 生成
  - layer: backend
  - files: server/src/routes/workflow.ts, server/src/schemas/workflow.ts
  - **验收标准**：服务端生成 semantic version；返回新 version

<!-- opsx-meta
id: T3
layer: backend
risk: medium
verify:
  - api-tests
-->
- [x] T3: 实现 rollback
  - layer: backend
  - files: server/src/routes/versions.ts
  - **验收标准**：rollback 端点返回指定版本内容，生成新 snapshot

<!-- opsx-meta
id: T4
layer: backend
risk: high
verify:
  - api-tests
-->
- [x] T4: 添加 Migration Script
  - layer: backend
  - files: server/src/scripts/migrate-versions.ts
  - **验收标准**：现有 workflow 的 content 存入 WorkflowVersion

---

## 手工验收清单

- [x] 保存 workflow 后版本号由服务端生成
- [x] 查看版本历史能看到所有 snapshot
- [x] 回滚到指定版本后，workflow 内容正确
