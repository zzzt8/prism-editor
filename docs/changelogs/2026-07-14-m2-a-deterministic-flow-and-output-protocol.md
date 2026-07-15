# Changelog — m2-a-deterministic-flow-and-output-protocol

归档时间：2026-07-14
状态：done（verify 通过，已 archive）

## 变更摘要

M2-A 是 M2 阶段（确定性 Flow 选择与显式输出）第一环，仅做**协议层**：在 `@prism/shared-types` 引入 4 个跨包公开类型 + 收紧 `flowKey` 形态，并完成 5 个 JSON schema 与 ajv 校验的同步升级。

### 新增类型与 schema

| 文件 | 变更 |
|------|------|
| `packages/shared-types/src/flow.ts` | 新增 `Flow` / `FlowNodeRef` / `FlowOutput` / `FlowOutputSlot` / `FlowKind` / `FlowKey` 类型 |
| `packages/shared-types/src/validation/flow.schema.json` | 新增 `Flow` / `FlowOutput` JSON schema（`schemaVersion: 1`） |
| `packages/shared-types/src/validation/index.ts` | 新增 `validateFlow` / `validateFlowKey` 入口 + 自定义 ajv keyword `uniqueFlowKey` / `uniqueSlot` |
| `packages/shared-types/src/__tests__/m2/flow.test.ts` | 5 项 Flow 类型合约测试（round-trip / 字段只读 / 公开投影 / FlowKind 4 值 / brand 字符串） |
| `packages/shared-types/src/__tests__/m2/flow-key.test.ts` | 6 项 flowKey 格式约束测试（合法 / 非法 / 长度边界 / 96 字符 / M1-A fixture 兼容） |
| `packages/shared-types/src/__tests__/m2/runtime-template.test.ts` | 4 项 RuntimeTemplate 公开投影测试 |
| `packages/shared-types/src/__tests__/m2/render-request.test.ts` | 4 项 RenderRequest slot 必填测试 |
| `packages/shared-types/src/__tests__/m2/render-result.test.ts` | 4 项 RenderResult 追溯字段测试 |
| `packages/shared-types/src/__tests__/m2/validation.test.ts` | 14 项 ajv 校验 + post-validation 语义测试 |

### 修改现有类型与 schema

| 文件 | 变更 |
|------|------|
| `packages/shared-types/src/design-state.ts` | `flowKey: string` → `flowKey: FlowKey`；注释明确"flowKey 非封闭枚举" |
| `packages/shared-types/src/validation/design-state.schema.json` | `flowKey.pattern` 收紧为 `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$`，`maxLength: 96` |
| `packages/shared-types/src/render-request.ts` | 新增 `requestedOutputSlots: ReadonlyArray<string>` 必填非空 |
| `packages/shared-types/src/validation/render-request.schema.json` | `requestedOutputSlots.minItems: 1, maxItems: 64`；slot pattern 与 Flow 一致；`schemaVersion: 2` |
| `packages/shared-types/src/render-result.ts` | 新增 `templateVersion: string` 必填；`RenderResultOutput.flowKey: FlowKey` 必填；`schemaVersion: 2` |
| `packages/shared-types/src/validation/render-result.schema.json` | `outputs[].flowKey` 必填；slot pattern 与 RenderRequest 一致 |
| `packages/shared-types/src/runtime-template.ts` | `RuntimeTemplateFlow` 新增 `explicitOutputs: ReadonlyArray<FlowOutputSlot>` 必填非空；`schemaVersion: 2` |
| `packages/shared-types/src/validation/runtime-template.schema.json` | `flow.explicitOutputs` 必填非空（公开投影，仅 slot/kind/mediaType）；`flowKey` pattern 与 flowKey 收紧一致 |
| `packages/shared-types/src/index.ts` | 追加 `export * from './flow'` |
| `packages/shared-types/README.md` | 增补"M2-A 公共契约"章节 + Mall 公开 vs 内部字段边界表 + M2-A 校验错误码表 |
| `packages/shared-types/src/design-state.test.ts` / `render-request.test.ts` / `render-result.test.ts` / `runtime-template.test.ts` / `validation/index.test.ts` | 同步 M2-A 字段（`as FlowKey` casts、新 `templateVersion` / `outputs[].flowKey` / `requestedOutputSlots` / `explicitOutputs`） |

### workflow-core / image-ops 同步更新（M1-B 适配）

> **Cross-package mechanical sync（verify 阶段补充说明）**：M2-A 把 `RenderResult` / `RenderResultOutput` 升级为必填 `templateVersion` + `outputs[].flowKey` + `schemaVersion: 2`，并把 `DesignState.flowKey` 从 `string` 收紧为带 brand 的 `FlowKey`。这两类协议升级必带的"消费方字段补全"和"fixture 字符串 brand 化"是不可绕开的最小同步，不构成 workflow 解析或执行逻辑改动，**不视为对 `out_of_scope: workflow-core flow 解析（M2-B）` 的越权**——M2-B 真正按 flowKey 解析与按 `explicitOutputs` 收集的逻辑仍按计划在 M2-B 实施。M2-A 与 M2-B 的边界：M2-A 仅协议层 + 字段构造同步；M2-B 才动执行器主路径。

