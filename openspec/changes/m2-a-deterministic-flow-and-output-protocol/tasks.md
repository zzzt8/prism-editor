# Tasks: M2-A — Deterministic Flow & Explicit Output Protocol

> **依赖**：无（M2-A 是 M2 阶段第一环）
> **阻塞**：M2-B 才能开始

---

## 1. `Flow` / `FlowNodeRef` / `FlowOutput` / `FlowOutputSlot` 类型与 JSON schema

- **id**: m2-a-t1
- **layer**: shared-protocol (`packages/shared-types/`)
- **status**: pending
- **verify**: `pnpm --filter @prism/shared-types typecheck && pnpm --filter @prism/shared-types test -- --run m2/flow`

### 验收标准

- [ ] 文件 `packages/shared-types/src/flow.ts` 存在；导出 `Flow` / `FlowNodeRef` / `FlowOutput` / `FlowOutputSlot` / `FlowKind` / `FlowKey`
- [ ] `FlowKey` 是带 brand 的 string 别名（type `string & { __brand: 'FlowKey' }`）
- [ ] `Flow.explicitOutputs` 包含 `nodeId` + `port`；`FlowOutputSlot` 不包含（仅 `slot` + `kind` + `mediaType?`）
- [ ] 所有 readonly；JSON round-trip 字段深度相等（单测覆盖）
- [ ] 文件 `packages/shared-types/src/validation/flow.schema.json` 存在；`ajv.compile` 通过
- [ ] `Flow.schemaVersion: 1`（初始版本）
- [ ] 单测覆盖：合法 Flow round-trip / 缺必填字段拒绝 / 多余字段拒绝 / `FlowKind` 非法值拒绝

---

## 2. `DesignState.flowKey` 收紧为 `FlowKey`

- **id**: m2-a-t2
- **layer**: shared-protocol
- **status**: pending
- **verify**: `pnpm --filter @prism/shared-types typecheck && pnpm --filter @prism/shared-types test -- --run m2/flow-key`

### 验收标准

- [ ] `packages/shared-types/src/design-state.ts` 中 `flowKey` 类型从 `string` 改为 `FlowKey`
- [ ] `packages/shared-types/src/validation/design-state.schema.json` 中 `flowKey.pattern` 更新为 `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$`，`maxLength: 96`
- [ ] 单测覆盖：合法 flowKey / 大写拒绝 / 前导分隔符拒绝 / 连续分隔符拒绝 / 长度超限拒绝
- [ ] M1 老 fixture（如 `preview` / `production-batch`）能继续 round-trip 通过校验（不破坏 M1-A baseline）
- [ ] `packages/shared-types/src/design-state.ts` 注释更新：明确"flowKey 不是封闭枚举；新增 flowKey 不需要修改 shared-types"

---

## 3. `RuntimeTemplate.flows[].explicitOutputs` 公开投影

- **id**: m2-a-t3
- **layer**: shared-protocol
- **status**: pending
- **verify**: `pnpm --filter @prism/shared-types typecheck && pnpm --filter @prism/shared-types test -- --run m2/runtime-template`

### 验收标准

- [ ] `packages/shared-types/src/runtime-template.ts` 中 `RuntimeTemplateFlow` 新增 `explicitOutputs: ReadonlyArray<FlowOutputSlot>`
- [ ] `RuntimeTemplateFlow.explicitOutputs` **不**包含 `nodeId` / `port`（公开护栏 §2.1）
- [ ] `packages/shared-types/src/validation/runtime-template.schema.json` 中 `flow.explicitOutputs` 字段仅 `{ slot, kind, mediaType? }`
- [ ] `RuntimeTemplate.schemaVersion` 升级为 `2`（破坏性变更）
- [ ] 单测覆盖：合法 RuntimeTemplate round-trip / 显式空 explicitOutputs 拒绝（Flow 必须声明输出）/ schemaVersion 非 2 拒绝
- [ ] `packages/shared-types/src/runtime-template.test.ts` 中 M1 旧 fixture 同步更新

---

## 4. `RenderRequest.requestedOutputSlots` 必填非空

- **id**: m2-a-t4
- **layer**: shared-protocol
- **status**: pending
- **verify**: `pnpm --filter @prism/shared-types typecheck && pnpm --filter @prism/shared-types test -- --run m2/render-request`

### 验收标准

- [ ] `packages/shared-types/src/render-request.ts` 中 `RenderRequest` 新增 `requestedOutputSlots: ReadonlyArray<string>`（必填）
- [ ] `RenderRequest` **不**包含 `flowKey` 字段（`additionalProperties: false` 阻止携带第二份 flowKey）
- [ ] `packages/shared-types/src/validation/render-request.schema.json` 中 `requestedOutputSlots.minItems: 1`，`maxItems: 64`
- [ ] `slot.pattern`: `^[a-zA-Z][a-zA-Z0-9._-]{0,127}$`
- [ ] `RenderRequest.schemaVersion` 升级为 `2`（破坏性变更）
- [ ] 单测覆盖：合法最小 RenderRequest / 缺 requestedOutputSlots 拒绝 / 携带 flowKey 拒绝 / 多未知 slot 拒绝

---

## 5. `RenderResult` 追溯字段 + 顺序稳定性

