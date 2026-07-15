# flow-and-output-protocol Specification

> **Capability**: flow-and-output-protocol
> **Source change**: m2-a-deterministic-flow-and-output-protocol
> **Layer**: shared-protocol (`@prism/shared-types`)

## Purpose

定义跨端共享的 Flow 与 Explicit Output 契约：稳定 `flowKey` 字符串语义、权威 `Flow.explicitOutputs` 输出声明、`RenderRequest.requestedOutputSlots` 必填语义、`RenderResult` 顺序稳定与追溯字段。该契约同时屏蔽内部 `nodeId` / `port`，让 Mall 公开协议与 Prism 内部执行细节解耦。

---

## ADDED Requirements

### Requirement: FlowKey 格式约束

The system SHALL treat `DesignState.flowKey` as a format-constrained stable string identifier with the following properties:
- Pattern: `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$`
- Length: 1..96 characters
- The system SHALL NOT enumerate `flowKey` against any closed enum
- The system SHALL guarantee that, within a single immutable `TemplateVersion`, every `Flow.flowKey` is unique

#### Scenario: 合法 flowKey

- **WHEN** `DesignState.flowKey === 'preview.main'`
- **THEN** `validateDesignState` succeeds
- **AND** the value passes the pattern constraint

#### Scenario: 大写拒绝

- **WHEN** `DesignState.flowKey === 'Preview.Main'`
- **THEN** `validateDesignState` throws `ValidationError` with `DUPLICATE_FLOW_KEY` / pattern-mismatch detail

#### Scenario: 前导分隔符拒绝

- **WHEN** `DesignState.flowKey === '.preview'`
- **THEN** `validateDesignState` throws `ValidationError` with pattern-mismatch detail

#### Scenario: 连续分隔符拒绝

- **WHEN** `DesignState.flowKey === 'preview..main'`
- **THEN** `validateDesignState` throws `ValidationError` with pattern-mismatch detail

#### Scenario: 长度超限拒绝

- **WHEN** `DesignState.flowKey.length > 96`
- **THEN** `validateDesignState` throws `ValidationError` with maxLength-mismatch detail

---

### Requirement: Flow 权威定义

The system SHALL provide a `Flow` type that carries the authoritative output declaration for a single runtime flow. The `Flow` type MUST contain:
- `flowKey: FlowKey`
- `nodeRefs: ReadonlyArray<FlowNodeRef>` where each `FlowNodeRef` is `{ nodeId, nodeType }`
- `explicitOutputs: ReadonlyArray<FlowOutput>` where each `FlowOutput` is `{ slot, nodeId, port, kind, mediaType? }`

The `Flow` MUST be immutable and JSON-serializable. The system MUST NOT include `position` or `params` in `Flow` (those remain engine-internal DAG details exposed only to the runtime executor).

#### Scenario: 合法 Flow round-trip

- **WHEN** a `Flow` is serialized via `JSON.stringify` and parsed via `JSON.parse`
- **THEN** the parsed value is structurally identical to the original

#### Scenario: 缺 flowKey 拒绝

- **WHEN** a candidate `Flow` lacks `flowKey`
- **THEN** `validateFlow` throws `ValidationError`

---

### Requirement: Flow 内唯一性约束

Within a single `Flow` and within a `RuntimeTemplate.flows` array, the system SHALL enforce:
- No two `Flow.explicitOutputs` entries share the same `slot`
- No two `Flow` entries under the same `RuntimeTemplate` share the same `flowKey`

Violations SHALL be reported as `ValidationError` with `OUTPUT_SLOT_DUPLICATE` or `DUPLICATE_FLOW_KEY`.

#### Scenario: 重复 slot 拒绝

- **WHEN** a `Flow` declares two `explicitOutputs` entries with identical `slot`
- **THEN** `validateFlow` throws `ValidationError` with `OUTPUT_SLOT_DUPLICATE`

#### Scenario: 同一 TemplateVersion 下重复 flowKey

- **WHEN** a `RuntimeTemplate.flows` array contains two entries with the same `flowKey`
- **THEN** `validateRuntimeTemplate` throws `ValidationError` with `DUPLICATE_FLOW_KEY`

---

### Requirement: explicitOutputs 引用约束

The system SHALL reject any `Flow.explicitOutputs` entry whose `nodeId` is not declared in the same `Flow`'s `nodeRefs`. The check MUST be performed by `validateFlow` as part of post-schema validation.

Violations SHALL be reported as `ValidationError` with `OUTPUT_NODE_NOT_FOUND`.

#### Scenario: 引用不存在 nodeId

- **WHEN** `Flow.explicitOutputs[0].nodeId === 'export-print'` but `Flow.nodeRefs` does not contain any entry with `nodeId === 'export-print'`
- **THEN** `validateFlow` throws `ValidationError` with `OUTPUT_NODE_NOT_FOUND` and JSON Pointer path to the offending entry

---

### Requirement: RuntimeTemplate 公开字段屏蔽

The system SHALL NOT expose internal `nodeId` / `port` values in the public `RuntimeTemplate` projection. The `RuntimeTemplateFlow.explicitOutputs` field SHALL contain only `{ slot, kind, mediaType? }`. The `nodeId` and `port` fields MUST be reachable only through the internal `Flow` type.

#### Scenario: RuntimeTemplate 公开投影不含 nodeId

