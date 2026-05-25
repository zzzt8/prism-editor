## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

> **验证命令必须可执行**。禁止写"手工验收"作为验证方式（除非标记为 optional）。
> 机器能做的先让机器做：命令行验证 > 单元测试 > API 测试。

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| engine | 单元测试 | `pnpm test --filter=@prism/workflow-core --run && pnpm test --filter=@prism/image-ops --run` |
| backend | API 验证 + 数据迁移 | `pnpm test --filter=@prism/server --run && pnpm --filter=@prism/server exec prisma migrate status` |
| editor | 类型检查 | `pnpm typecheck --filter=@prism/dev-tool` |
| runtime | Smoke test | `pnpm typecheck --filter=@prism/user-app` |

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

## 任务列表（按 change_class 生成）

### change_class = low / medium

纯 checkbox，**不使用** opsx-meta 块：

```markdown
- [ ] T1: <描述>
  - 验证命令：<具体命令>
- [ ] T2: <描述>
  - 验证命令：<具体命令>
```

### change_class = high

使用 opsx-meta 块：

```html
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
```

> **layer 取值**：editor | runtime | backend | engine | ui-skin | meta
>
> **verify 取值**：
> - `command: <具体命令>` — 命令行验证，如 `pnpm typecheck --filter=@prism/server`
> - `unit-tests` — 单元测试覆盖
> - `golden-fixture` — Golden fixture 验证
> - `api-tests` — API 测试覆盖
> - `smoke-test` — Smoke test 覆盖
> - `manual (optional)` — **仅限**纯 UI/纯主观判断，不阻断任何流程

> **禁止**：不带 `(optional)` 的 `manual`。不带具体命令的 `verify`。
>
> **验收标准写法规则**：必须写成**可观测、可验证**的条件。
> - 好：`pnpm exec tsc --noEmit 无错误`
> - 好：`pnpm test --filter=@prism/workflow-core --run`
> - 好：`grep "getPublishedWorkflow" server/src/routes/` → 确认端点存在
> - 差：`用户保存后数据不丢失`（需要运行时验证 → 拆成子任务或标为 manual (optional)）
> - 差：`保持原有行为`（什么叫"原有行为"？）
>
> 如果验收标准涉及运行时行为，拆成两个 sub-task：代码可验证的 + 标记为 `manual (optional)` 的。

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。
> **选择性应用**：只添加与 change 直接相关的 N.x 章节，无关的不写。
> - N.1 执行引擎完整性 → 仅 engine / workflow-core 改动
> - N.2 状态一致性 → 仅涉及 Zustand store / 状态机
> - N.3 Registry 与 API 契约 → 仅 backend / server / API 改动
> - N.4 交互完整性 → 仅 UI 组件 / 前端交互改动
> - N.5 安全与类型 → 仅 security / API / type 系统改动

### N.1 执行引擎完整性

- [ ] N.1.1 拓扑排序测试覆盖：`pnpm test --filter=@prism/workflow-core --run -- --grep "topo"`
- [ ] N.1.2 节点 executor 错误隔离测试：`pnpm test --filter=@prism/workflow-core --run -- --grep "error"`
- [ ] N.1.3 AbortController 链路测试：`pnpm test --filter=@prism/workflow-core --run -- --grep "abort"`

### N.2 状态一致性

- [ ] N.2.1 Canvas 执行状态机转换测试：`pnpm test --filter=@prism/dev-tool --run -- --grep "execution"`
- [ ] N.2.2 取消后 Zustand store 状态检查：`pnpm test --filter=@prism/dev-tool --run -- --grep "cancel"`

### N.3 Registry 与 API 契约

- [ ] N.3.1 Node Registry 重复注册报错验证：`grep -r "already registered" packages/core/src/`
- [ ] N.3.2 Prisma migration 验证：`pnpm --filter=@prism/server exec prisma migrate status`
- [ ] N.3.3 现有 workflow JSON 向后兼容验证（如涉及格式变更）

### N.4 交互完整性

> 仅涉及 UI/交互时填写。纯逻辑改动不需要。

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互：`grep -r "onClick={() => {}" apps/dev-tool/src/`
- [ ] N.4.2 错误文案可读性检查：手动（optional）

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查（仅测试文件例外）：`grep -r " as any" --include="*.ts" --include="*.tsx" --exclude="*.test.ts" --exclude="*.spec.ts" packages/ apps/`
- [ ] N.5.2 API 输入 Zod 验证覆盖：`grep -r "z\.object\|z\.string\|z\.number" server/src/schemas/`

---

## Layer 优先级执行策略

> 仅适用于 change_class = medium 或 high。change_class = low 时跳过此节。

- 按优先级从高到低执行：engine > backend > editor > runtime > ui-skin > meta
- 同一 layer 内的 task 按 id 字母顺序执行
- 高 layer task 完成后才执行依赖它的低 layer task
- 跨层依赖时，允许依赖链存在，但不能跳过优先级倒置
