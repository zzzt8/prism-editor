# Proposal: M2-A — Deterministic Flow & Explicit Output Protocol

> **change_class**: high
> **reason**: 在 `@prism/shared-types` 引入 `Flow` / `FlowOutput` / `FlowOutputSlot` 三个跨包公开类型，并把 `DesignState.flowKey` 从"任意字符串"收紧为"格式受约束的稳定字符串"；为 `RenderRequest` / `RenderResult` / `RuntimeTemplate` 增加 explicit-outputs 语义；并更新 4 个 JSON schema + ajv 校验。涉及 `@prism/shared-types` 跨包接口扩展（下游 `@prism/workflow-core` / `@prism/image-ops` / `server` / `apps/dev-tool` 都将引用）；按 openspec-propose 规则为 `high`。
> **depends_on**: 无（M2-A 是 M2 阶段第一环）
> **blocks**: `m2-b-workflow-core-explicit-flow-resolution`

---

## Why

M1-A 把 fixture 输入抽象为 `DesignState` / `RenderRequest` / `RenderResult` / `RuntimeTemplate`（archived），M1-B 在 `WorkflowExecutor.executeFromDesignState` 实现了 DesignState 闭环（archived），但 M1 留下 3 个明确开口：

1. `DesignState.flowKey` 为自由 `string`（schema pattern: `^[a-z0-9][a-z0-9._-]{0,255}$`），没有 flowKey 跨端一致性和模板版本内唯一性的形式化语义保证。
2. 缺权威 `Flow` 类型：当前 `Workflow`（含 DAG / position / params）是引擎内部形状；RuntimeTemplate.flows[].nodes 只投影 `{id, type}`，没有 `explicitOutputs`，导致生产端只能 `findFirst` + `Object.keys(results).pop()` 隐式选最终输出（违反 `PRISM_ARCHITECTURE_GUARDRAILS §1.7 / §1.8`）。
3. RenderResult 缺追溯字段：M1 已经镜像 `designState`，但未强制按 Flow 声明顺序输出，未强制 `slot` 与 `flowKey` 映射。

`PRISM_MIGRATION_ROADMAP.md §2 M2` 明确要求：
> Flow 必须通过稳定 `flowKey` 选择；输出必须通过 `explicitOutputs` 声明；移除 `findFirst`、对象遍历顺序等非确定性选择。

M2-A 只做协议层，不做执行层。协议对齐后 M2-B 才能在 engine 中真正按 flowKey 解析、按 explicitOutputs 收集。

---

## What Changes

1. **`packages/shared-types/src/flow.ts`**（新文件）
   - `Flow`：单一不可变 Flow 定义；承载 `flowKey` + `nodeRefs[]` + `explicitOutputs[]`
   - `FlowNodeRef`：节点在 Flow 内的稳定引用 `{ nodeId, nodeType }`；不携带 position/params（仍是内部 DAG 细节）
   - `FlowOutput` / `FlowOutputSlot`：`{ slot, nodeId, port, kind, mediaType? }`
   - `FlowKind` 字符串枚举：`'image' | 'mask' | 'json' | 'metadata'`
2. **`packages/shared-types/src/design-state.ts`**
   - `DesignState.flowKey` 收紧为 `FlowKey` 字符串别名（同一 pattern：`^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$`，长度 1..96）
   - 不在 `DesignState` 中新增任何 `explicitOutputs` 字段（护栏 §1.3：不允许 Mall 业务/内部 DAG 信息泄露到 DesignState）
3. **`packages/shared-types/src/render-request.ts`**
   - 新增 `RenderRequest.requestedOutputSlots: ReadonlyArray<string>`（必填，至少 1 个；公开 slot 名）
   - `RenderRequest` 仍只承载 `designState + trace + options + requestedOutputSlots`
   - 不得携带 flowKey、nodeId、port、内部 DAG 信息
4. **`packages/shared-types/src/render-result.ts`**
   - `RenderResult.outputs` 顺序固定为 Flow.explicitOutputs 声明顺序（经过 requestedOutputSlots 过滤）
   - `RenderResult` 增加可选 `templateVersion: string` 字段（与 designState.templateVersion 必须一致），便于审计无需读 designState
   - `RenderResultOutput` 增加可选 `flowKey: string` 字段（与 designState.flowKey 必须一致）
5. **`packages/shared-types/src/runtime-template.ts`**
   - `RuntimeTemplateFlow` 扩展为 `{ flowKey, nodes, explicitOutputs }`
   - `explicitOutputs` 在 RuntimeTemplate 上只投影 `{ slot, kind, mediaType? }` 三项；**不**暴露 `nodeId` / `port`（Mall 公开护栏 §2.1）
