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

> [!WARNING]
> **Task ID 必须全局唯一**。同一 change 内不得出现重复 id。若两个 task 需要用同一编号，改为 T6a / T6b。重复 id 是 schema 违规，会导致 `openspec list` 的 totalTasks 计数错误。

> **Task 元数据格式：**
> ```html
> <!-- opsx-meta
> id: T1
> layer: engine
> verify: unit-tests
> dependencies:
>   - type: task
>     refs: []
> -->
> ```
>
> **验收标准写法规则**：必须写成**可观测、可验证**的条件，禁止写需要运行时状态才能验证的句子。
> - 好：`pnpm exec tsc --noEmit 无错误`
> - 好：`clipboard 字段存在于 canvasStore.ts 且类型为 NodeOrEdge[]`
> - 差：`复制节点后刷新页面，粘贴仍可用`（需要 persist middleware，属于额外 scope）
> - 差：`两个 store 共享同一个 adapter 实例`（需要对象身份测试，属于额外 scope）
> 如果验收标准涉及运行时行为，拆成两个 sub-task：代码可验证的 + 标记为手工验收的。

> **layer 取值**：editor | runtime | backend | engine | ui-skin | meta
> **verify 取值**：unit-tests | golden-fixture | api-tests | smoke-test | visual-check | manual

<!-- opsx-meta
id: T1
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [ ] T1: [任务描述]
  - layer: engine

<!-- opsx-meta
id: T2
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: [T1]
-->
- [ ] T2: [任务描述]
  - layer: backend

---

### 验收清单（E2E 优先原则）

> 机器能做的先让机器做：E2E 测试 > 单元测试 > 命令行验证 > 人工验收。
> 填写时按上述优先级选择验证方式，人工验收仅作为兜底。

- [ ] E2E / Playwright 测试覆盖（如有）
- [ ] 单元/集成测试通过（如有）
- [ ] `pnpm typecheck` 无错误
- [ ] 手工验收（上述均无法覆盖时）

> 若某个验收项已有测试覆盖，则不加人工验收项。
> 只有"无法编写测试"且"命令行无法验证"时才加人工验收。

---

## change_class = low 测试指南

> 适用于 change_class = low 的测试设计。
> 测试并入 tasks 验证命令，不保留独立测试章节。

### Low-change 验证命令标准写法

```markdown
- [ ] T1.1: [任务名]
  - 验证命令：`pnpm test --filter=<package> -- --grep "TC-xxx"`
```

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。

### N.1 执行引擎完整性

- [ ] N.1.1 拓扑排序测试覆盖（含 cycle detection）
- [ ] N.1.2 节点 executor 错误隔离测试
- [ ] N.1.3 AbortController 链路测试（取消后结果保留）

### N.2 状态一致性

- [ ] N.2.1 Canvas 执行状态机转换测试
- [ ] N.2.2 取消后 Zustand store 状态检查

### N.3 Registry 与 API 契约

- [ ] N.3.1 Node Registry 重复注册报错验证
- [ ] N.3.2 Prisma migration 验证（`pnpm --filter=@prism/server exec prisma migrate status`）
- [ ] N.3.3 现有 workflow JSON 向后兼容验证（如涉及格式变更）

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互
- [ ] N.4.2 错误文案可读性检查

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查（仅测试文件例外）
- [ ] N.5.2 API 输入 Zod 验证覆盖（如涉及 API 变更）

---

## Layer 优先级执行策略

> 按优先级从高到低执行：engine > backend > editor > runtime > ui-skin > meta

- 同一 layer 内的 task 按 id 字母顺序执行
- 高 layer task 完成后才执行依赖它的低 layer task
- 跨层依赖时，允许依赖链存在，但不能跳过优先级倒置