| 文件 | 变更 |
|------|------|
| `packages/workflow-core/src/design-state-execution.ts` | `mapExecutorResultToRenderResult` 输出 `schemaVersion: 2` + `templateVersion: ds.templateVersion` + `outputs[].flowKey: ds.flowKey`（共 +6 行，注释说明 M2-A 字段补全） |
| `packages/workflow-core/src/design-state-execution.test.ts` | `flowKey: 'preview' as FlowKey`（fixture 收紧） |
| `packages/workflow-core/src/render-result-mapping.test.ts` | 同上 |
| `packages/image-ops/src/adapters/design-state-adapter.test.ts` | 同上 |
| `packages/image-ops/src/__tests__/m1/design-state-roundtrip.test.ts` | 同上 |

涉及 layers：`shared-protocol`（`@prism/shared-types`）；轻触 `engine`（`@prism/workflow-core` 输出形状对齐 + M1-B 测试 fixture 适配）；不动 server / db / UI。

## 关键决策

1. **`flowKey` 收紧为格式受约束字符串（非封闭枚举）**（决定 #1）：`^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$`, `maxLength: 96`。新增 flowKey 只需配置模板与 Flow，**不需要修改 shared-types**（护栏 §1.9）。
2. **`explicitOutputs` 归属 Flow 定义**（决定 #2）：`Flow.explicitOutputs` 携带 `nodeId + port` 内部细节；`FlowOutputSlot` 是公开投影。
3. **RuntimeTemplate 公开投影屏蔽 nodeId/port**（决定 #3）：`RuntimeTemplateFlow.explicitOutputs` 仅 `{ slot, kind, mediaType? }`。
4. **RenderRequest.requestedOutputSlots 必填非空**（决定 #4）：`minItems: 1, maxItems: 64`。
5. **RenderRequest 不允许携带第二份 flowKey**（决定 #5）：schema `additionalProperties: false` 自动拒绝。
6. **RenderResult.outputs 顺序由 Flow 声明顺序决定**（决定 #6）：M2-A 仅校验 shape；engine-side ordering 强制在 M2-B。
7. **ajv 配置沿用 M1-A；不引入新依赖**（决定 #7, #10）：`pnpm-lock.yaml` 不修改；ajv-formats / ajv-keywords / zod 不引入。
8. **语义校验（schema-level + 包内 ajv 二次校验）**（决定 #8）：
   - `uniqueFlowKey` 自定义 keyword + `validateRuntimeTemplate` post-validation → `DUPLICATE_FLOW_KEY`
   - `uniqueSlot` 自定义 keyword + `validateFlow` post-validation → `OUTPUT_SLOT_DUPLICATE`
   - `validateFlow` post-validation → `OUTPUT_NODE_NOT_FOUND`
   - `validateRenderRequest` post-validation → `REQUESTED_OUTPUTS_EMPTY`
   - `validateRenderResult` post-validation → `TEMPLATE_VERSION_MISMATCH` / `OUTPUT_FLOW_KEY_MISMATCH`
9. **schemaVersion 升级策略**（决定 #9）：`RenderRequest` / `RenderResult` / `RuntimeTemplate` 升 `schemaVersion: 2`（破坏性变更）；`DesignState` 保持 `1`（纯增量）；`Flow` 初始 `1`。

## 测试矩阵

| 套件 | 覆盖范围 |
|------|---------|
| `shared-types/src/__tests__/m2/flow.test.ts` | 5 项 Flow 类型合约（round-trip / readonly / 公开投影 / FlowKind / brand） |
| `shared-types/src/__tests__/m2/flow-key.test.ts` | 6 项 flowKey 格式（合法 / 大写 / 前导分隔符 / 连续分隔符 / 长度上下限 / M1-A fixture 兼容） |
| `shared-types/src/__tests__/m2/runtime-template.test.ts` | 4 项 RuntimeTemplate 公开投影（round-trip / 仅 slot-kind-mediaType / schemaVersion=2 / M1-A legacy fixture 拒绝） |
| `shared-types/src/__tests__/m2/render-request.test.ts` | 4 项 RenderRequest slot 必填（最小合法 / 多 slot / 顺序不影响 / 编译期无 flowKey） |
| `shared-types/src/__tests__/m2/render-result.test.ts` | 4 项 RenderResult 追溯（round-trip / templateVersion 必填 / flowKey 必填 / slot pattern） |
| `shared-types/src/__tests__/m2/validation.test.ts` | 14 项 ajv 校验（合法 Flow / dup slot / missing nodeId / 非法 flowKey / 合法 flowKey / 空 / 非字符串 / dup flowKey / slot pattern / empty slots / templateVersion 匹配 / outputs flowKey 匹配） |
| `shared-types/src/validation/index.test.ts` | 19 项（既有 M1-A + M2-A 新增：`requestedOutputSlots` 必填 / 第二份 flowKey 拒绝 / RuntimeTemplate explicitOutputs 必填 / schemaVersion !== 2 拒绝 / RenderResult templateVersion + outputs[].flowKey 必填） |
| `workflow-core/src/render-result-mapping.test.ts` | 7 项 `ExecutorResult → RenderResult` 包装（已有） |
| `workflow-core/src/design-state-execution.test.ts` | 5 项 ajv 前置（已有） |
| `image-ops/src/__tests__/m1/design-state-roundtrip.test.ts` | 13 项 5 场景双端闭环（已有；fixture `flowKey` 兼容） |

