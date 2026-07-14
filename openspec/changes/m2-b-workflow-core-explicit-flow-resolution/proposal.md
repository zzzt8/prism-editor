# Proposal: M2-B — Workflow Core Explicit Flow Resolution

> **change_class**: high
> **reason**: 在 `@prism/workflow-core` 引入按 `(TemplateVersion, flowKey)` 精确定位唯一 `Flow` 的解析入口 `resolveFlow`；改写 `executeFromDesignState` 不再使用固定 M0 scenario 写死 DAG；消除 `ExecuteFromDesignStateOptions.params` 同义参数夹带；按 `Flow.explicitOutputs` 收集结果并按 `requestedOutputSlots` 过滤；同时定义 8 个稳定错误码。涉及 `@prism/workflow-core` 公开 API 扩展与内部实现重写（下游 `server` / `apps/dev-tool` 都将引用）；按 openspec-propose 规则为 `high`。
> **depends_on**: `m2-a-deterministic-flow-and-output-protocol`（M2-B 消费 M2-A 的 Flow / FlowOutput / FlowKey 契约）
> **blocks**: `m2-c-server-deterministic-render-entry`

---

## Why

M2-A 完成协议层 `Flow` / `FlowOutput` / `FlowKey` 契约与 schema 校验。M2-B 必须把该协议在 workflow-core 内真正消费：

1. **消除固定 M0 scenario 写死 DAG**：`packages/workflow-core/src/design-state-execution.ts:133-164` 当前 `buildWorkflowFromDesignState` 写死 4 节点 `load-image → transform → composite → export`。这违反 M2 路标"不再通过固定 M0 scenario 构建写死 DAG"。
2. **消除 `ExecuteFromDesignStateOptions.params` 同义参数夹带**：`packages/workflow-core/src/executor.ts:30-41` 当前 `ExecuteFromDesignStateOptions` 强制要求调用方传 `{ transformParams, compositeParams }`，但运行时所需参数应当来自 `DesignState.inputs` 自身的可序列化 inputs/parameters。
3. **实现 explicit-outputs 收集**：M2-A 定义了 `Flow.explicitOutputs` 权威输出声明；M2-B 必须按声明顺序收集输出，过滤 `requestedOutputSlots`，并禁止 `Object.keys(results).pop()` 之类隐式选择。
4. **双端一致性**：Browser / Node 共享同一解析语义；5 场景 fixture 重做 round-trip 不变。

`PRISM_ARCHITECTURE_GUARDRAILS §1.7` / `§1.8` 明确禁止 findFirst 与遍历顺序；`§1.4` 强制共享 DesignState 与参数语义。

---

## What Changes

1. **`packages/workflow-core/src/flow-resolver.ts`**（新文件）
   - `resolveFlow(templateVersion: TemplateVersion, flowKey: FlowKey): Flow`
   - `resolveTemplateVersion(templateId: string, version?: string): TemplateVersion`（version 缺省时取 current；不允许 findFirst 隐式选择第一条）
   - 抛出 `FlowResolverError extends Error`（8 个稳定错误码）
2. **`packages/workflow-core/src/flow-execution.ts`**（新文件）
   - `executeFlow(flow: Flow, designState: DesignState, options?): Promise<RenderResult>`
   - 内部消费 `Flow.explicitOutputs` 构建内部 DAG（保留 `Workflow` 内部形状私有化，不导出）
   - 输入参数从 `DesignState.inputs.params` 直接读取，不再要求调用方携带同义 `params`
3. **`packages/workflow-core/src/executor.ts`**
   - `executeFromDesignState` 改写为 `executeFromDesignState(designState, options?)`；`options.params` 字段移除（禁止同义参数夹带）
   - 入口先 `validateDesignState(designState)`，再 `resolveTemplateVersion(templateId, templateVersion)`，再 `resolveFlow(templateVersion, flowKey)`，最后 `executeFlow(flow, designState, options)`
   - 现有 `WorkflowExecutor.execute(workflow, options)` **不变**；M4 才删除
4. **`packages/workflow-core/src/design-state-execution.ts`**
   - 移除 `buildWorkflowFromDesignState` 写死 DAG 实现（迁移到 `flow-execution.ts` 内部）
   - 移除 `ExecuteFromDesignStateParams` 类型（同义参数夹带已消除）
   - `mapExecutorResultToRenderResult` 改写为 `mapFlowResultToRenderResult(flow, designState, ...)`：按 `flow.explicitOutputs` 顺序收集，按 `requestedOutputSlots` 过滤；输出顺序稳定
