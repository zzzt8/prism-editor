# Prism Editor 全局质量与交付规范

> [!IMPORTANT]
> 本文档定义了 Prism Editor 项目所有功能开发与迁移的最高质量准则。任何新的 OpenSpec 提议必须显式引用并遵循本规范。

---

## 1. 执行引擎完整性（最高优先级）

### 1.1 拓扑排序正确性

- **要求**：拓扑排序必须覆盖所有节点，且顺序与依赖关系一致
- **强制检查**：cycle detection 必须触发过 `wouldCreateCycle()` 测试
- **测试覆盖**：必须包含 cycle detection 的测试用例

### 1.2 节点级错误隔离

- **原则**：单个节点执行失败不得导致整条流水线崩溃
- **要求**：每个 executor 必须用 `try/catch` 包装，错误时返回 `NodeResult { status: 'error' }`，流水线继续执行下游节点
- **禁止**：在 executor 内部向上抛出未捕获的异常

### 1.3 Cancellation 完整性

- **要求**：取消操作必须满足三点：已完成的节点结果保留、当前执行节点停止、后续节点不再调度
- **链路检查**：AbortController signal 必须从 `executionService.cancel()` 一路传递到每个 executor 的 `ctx.signal`
- **状态一致性**：取消后 canvas store 的执行状态必须转换到 `cancelled` 或 `idle`，不得停留在 `running`

### 1.4 变更不得引入静默跳过

- **要求**：修改 `topological sort` 或 `executor.ts` 后，必须验证：原本能正常执行的流水线在改动后行为一致（包含 cycle detection 的流水线确实报错）

---

## 2. Canvas 状态一致性

### 2.1 执行状态机有效性

- **状态转换**：`idle` ↔ `running` ↔ `done` / `cancelled` / `error`
- **禁止**：从 `running` 直接跳到 `running`（re-entrancy），从非 `running` 状态触发 `cancel()`
- **要求**：每个状态转换前检查当前状态是否允许该转换

### 2.2 Node Results 清理

- **要求**：新一次执行开始前，必须清理上一次的结果；取消后不得保留正在执行节点的 partial result
- **检查**：`executeWorkflow()` 被调用时，前一次执行的 node results 应被清空

---

## 3. Node Registry 不变量

### 3.1 注册唯一性

- **要求**：同一 `node type` 不得重复注册，已注册的 type 再次调用 `registerNode()` 必须抛出 `Error("Node type already registered: {type}")`
- **检查**：新增节点类型时，验证 registry 中不存在同名 type

### 3.2 Definition-Executor 对称性

- **要求**：每个注册到 registry 的 node definition 必须有对应的 executor，反之亦然
- **验证时机**：模块初始化时，`globalRegistry.initialize()` 完成后验证 `_definitions.size === _executors.size`

### 3.3 初始化顺序

- **要求**：executor 引用必须在 node definitions 初始化之后执行，避免引用未定义的对象
- **检查**：新增 node package 时，确认 registry 先初始化再注册 executor

---

## 4. API 契约稳定性

### 4.1 Prisma Schema 兼容性

- **原则**：数据库迁移必须是 additive 的（新增字段/表），不得删除已有字段
- **要求**：任何字段删除必须先确认无生产数据，再通过 migration 处理
- **禁止**：不得在 migration 中同时做 schema 变更和代码逻辑变更

### 4.2 Workflow JSON 格式

- **要求**：workflow JSON 的解析必须向后兼容旧版本保存的格式
- **验证**：修改 `toWorkflow()` / `fromWorkflow()` 时，确保现有保存的 workflow JSON 能被正确加载
- **breaking change**：必须在 proposal 中明确声明，并写入 `Out of Scope` 作为非目标

### 4.3 节点包 manifest 契约

- **要求**：manifest schema 变更必须向后兼容（已有节点包仍能被加载）
- **验证**：修改 `validateManifest()` 后，测试已有的节点包 manifest 仍能通过验证

---

## 5. Node Package 安全

### 5.1 URL 白名单

- **强制**：所有远程节点包必须经过 URL 白名单验证（`isUrlAllowed()`）
- **禁止**：跳过白名单检查直接加载 URL

### 5.2 Manifest 验证

- **强制**：manifest 加载后必须经过 `safeValidateNodePackage()` 验证
- **禁止**：加载未验证的 manifest 到 registry

### 5.3 Web Worker 隔离

- **要求**：使用 `importScripts()` 加载的 executor 必须确保不依赖 DOM API
- **验证**：新增 Web Worker executor 后，确认 Worker 环境中无 `document` / `window` 引用

---

## 6. 交互完整性

### 6.1 禁止占位交互

- **准则**：所有按钮、链接、快捷键必须绑定真实事件处理
- **禁止**：提交 `onClick={() => {}}` 或 `console.log("TODO")` 形式的占位交互
- **检查**：PR 提交前，搜索全代码库确认无 `onClick={() => {}}` 模式

### 6.2 错误提示可读性

- **要求**：用户可见的错误信息必须使用人类可读文案，不得暴露内部堆栈
- **转换点**：executor 捕获的异常在 UI 层展示前必须经过错误文案映射