6. **`packages/shared-types/src/validation/`**
   - 新增 `flow.schema.json`（Flow / FlowNodeRef / FlowOutput 类型契约）
   - 4 个已有 schema 同步更新：DesignState / RenderRequest / RenderResult / RuntimeTemplate
   - `index.ts` 暴露 `validateFlow(input)` / `validateFlowKey(input)`
7. **`packages/shared-types/src/index.ts`** 追加 `export * from './flow'`
8. **`packages/shared-types/src/__tests__/m2/`**（新测试目录）
   - 5 套单测覆盖：flowKey format / 重复 flowKey 失败 / 重复 slot 失败 / 引用不存在节点失败 / requestedOutputSlots 顺序稳定
9. **`packages/shared-types/README.md`** 增补"M2-A 公共契约"章节
10. **`docs/changelogs/2026-07-14-m2-a-deterministic-flow-and-output-protocol.md`**（新文件）

---

## Capabilities

### New Capabilities

- `flow-and-output-protocol`: Flow / FlowOutput / FlowOutputSlot 跨端契约；flowKey 稳定字符串语义；explicit-outputs 权威归属
- `runtime-template-explicit-outputs`: RuntimeTemplate 对外仅暴露 `slot + kind + mediaType?`，屏蔽 nodeId/port

### Modified Capabilities

无（M1 的 4 个契约 spec 不在本 change 内破坏；M2-A 仅做纯增量与字段语义收紧）

---

## Impact

| 范围 | 影响 |
|------|------|
| 新增文件 | `packages/shared-types/src/flow.ts`、`packages/shared-types/src/validation/flow.schema.json`、`packages/shared-types/src/__tests__/m2/*.test.ts`（3 个）、`docs/changelogs/2026-07-14-m2-a-deterministic-flow-and-output-protocol.md` |
| 修改文件 | `packages/shared-types/src/design-state.ts`（`flowKey` 别名收紧）、`packages/shared-types/src/render-request.ts`（新增 `requestedOutputSlots`）、`packages/shared-types/src/render-result.ts`（顺序稳定性 + 追溯字段）、`packages/shared-types/src/runtime-template.ts`（`explicitOutputs` 公开投影）、`packages/shared-types/src/validation/*.schema.json`（4 个同步）、`packages/shared-types/src/validation/index.ts`（新增 `validateFlow` / `validateFlowKey`）、`packages/shared-types/src/index.ts`（追加 export）、`packages/shared-types/README.md` |
| 触及层 | shared-protocol（`@prism/shared-types`）；engine / server / db 都不动 |
| 数据库 | **无** |
| 公开 API | **新增** `Flow` / `FlowNodeRef` / `FlowOutput` / `FlowOutputSlot` 4 类型 + `validateFlow` / `validateFlowKey` 2 校验函数；**收紧** `flowKey` pattern；**新增** `RenderRequest.requestedOutputSlots`；**新增** `RenderResult.templateVersion` / `RenderResultOutput.flowKey` |
| Mall 接入 | **无**（公开字段集合不变；只是新增 `explicitOutputs` 公开投影） |
| 依赖 | **无新增**（保持 ajv 现有 ^8） |

---

## Decisions（high class 必须 Section，引用 `design.md`）

详见 `design.md`：
- `flowKey` 收紧为格式受约束字符串（非封闭枚举）；pattern 与长度上限
- `Flow.explicitOutputs` 作为权威输出映射；nodeId/port 仅 Flow 内部可见
- `RuntimeTemplate.flows[].explicitOutputs` 只投影 `{ slot, kind, mediaType? }`，屏蔽 nodeId/port
- `RenderRequest.requestedOutputSlots` 为必填非空数组；顺序不影响输出
- `RenderResult.outputs` 顺序 = Flow.explicitOutputs 声明顺序（经 requestedOutputSlots 过滤）
- `DesignState.flowKey` 是唯一权威 flow 选择依据；RenderRequest 不得携带第二份 flowKey
- `RenderResult` 新增 `templateVersion` + `flowKey` 追溯字段
- ajv 配置沿用 M1-A 决策（`allErrors: true, strict: true, removeAdditional: false, useDefaults: true`）
- 不引入 ajv-formats / ajv-keywords / zod

---

## Out of Scope

- 不在 M2-A 引入 workflow-core 新方法（M2-B）
- 不在 M2-A 引入 server 入口或 Prisma 迁移（M2-C）
- 不暴露内部 `nodeId` / `port` 到 Mall 公开协议
- 不修改 M0 / M1-A / M1-B 已 archived 的产物
- 不引入新依赖；保持 ajv ^8
- 不为每个品类硬编码 flowKey
- 不实现 M7 完整品类参数系统
- 不引入 `findFirst` / `Object.keys` 隐式选择
- 不实现 UI / Mall / CORS / 新认证 / SKU / 订单 / 工厂账号