5. **`packages/workflow-core/src/errors.ts`**（新文件）
   - `FlowResolverError` 与 8 个错误码常量
6. **`packages/workflow-core/src/index.ts`**
   - 导出 `resolveFlow` / `resolveTemplateVersion` / `executeFlow` / `FlowResolverError` / 8 个错误码常量
   - **不再**导出 `ExecuteFromDesignStateParams`（破坏性变更）
7. **`packages/workflow-core/src/__tests__/m2/`**（新测试目录）
   - 12 套单测覆盖（详见 design.md §"测试策略"）
8. **`packages/image-ops/src/adapters/design-state-adapter.ts`**
   - 接受完整 `DesignState` 并仅消费 `inputs.params`；不再依赖 `ExecuteFromDesignStateParams`
   - **不**为每个品类硬编码；适配 5 场景 M0 fixture（M2-B 复用 M1-B baseline）
9. **`docs/changelogs/2026-07-14-m2-b-workflow-core-explicit-flow-resolution.md`**（新文件）

---

## Capabilities

### New Capabilities

- `flow-resolver`: 按 `(templateId, templateVersion, flowKey)` 精确定位唯一 Flow；消除 findFirst / 遍历顺序
- `flow-execution`: 按 `Flow.explicitOutputs` 收集输出，过滤 `requestedOutputSlots`，顺序稳定

### Modified Capabilities

无（公开 spec 不变；M2-A 的 `flow-and-output-protocol` 是协议侧，M2-B 是实现侧）

---

## Impact

| 范围 | 影响 |
|------|------|
| 新增文件 | `packages/workflow-core/src/flow-resolver.ts`、`packages/workflow-core/src/flow-execution.ts`、`packages/workflow-core/src/errors.ts`、`packages/workflow-core/src/__tests__/m2/*.test.ts`（12 个）、`docs/changelogs/2026-07-14-m2-b-workflow-core-explicit-flow-resolution.md` |
| 修改文件 | `packages/workflow-core/src/executor.ts`（`executeFromDesignState` 改写）、`packages/workflow-core/src/design-state-execution.ts`（移除 `ExecuteFromDesignStateParams` + 写死 DAG）、`packages/workflow-core/src/index.ts`（导出变更）、`packages/image-ops/src/adapters/design-state-adapter.ts`（移除同义 params 依赖）、`packages/image-ops/src/__tests__/m1/design-state-roundtrip.test.ts`（fixture 同步更新） |
| 触及层 | engine（`@prism/workflow-core` + `@prism/image-ops` adapter） |
| 数据库 | **无** |
| 公开 API | **移除** `ExecuteFromDesignStateParams`（破坏性变更，M2-B 必须文档化）；**新增** `resolveFlow` / `resolveTemplateVersion` / `executeFlow` / `FlowResolverError` / 8 个错误码常量 |
| Mall 接入 | **无** |
| 服务端 | **无改动**（M2-C 接入） |
| UI | **无改动**（M4 才动 UI） |

---

## Decisions（high class 必须 Section，引用 `design.md`）

详见 `design.md`：
- `flow-resolver` 内部实现：精确定位（不允许 findFirst），templateVersion 缺省时取 current 但需显式标注
- `executeFromDesignState` 不再要求 `options.params`；运行时所需参数从 `DesignState.inputs.params` 直接读取
- 输出收集按 `Flow.explicitOutputs` 声明顺序，按 `requestedOutputSlots` 过滤
- 8 个错误码常量：`FLOW_NOT_FOUND` / `DUPLICATE_FLOW_KEY` / `FLOW_OUTPUTS_MISSING` / `OUTPUT_SLOT_DUPLICATE` / `OUTPUT_NODE_NOT_FOUND` / `OUTPUT_PORT_NOT_FOUND` / `REQUESTED_OUTPUT_UNKNOWN` / `DECLARED_OUTPUT_NOT_PRODUCED`
- 保留 `WorkflowExecutor.execute()` 旧入口（M4 才删）
- Browser / Node 共享同一 `flow-resolver` + `executeFlow` 解析语义
- M0 metrics.json / fixtures 不动（baseline 复用）

---

## Out of Scope

- 不在 M2-B 引入 server 入口或 Prisma 迁移（M2-C）
- 不暴露内部 nodeId/port 到 Mall 公开协议
- 不删除 `WorkflowExecutor.execute()`（M4 才删）
- 不重写 `core/*` 算法
- 不修改 M0 metrics.json / fixtures（baseline 不变）
- 不为每个品类硬编码 flowKey / params
- 不实现 M3 / M4 / M6 / M7 范围