- **id**: m2-a-t5
- **layer**: shared-protocol
- **status**: pending
- **verify**: `pnpm --filter @prism/shared-types typecheck && pnpm --filter @prism/shared-types test -- --run m2/render-result`

### 验收标准

- [ ] `packages/shared-types/src/render-result.ts` 中 `RenderResult` 新增 `templateVersion: string`（必填；schema 校验 == `designState.templateVersion`，由 ajv post-validation 校验）
- [ ] `RenderResultOutput` 新增 `flowKey: FlowKey`（必填；schema 校验 == `designState.flowKey`）
- [ ] `packages/shared-types/src/validation/render-result.schema.json` 中 `RenderResult.schemaVersion: 2`；`outputs[].flowKey` 必填
- [ ] `outputs[].slot.pattern` 与 `RenderRequest.requestedOutputSlots` 一致
- [ ] 单测覆盖：合法 RenderResult round-trip / 缺 templateVersion 拒绝 / 缺 flowKey 拒绝 / outputs 顺序打乱后 ajv 通过但 `RenderResult.outputs` 顺序必须由 Flow.explicitOutputs 声明顺序决定（详见 M2-B；M2-A 仅校验 shape）

---

## 6. ajv validator 扩展（`validateFlow` / `validateFlowKey`）

- **id**: m2-a-t6
- **layer**: shared-protocol
- **status**: pending
- **verify**: `pnpm --filter @prism/shared-types typecheck && pnpm --filter @prism/shared-types test -- --run m2/validation`

### 验收标准

- [ ] `packages/shared-types/src/validation/index.ts` 新增 `validateFlow(input: unknown): asserts input is Flow` 与 `validateFlowKey(input: unknown): asserts input is FlowKey`
- [ ] ajv 自定义 keyword `uniqueFlowKey` 与 `uniqueSlot` 实现并通过单测
- [ ] `validateFlow` post-validation 校验 `explicitOutputs[].nodeId ∈ Flow.nodeRefs[].nodeId`（错误码 `OUTPUT_NODE_NOT_FOUND`）
- [ ] `validateRenderRequest` post-validation 校验 `requestedOutputSlots` 非空（错误码 `REQUESTED_OUTPUTS_EMPTY`）
- [ ] ajv 配置沿用 M1-A：`{ allErrors: true, strict: true, removeAdditional: false, useDefaults: true }`
- [ ] `pnpm-lock.yaml` **不修改**（保持 ajv ^8）；任何依赖调整标为阻塞并报告
- [ ] 单测覆盖：合法 Flow / 重复 flowKey 抛 `DUPLICATE_FLOW_KEY` / 重复 slot 抛 `OUTPUT_SLOT_DUPLICATE` / 引用不存在 nodeId 抛 `OUTPUT_NODE_NOT_FOUND` / requestedOutputSlots 为空抛 `REQUESTED_OUTPUTS_EMPTY` / ajv 错误信息含 JSON Pointer 路径

---

## 7. index 导出 + README + changelog

- **id**: m2-a-t7
- **layer**: shared-protocol
- **status**: pending
- **verify**: `pnpm --filter @prism/shared-types typecheck`

### 验收标准

- [ ] `packages/shared-types/src/index.ts` 追加 `export * from './flow'`
- [ ] `packages/shared-types/README.md` 增补"M2-A 公共契约"章节（FlowKey / Flow / FlowOutputSlot / RenderRequest.requestedOutputSlots / RenderResult 顺序规则）
- [ ] README 必须包含：版本策略（RenderRequest / RenderResult / RuntimeTemplate 升 `schemaVersion: 2`）、序列化约束、`asserts` 类型守卫说明、Mall 公开 vs 内部字段边界
- [ ] `docs/changelogs/2026-07-14-m2-a-deterministic-flow-and-output-protocol.md` 存在；记录 4 类型增量 + schema 升级 + 不破坏 M1 旧 fixture 验证结果
- [ ] 不修改现有类型或导出（仅追加）
- [ ] 不修改 `packages/shared-types/package.json`（M2-A 不引入新依赖）
- [ ] 不修改架构文档 / roadMap / guardrail / Cursor Rule
- [ ] 不修改 M0 / M1-A / M1-B 已 archived 产物
- [ ] `pnpm typecheck` 通过；`pnpm --filter @prism/shared-types test` 全部通过

---

## 依赖关系

```
T1 (Flow 类型 + schema) ──┐
T2 (flowKey 收紧)         │
T3 (RuntimeTemplate 投影) ├── 内部独立，全部完成才能 T6
T4 (RenderRequest slot)   │
T5 (RenderResult 追溯)    │
                          │
T6 (ajv 扩展 + 校验) ─── 依赖 T1-T5
T7 (导出 + README) ───── 依赖 T1-T6
```

---

## 回退方式

- 删除 `openspec/changes/m2-a-deterministic-flow-and-output-protocol/`
- `git checkout -- packages/shared-types/src/{design-state,render-request,render-result,runtime-template,index}.ts packages/shared-types/src/validation/*.schema.json packages/shared-types/src/validation/index.ts packages/shared-types/README.md`
- 删除 `packages/shared-types/src/flow.ts` 与 `packages/shared-types/src/__tests__/m2/`
- 删除 `docs/changelogs/2026-07-14-m2-a-deterministic-flow-and-output-protocol.md`
- 锁文件不需回滚（M2-A 不修改）