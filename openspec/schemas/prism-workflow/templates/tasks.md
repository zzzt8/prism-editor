## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| engine | 单元测试 + golden fixture | `pnpm test --filter=@prism/workflow-core` |
| backend | API 验证 + 数据迁移测试 | 手工测试 + 脚本验证 |
| editor | Smoke test | 手工验收 |
| runtime | 集成测试 | 手工验收 |

### Test Cases

#### TC-1: [场景描述]
- **Given**: ...
- **When**: ...
- **Then**: ...

### Backward Compatibility（向后兼容）

- [ ] 现有 published workflow 仍可运行
- [ ] 现有 node package 兼容
- [ ] API 端点向后兼容
- [ ] 数据迁移安全

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
layer: engine
risk: high
verify:
  - unit-tests
  - golden-fixture
-->
- [ ] T1: [任务描述]
  - layer: engine
  - files: packages/workflow-core/**

<!-- opsx-meta
layer: backend
risk: medium
verify:
  - api-tests
-->
- [ ] T2: [任务描述]
  - layer: backend
  - files: server/src/**

---

### 手工验收清单

- [ ] UI 交互正常
- [ ] 错误提示友好
- [ ] 性能可接受