---

## 7. 类型安全

### 7.1 无 `any` 逃逸

- **原则**：不得使用 `as any` 绕过类型检查
- **例外**：仅限测试文件中的 mock 对象，且必须有 `// eslint-disable` 注释说明原因

### 7.2 API 边界验证

- **要求**：所有 API 请求的输入必须经过 Zod schema 验证，验证失败返回 400 而非 500
- **检查**：新增 API route 时，确认所有输入字段都有对应的 schema 定义

---

## 8. 测试规范

### 8.1 必须覆盖的路径

以下代码路径必须包含测试用例：

| 代码路径 | 最低测试要求 |
|---------|-------------|
| `topological sort` | 正常顺序、cycle detection、单节点、孤立节点 |
| `executor.ts` execute() | 正常执行、节点报错继续下游、TypeMismatchError |
| `AbortController` chain | 取消后结果保留、signal 传递到 executor |
| `node registry` | 重复注册报错、definition/executor 对称性 |
| API routes | CRUD + 权限边界 |

### 8.2 测试可重复性

- **要求**：所有 vitest 测试必须幂等，不依赖外部网络、文件系统状态或 timing
- **禁止**：在测试中使用 `setTimeout` 或 sleep，必须用 `vi.useFakeTimers()` 替代

---

## 9. 合并准入标准（Merge Gates）

- 逻辑缺失、节点执行崩溃、或交互无响应的代码**严禁**合入 main 分支
- topological sort / abort chain 相关的改动必须附带测试用例
- Prisma migration 合入前必须确认 `pnpm --filter=@prism/server exec prisma migrate status` 通过

---

## 附录：OpenSpec Artifact 引用模板

> 以下模板为软约束，建议在创建新 change 时参考引用。

### A. proposal.md 中的引用位置

在 `proposal.md` 末尾添加：

```markdown
## 质量与测试规范要求

本需求严格遵循 [项目全局质量与交付规范](../QUALITY_STANDARDS.md)。

### 本需求的执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 是 / 否 | 单元测试 |
| 节点级错误隔离 | 是 / 否 | 错误场景测试 |
| Cancellation 完整性 | 是 / 否 | 取消操作测试 |
| Canvas 状态一致性 | 是 / 否 | 状态机测试 |
| Node Registry 不变量 | 是 / 否 | 注册冲突测试 |
| API 契约稳定性 | 是 / 否 | 向后兼容测试 |
| Node Package 安全 | 是 / 否 | 白名单 + manifest 验证测试 |
| 交互完整性 | 是 / 否 | 手工验收 |

### 验收要求

- [ ] 本需求已覆盖所有涉及的质量检查维度
- [ ] 新增 executor 路径已包含 try/catch 包裹
- [ ] 涉及取消/状态机的逻辑已测试
```

### B. design.md 中的引用位置

在 `design.md` 的 `## Risks / Trade-offs` 章节后添加：

```markdown
## 质量合规性

本设计遵循 [项目全局质量与交付规范](../QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- 拓扑排序：[是否改动 / 改动影响]
- 节点级错误隔离：[executor 清单 / 错误处理方案]
- Cancellation 链路：[哪些节点参与取消 / signal 传递路径]

### 不变量检查

- Node Registry：[新增 type / 复用现有]
- API 契约：[是否涉及 schema 变更 / 向后兼容方案]

### 测试策略

- [ ] 单元测试：拓扑排序 + cycle detection
- [ ] 集成测试：executor 报错 → 下游节点继续
- [ ] 手工验收：取消操作 → 结果保留验证
```

### C. tasks.md 中的必含章节

> [!IMPORTANT]
> 每个 change 的 `tasks.md` **必须**在末尾包含"质量合规性验收"章节。

```markdown
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
- [ ] N.3.2 Prisma migration 验证（`prisma migrate status`）
- [ ] N.3.3 现有 workflow JSON 向后兼容验证（如涉及格式变更）

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互
- [ ] N.4.2 错误文案可读性检查

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查（仅测试文件例外）
- [ ] N.5.2 API 输入 Zod 验证覆盖（如涉及 API 变更）

---

**完成标准**：N.1 ~ N.5 全部勾选后，方可标记 change 为 completed 并申请合并。
```

### D. 快速检查清单

创建新 change 时，对照以下清单：

|| 检查项 | 涉及维度 | 说明 |
|-------|---------|------|
| 拓扑排序改动？ | N.1.1 | 必须附 cycle detection 测试 |
| executor 新增/修改？ | N.1.2 | 必须 try/catch 包裹 |
| 涉及取消/状态机？ | N.1.3, N.2 | 必须测试取消链路 |
| Node Registry 变更？ | N.3.1 | 必须验证唯一性 |
| Prisma schema 变更？ | N.3.2 | 必须向后兼容 + migrate status |
| workflow JSON 格式变更？ | N.3.3 | 必须向后兼容验证 |
| UI 改动？ | N.4 | 必须无占位交互 |
| API 变更？ | N.5.2 | 必须 Zod schema 验证 |