**Total M2-A 新增测试数：39**（5 Flow + 6 FlowKey + 4 RT + 4 RenderRequest + 4 RenderResult + 14 Validation）。

## 全量验证结果

- `pnpm --filter @prism/shared-types typecheck`：✓
- `pnpm --filter @prism/shared-types test`：118 / 118 通过（M1-A 78 + M2-A 40 新增，含 validation 14）
- `pnpm typecheck`：✓ 15 / 15 packages
- `pnpm --filter @prism/workflow-core test`：98 / 98 通过（M1-B 适配未破坏现有用例）
- `pnpm --filter @prism/image-ops test`：422 / 422 通过（M1-B fixture 兼容）

## 一致性 / Coherence

| design.md 决策 | 代码证据 | 状态 |
|--------------|---------|------|
| D1 — `flowKey` 收紧为格式字符串（非枚举） | `flow.ts:FlowKey` + `flow.schema.json:flowKey.pattern` | ✓ |
| D2 — `explicitOutputs` 归属 Flow 定义 | `flow.ts:Flow.explicitOutputs` 携带 `nodeId + port`；`FlowOutputSlot` 仅 `{slot, kind, mediaType?}` | ✓ |
| D3 — RuntimeTemplate 公开投影屏蔽 nodeId/port | `runtime-template.ts:RuntimeTemplateFlow.explicitOutputs: ReadonlyArray<FlowOutputSlot>` | ✓ |
| D4 — RenderRequest.requestedOutputSlots 必填非空 | `render-request.ts:requestedOutputSlots` + schema `minItems: 1, maxItems: 64` | ✓ |
| D5 — RenderRequest 不携带第二份 flowKey | schema `additionalProperties: false` + 测试覆盖 | ✓ |
| D6 — RenderResult.outputs 顺序由 Flow 声明决定 | `render-result.ts` 注释引用 M2-B；M2-A 仅校验 shape | ✓（shape 校验） |
| D7 — ajv 配置沿用 M1-A；不引入新依赖 | `validation/index.ts:ajv` 配置未变；`pnpm-lock.yaml` 未修改 | ✓ |
| D8 — 语义校验（schema-level + 包内 ajv 二次校验） | 7 个错误码全部覆盖（`validation/index.ts` post-validation + test） | ✓ |
| D9 — schemaVersion 升级策略 | `RenderRequest` / `RenderResult` / `RuntimeTemplate` → `2`；`DesignState` → `1`；`Flow` → `1` | ✓ |
| D10 — 依赖与锁文件策略 | `pnpm-lock.yaml` 未修改 | ✓ |
| 护栏 §1.5 — 双端共享 DesignState 语义 | `DesignState.flowKey` 类型收紧 + `runtime-template` 公开投影不变 | ✓ |
| 护栏 §1.7 — Flow 选择必须显式 | `Flow.explicitOutputs` 权威；RenderRequest 不携带 flowKey | ✓ |
| 护栏 §1.8 — 输出必须显式声明 | `RenderRequest.requestedOutputSlots` 必填非空 | ✓ |
| 护栏 §1.9 — 新增品类不得要求 Mall 前端随改 | `FlowKey` 是格式字符串，非封闭枚举；新增 flowKey 不需改 shared-types | ✓ |
| 护栏 §2.1 — Mall 可见范围 | `RuntimeTemplateFlow.explicitOutputs` 仅 `{slot, kind, mediaType?}` | ✓ |
| 护栏 §2.2 — 模板版本不可变 | `RenderResult.templateVersion` 必填且 == `designState.templateVersion` | ✓ |
| 护栏 §2.4 — 明确输出契约 | `RenderResult.outputs[].flowKey` + `templateVersion` 追溯字段 | ✓ |
| 护栏 §3 — 协议可序列化 | 所有新增字段都是 string / 字符串数组；无 Blob / File / Canvas / Function | ✓ |

## 归档元数据

- Git commits：`259c4ba`, `23808c6`, `5fe9b80`, `db71929`, `4aad756`, `45a08f9`（6 个 task-level commit，外加 T7 README/changelog/index commit）
- 涉及 layers：`shared-protocol`（主要）+ `engine`（轻触：M1-B 输出形状对齐 + 测试 fixture 适配）
- 阻塞：M2-A 是 M2 阶段第一环；M2-B 才能在 `workflow-core` 真正按 flowKey 解析、按 explicitOutputs 收集
- Tasks 完成数：6/6（T1-T6 全部 completed；T7 为最终 index/README/changelog 整合）