- **WHEN** a `RuntimeTemplate` is serialized via `JSON.stringify`
- **THEN** no field in the serialized payload contains the string `nodeId` or `port` other than as internal JSON Pointer metadata
- **AND** `RuntimeTemplate.schemaVersion === 2`

#### Scenario: Mall 可见范围

- **WHEN** a Mall client receives a `RuntimeTemplate`
- **THEN** the Mall client can read `flowKey`, `slot`, `kind`, `mediaType?` but MUST NOT have any path to retrieve `nodeId` or `port`

---

### Requirement: RenderRequest.requestedOutputSlots 必填非空

The system SHALL require every `RenderRequest` to include a non-empty `requestedOutputSlots: ReadonlyArray<string>` field. The system SHALL NOT allow `RenderRequest` to carry a separate `flowKey` field (additionalProperties: false enforces this). The system SHALL NOT carry `nodeId`, `port`, or any DAG-internal structure inside `RenderRequest`.

#### Scenario: 缺 requestedOutputSlots 拒绝

- **WHEN** a `RenderRequest` body lacks `requestedOutputSlots`
- **THEN** `validateRenderRequest` throws `ValidationError`

#### Scenario: requestedOutputSlots 为空数组

- **WHEN** a `RenderRequest` body has `requestedOutputSlots: []`
- **THEN** `validateRenderRequest` throws `ValidationError` with `REQUESTED_OUTPUTS_EMPTY`

#### Scenario: 携带第二份 flowKey 拒绝

- **WHEN** a `RenderRequest` body contains a `flowKey` field in addition to `designState.flowKey`
- **THEN** `validateRenderRequest` throws `ValidationError` due to `additionalProperties: false`

---

### Requirement: RenderResult 顺序稳定性

The system SHALL guarantee that `RenderResult.outputs` order is determined by the `Flow.explicitOutputs` declaration order, filtered by `RenderRequest.requestedOutputSlots`. The system SHALL NOT determine order by:
- `requestedOutputSlots` input order
- Object key iteration order
- Node execution completion order
- Any `findFirst` / implicit lookup

#### Scenario: requestedOutputSlots 顺序打乱后输出顺序稳定

- **WHEN** a render call has `RenderRequest.requestedOutputSlots === ['b', 'a', 'c']`
- **AND** the resolved `Flow.explicitOutputs` declares slots in order `['a', 'b', 'c']`
- **THEN** `RenderResult.outputs` order is `[a, b, c]` regardless of input order

#### Scenario: 节点完成顺序打乱后输出顺序稳定

- **WHEN** the executor completes nodes in non-declaration order
- **THEN** `RenderResult.outputs` order still follows `Flow.explicitOutputs` declaration order

---

### Requirement: RenderResult 追溯字段

The system SHALL include in `RenderResult`:
- `templateVersion: string` (must equal `designState.templateVersion`)
- `outputs[].flowKey: FlowKey` (must equal `designState.flowKey`)

These fields enable audit without unfolding the embedded `designState`.

#### Scenario: templateVersion 追溯

- **WHEN** a `RenderResult` is produced from a `RenderRequest`
- **THEN** `RenderResult.templateVersion === RenderRequest.designState.templateVersion`

#### Scenario: outputs[].flowKey 追溯

- **WHEN** a `RenderResult` is produced from a `RenderRequest`
- **THEN** for every entry in `RenderResult.outputs`, `entry.flowKey === RenderRequest.designState.flowKey`

---

### Requirement: M2-A 协议 schema 升级

The system SHALL bump `schemaVersion` for the affected contracts:
- `RenderRequest.schemaVersion: 2`
- `RenderResult.schemaVersion: 2`
- `RuntimeTemplate.schemaVersion: 2`
- `Flow.schemaVersion: 1` (initial version)
- `DesignState.schemaVersion: 1` (unchanged; M2-A is additive to DesignState shape)

#### Scenario: M1 老 RenderResult 不再被新 schema 接受

- **WHEN** a `RenderResult` lacks `templateVersion`
- **THEN** `validateRenderResult` (M2-A) throws `ValidationError` due to the required field

#### Scenario: M1 老 RuntimeTemplate 不再被新 schema 接受

- **WHEN** a `RuntimeTemplate` lacks `flows[].explicitOutputs`
- **THEN** `validateRuntimeTemplate` (M2-A) throws `ValidationError` due to the required field

---

### Requirement: 不引入新依赖

The system SHALL NOT modify `pnpm-lock.yaml` or introduce new npm packages during the M2-A change. The system SHALL continue to use `ajv ^8` with the configuration `{ allErrors: true, strict: true, removeAdditional: false, useDefaults: true }`.

#### Scenario: 锁文件不变

- **WHEN** M2-A is applied
- **THEN** `git diff pnpm-lock.yaml` is empty

---

### Requirement: 不暴露内部结构到 Mall

The system SHALL NOT add any field to `DesignState`, `RenderRequest`, or `RuntimeTemplate` that exposes internal `nodeId`, `port`, DAG structure, executor implementation, or any non-public engine detail to Mall consumers.

#### Scenario: DesignState 不携带 DAG 信息

- **WHEN** a Mall client inspects `DesignState` shape
- **THEN** the schema forbids `explicitOutputs`, `nodeId`, `port`, `position`, `params`

#### Scenario: RuntimeTemplate 不暴露 port

- **WHEN** a Mall client inspects `RuntimeTemplate.flows[].explicitOutputs`
- **THEN** the schema only allows `{ slot, kind, mediaType? }`