# Design: M2-A — Deterministic Flow & Explicit Output Protocol

## Context

M1-A（archived）交付 `DesignState` / `RenderRequest` / `RenderResult` / `RuntimeTemplate` 4 类型 + ajv 校验，把 M0 fixture 输入正式抽象为版本化 JSON 可序列化契约。M1-B（archived）在 `@prism/workflow-core` 实现 `executeFromDesignState` 闭环，并复用 M0 5 场景 fixture 验证 Browser / Node 几何一致性。

M1 留 3 个明确开口：

1. `DesignState.flowKey` 为自由 `string`（pattern `^[a-z0-9][a-z0-9._-]{0,255}$`），未形式化"不可变 TemplateVersion 内唯一"。
2. 缺权威 `Flow` 类型。当前 `RuntimeTemplateFlow` 只投影 `{ id, type }`，没有 `explicitOutputs`。
3. `RenderResult.outputs` 顺序不稳定——server 端只能 `Object.keys(results).pop()` 选最终节点（违反护栏 §1.8）。

`server/src/services/product-template-service.ts:177` 使用 `prisma.workflow.findFirst` 选择生产 Flow（违反护栏 §1.7）。这两个违规是 M2 路线图的直接命中点。

M2-A 解决第 1、第 2、第 3 条的协议层（共享类型 + schema + ajv 校验）。执行层修复放在 M2-B；server / Prisma 修复放在 M2-C。

---

## Goals / Non-Goals

**Goals:**

1. 定义稳定 `FlowKey` 字符串语义（pattern + 长度上限）
2. 定义权威 `Flow` 类型，包含 `flowKey` + `nodeRefs[]` + `explicitOutputs[]`
3. 把 `explicitOutputs` 作为 Flow 的内部权威；公开 RuntimeTemplate 只投影 `slot + kind + mediaType?`
4. 在 `RenderRequest` 增加必填非空 `requestedOutputSlots`
5. 在 `RenderResult` 增加 `templateVersion` + `flowKey` 追溯字段；固定 `outputs` 顺序为 Flow.explicitOutputs 声明顺序
6. 收紧 `DesignState.flowKey` 的格式约束
7. 提供 6 套语义校验（重复 flowKey / 重复 slot / 引用不存在节点 / 引用不存在 port / requestedOutputSlots 为空 / requestedOutputSlots 包含未声明 slot）
8. 不引入新依赖；保持 ajv ^8
9. 不暴露 `nodeId` / `port` 到 Mall 公开协议

**Non-Goals:**

- 不实现 workflow-core 的 flow 解析与执行（M2-B）
- 不实现 server 入口或 Prisma 迁移（M2-C）
- 不定义封闭 flowKey 枚举（违反护栏 §1.9 / 决定 #1）
- 不为每个品类硬编码 flowKey
- 不修改 M0 / M1 已 archived 产物
- 不引入 ajv-formats / ajv-keywords / zod
- 不实现 M3 / M4 / M6 / M7 范围

---

## Architecture Review

### 候选方案对比

| # | 方案 | 描述 | 决策 |
|---|------|------|------|
| A | `flowKey` 全局封闭枚举 `'preview' \| 'production'` | 简单但锁定 Flow 集合 | ❌ 违反护栏 §1.9："新增普通品类只能新增模板与 Flow 配置，不允许为新品类修改 Mall 前端主流程" |
| B | `flowKey` 为格式受约束字符串（非枚举） | JSON 可序列化；pattern 受约束；模板版本内唯一；不依赖数据库自增 | ✅ **采用**（决定 #1） |
| C | `explicitOutputs` 放在 `DesignState` | 调用方携带输出声明 | ❌ 违反护栏 §1.3 + §4：DesignState 不应承载内部 DAG 信息 |
| D | `explicitOutputs` 放在 `RenderRequest` | 请求层携带输出声明 | ❌ 同上；Mall 业务方无需也无法携带内部 nodeId/port |
| E | `explicitOutputs` 放在不可变 `Flow` 定义 | 模板内即权威；调用方通过 slot 字符串请求 | ✅ **采用**（决定 #2） |
| F | `RuntimeTemplate.flows[].explicitOutputs` 暴露完整内部结构（含 nodeId/port） | 简化实现 | ❌ 违反护栏 §2.1 Mall 可见范围 |
| G | `RuntimeTemplate.flows[].explicitOutputs` 仅暴露 `{ slot, kind, mediaType? }` | 公开与内部解耦 | ✅ **采用**（决定 #3） |
| H | `RenderResult.outputs` 顺序由 executor 完成顺序决定 | 隐式 | ❌ 违反护栏 §1.8 |
| I | `RenderResult.outputs` 顺序由 `requestedOutputSlots` 输入顺序决定 | 显式但易错 | ❌ 违反决定 #6：输入顺序不应影响结果顺序 |
| J | `RenderResult.outputs` 顺序由 `Flow.explicitOutputs` 声明顺序（经 requestedOutputSlots 过滤） | 显式 + 稳定 | ✅ **采用**（决定 #6） |

### 评审清单

- [x] 是否触及 Mall 业务模型？——否（Flow / FlowOutput 都是 Prism 内部；RuntimeTemplate 仅投影公开字段）
- [x] 是否恢复旧 user system？——否
- [x] 是否携带不可序列化对象？——否（纯字符串 + 枚举 + 字符串数组）
- [x] 是否引入 `findFirst` / 隐式遍历？——否（M2-A 仅协议层；执行层 M2-B 处理）
- [x] 是否暴露内部 nodeId/port 给 Mall？——否（决定 #3）
- [x] 是否限制公开 API 增量？——是：仅新增 4 类型 + 2 校验函数；收紧 flowKey pattern；新增 2 个 RenderResult 字段
- [x] 是否引入新 package？——否
- [x] 是否引入新数据库表？——否
- [x] 是否依赖具体执行器实现？——否（Flow / FlowOutput 不引用 `@prism/workflow-core` / `@prism/image-ops`）
- [x] 是否兼容 React 19 / Vite 6？——是（M2-A 与运行时无关；仅 shared-types 层编译）

---

## Decisions

### Decision 1: `flowKey` 收紧为格式受约束字符串（非封闭枚举）

**选择**：

```ts
export type FlowKey = string & { readonly __brand: 'FlowKey' };

// ajv pattern: ^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$
// minLength: 1, maxLength: 96
```

**理由**：
- `PRISM_ARCHITECTURE_GUARDRAILS §1.9` 要求"新增普通品类只能新增模板与 Flow 配置，不允许为新品类修改 Mall 前端主流程"。
- 品类和 Flow 数量会增长；封闭枚举会让每次新增都要发版 shared-types。
- `RuntimeTemplateFlow.flowKey` 必须自包含：单一 TemplateVersion 内的 `flowKey` 唯一性由 schema-level + 包内语义校验共同保证。
- 不依赖数据库自增顺序；不依赖 platform 推断 runtime 行为。
- `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$` 比 M1 pattern 更严格：禁止连续分隔符、禁止大写、禁止前导分隔符；96 字符上限足以覆盖 `factory.package.<feature>` 这类层级命名。

**示例（仅示例，不是枚举）**：
- `preview.main`
- `production.print`
- `production.mask`
- `factory.package`

**备选**：
- 封闭枚举 `'preview' | 'production'`——简单但违反护栏 §1.9，放弃
- `string` + 无 pattern——回到 M1 状态，flowKey 缺乏格式约束，放弃

### Decision 2: `explicitOutputs` 归属 Flow 定义

**选择**：

```ts
export interface FlowOutput {
  /** 公开 slot；M2-A 决定 pattern 与设计态一致 */
  readonly slot: string;
  /** Flow 内节点 ID（仅 Flow 内部可见） */
  readonly nodeId: string;
  /** 节点上 output port 名（仅 Flow 内部可见） */
  readonly port: string;
  /** 输出类型语义 */
  readonly kind: FlowKind;
  /** MIME/格式元数据（可选） */
  readonly mediaType?: string;
}

export interface FlowOutputSlot {
  /** 公开 slot 名 */
  readonly slot: string;
  /** 公开类型语义（用于 Mall 端 UI 提示 / 校验） */
  readonly kind: FlowKind;
  /** MIME/格式元数据（公开） */
  readonly mediaType?: string;
}

export type FlowKind = 'image' | 'mask' | 'json' | 'metadata';

export interface FlowNodeRef {
  readonly nodeId: string;
  readonly nodeType: string;
}

export interface Flow {
  readonly flowKey: FlowKey;
  readonly nodeRefs: ReadonlyArray<FlowNodeRef>;
  readonly explicitOutputs: ReadonlyArray<FlowOutput>;
}
```

**理由**：
- `Flow` 是不可变 runtime Flow 定义；承载权威输出映射。
- `explicitOutputs` 携带 `nodeId` + `port`，是 Flow 内部细节，仅在 server / engine 内部消费。
- Mall 公开协议（`RuntimeTemplateFlow.explicitOutputs`）只能看到 `{ slot, kind, mediaType? }`，符合护栏 §2.1 Mall 可见范围。

**备选**：
- 放在 `DesignState`——违反护栏 §1.3
- 放在 `RenderRequest`——同上，且 Mall 业务方无法构造 nodeId
- 用单字段 `slot → nodeId:port` 的 `Record<string, ...>`——失去顺序与去重约束，放弃

### Decision 3: RuntimeTemplate 公开投影屏蔽 nodeId/port

**选择**：

```ts
export interface RuntimeTemplateFlow {
  readonly flowKey: FlowKey;
  /** 最小节点投影（id + type）；M1 已确定 */
  readonly nodes: ReadonlyArray<{ readonly id: string; readonly type: string }>;
  /** 公开输出 slot 投影；**不**暴露 nodeId/port */
  readonly explicitOutputs: ReadonlyArray<FlowOutputSlot>;
}
```

**理由**：
- `RuntimeTemplate` 是公开契约，Mall 只能理解 `templateId` / `templateVersion` / `inputSchema` / `editableSchema` / `DesignState` / `RenderRequest` / `RenderResult` 公开部分。
- 内部 nodeId/port 是引擎实现细节，不应在 RuntimeTemplate 上出现。

### Decision 4: RenderRequest.requestedOutputSlots 为必填非空

**选择**：

```ts
export interface RenderRequest {
  readonly designState: DesignState;
  readonly requestedOutputSlots: ReadonlyArray<string>;  // M2-A 新增；minItems: 1
  readonly trace?: RenderRequestTrace;
  readonly options?: RenderRequestOptions;
}
```

**理由**：
- 必须显式声明要哪些输出 slot。
- 不允许"全部默认"——避免隐式行为；避免 M1 阶段"1 个输出"的默认值被滥用到生产。
- 不允许携带 `flowKey`、nodeId、port——DesignState.flowKey 已是唯一权威。

### Decision 5: RenderRequest 不得携带第二份 flowKey

**选择**：`RenderRequest` 不允许出现 `flowKey` 字段（schema `additionalProperties: false` 自动拒绝）。

**理由**：
- `DesignState.flowKey` 是唯一权威来源。
- 出现两份 flowKey 时若一致则双字段冗余；若不一致则歧义；两种都不应长期存在。
- M2-A 通过 schema 约束彻底消除歧义空间。

### Decision 6: RenderResult.outputs 顺序由 Flow 声明顺序决定

**选择**：

```ts
export interface RenderResult {
  readonly renderId: string;
  readonly designState: DesignState;
  readonly templateVersion: string;       // M2-A 新增；== designState.templateVersion
  readonly status: RenderResultStatus;
  readonly outputs: ReadonlyArray<RenderResultOutput>;
  readonly error?: RenderError;
  readonly timingMs: RenderTiming;
}

export interface RenderResultOutput {
  readonly id: string;
  readonly image: ImageRef;
  readonly slot: string;
  readonly flowKey: FlowKey;              // M2-A 新增；== designState.flowKey
}
```

**理由**：
- 输出顺序由 Flow.explicitOutputs 声明顺序（经 requestedOutputSlots 过滤）决定。
- 不依赖 requestedOutputSlots 输入顺序（决定 #4 拒绝）。
- 不依赖对象 key 顺序（护栏 §1.8）。
- 不依赖节点执行完成顺序（决定 #6 强制）。
- `templateVersion` + `flowKey` 字段让审计者无需展开 designState 即可定位来源。

### Decision 7: ajv 配置沿用 M1-A；不引入新依赖

**选择**：

```ts
new Ajv({
  allErrors: true,
  strict: true,
  removeAdditional: false,
  useDefaults: true,
})
```

**理由**：
- M1-A 已锁定 ajv ^8 配置。
- M2-A 不引入 ajv-formats（Flow / FlowOutput 字段不需要 `format: 'uri'` / `format: 'date-time'` 等额外格式约束）。
- M2-A 不引入 zod（M1-A 已评估并拒绝）。
- 任何 ajv 依赖调整会修改 `pnpm-lock.yaml`，标为阻塞（决定 #10）。

### Decision 8: 语义校验（schema-level + 包内 ajv 二次校验）

**选择**：6 套语义校验

| 校验项 | 实现 | 错误码 |
|--------|------|--------|
| 同一 TemplateVersion 内 `Flow.flowKey` 重复 | ajv 自定义 keyword `uniqueFlowKey` | `DUPLICATE_FLOW_KEY` |
| 同一 Flow 内 `Flow.explicitOutputs[].slot` 重复 | ajv 自定义 keyword `uniqueSlot` | `OUTPUT_SLOT_DUPLICATE` |
| `Flow.explicitOutputs[].nodeId` 不在 `Flow.nodeRefs[].nodeId` 中 | 包内 ajv post-validation | `OUTPUT_NODE_NOT_FOUND` |
| `Flow.explicitOutputs[].port` 不在节点定义上 | 包内 ajv post-validation（无节点定义时跳过；M2-B 引入节点定义后启用） | `OUTPUT_PORT_NOT_FOUND` |
| `RenderRequest.requestedOutputSlots` 为空 | schema `minItems: 1` | `REQUESTED_OUTPUTS_EMPTY` |
| `RenderRequest.requestedOutputSlots` 包含未在 Flow.explicitOutputs 声明的 slot | 包内 ajv post-validation（M2-A 仅校验 Flow-shape，不引入 Flow 关联；M2-B 加入 Flow 关联后启用） | `REQUESTED_OUTPUT_UNKNOWN` |

**理由**：
- 重复 flowKey / 重复 slot 是 schema-level 约束（ajv keyword 即可）。
- 引用节点 / port / slot 校验是 cross-field 约束；M2-A 在 `validateFlow(input)` 内做 post-validation。
- M2-A 不引入节点定义（node-definitions 包），port 存在性校验推迟到 M2-B 引入节点定义后启用。

### Decision 9: schemaVersion 升级策略

**选择**：

- `DesignState.schemaVersion: 1` 不变（M2-A 是 M1 协议的纯增量）。
- `RenderRequest` 增加 `requestedOutputSlots` 必填字段 → 升级为 `schemaVersion: 2`。
- `RenderResult` 增加 `templateVersion` + `outputs[].flowKey` 字段 → 升级为 `schemaVersion: 2`。
- `RuntimeTemplate` 增加 `flows[].explicitOutputs` 字段 → 升级为 `schemaVersion: 2`。
- `Flow` 新增类型，初始 `schemaVersion: 1`。

**理由**：
- 增加必填字段是破坏性变更（护栏 §1.5 / §3 要求版本化设计）。
- M2-A 在 schema 字段上加 `version: 2` 字面量，避免默默变更。
- M1 老消费者忽略未知字段仍能工作；但带 `requestedOutputSlots` 的新请求对老消费者是拒绝（ajv `removeAdditional: false`）。

**备选**：
- 全部保持 `schemaVersion: 1`——违反护栏 §3 版本化约束，放弃

### Decision 10: 依赖与锁文件策略

**选择**：M2-A 不修改 `pnpm-lock.yaml`；若 ajv 配置调整需要升级依赖，则标为阻塞并报告。

**理由**：
- explore 阶段已锁定 ajv ^8 配置。
- 任何 ajv 升级 / ajv-formats 引入 / 切换到 zod 都是越权（M2-A 仅协议层）。
- 锁文件变更需在 M2-A apply 阶段独立决策。

---

## 测试策略

### Unit（`packages/shared-types/src/__tests__/m2/`）

| 文件 | 覆盖 |
|------|------|
| `flow-key.test.ts` | pattern 合法 / 非法 / 长度上下限 / 大写拒绝 / 前导分隔符拒绝 / 连续分隔符拒绝 |
| `flow.test.ts` | Flow round-trip JSON / 节点引用校验 / slot 引用校验 / 重复 flowKey 失败 / 重复 slot 失败 / 不存在 nodeId 失败 |
| `render-request-explicit-outputs.test.ts` | requestedOutputSlots 必填非空 / 顺序不影响 round-trip / requestedOutputSlots 包含未声明 slot 失败（M2-A 端仅校验 shape；cross-flow 校验在 M2-B 启用） |

### 协议稳定性

- `JSON.parse(JSON.stringify(flow))` 与原对象字段深度相等（每个类型至少 1 测）
- 不允许 `Blob` / `File` / `Canvas` / `ImageBitmap` / `DOM` / `Function` / `Store` / `blob URL` 进入（护栏 §3）

---

## 错误模型

| 错误码 | 抛出位置 | 触发条件 |
|--------|----------|----------|
| `DUPLICATE_FLOW_KEY` | `validateFlow` | 同一输入内出现 2+ 同名 flowKey |
| `OUTPUT_SLOT_DUPLICATE` | `validateFlow` | 同一 Flow 内 explicitOutputs 含重复 slot |
| `OUTPUT_NODE_NOT_FOUND` | `validateFlow` | explicitOutputs.nodeId 不在 Flow.nodeRefs |
| `REQUESTED_OUTPUTS_EMPTY` | `validateRenderRequest` | requestedOutputSlots.length === 0 |
| `REQUESTED_OUTPUT_UNKNOWN` | `validateRenderRequest` post-validation（M2-B 启用） | requestedOutputSlots 包含 Flow 未声明 slot |
| `OUTPUT_PORT_NOT_FOUND` | `validateFlow` post-validation（M2-B 启用） | explicitOutputs.port 不在节点定义 |

错误统一通过 M1-A `ValidationError` 抛出（含 `target` + `errors[]`）。

---

## 兼容策略

- **不破坏 M1 旧消费方**：M1-A 老 RenderResult（无 `templateVersion` 字段）会被 M2-A 新 schema 拒绝；但 M1-A 老 schema 仍存在于 `packages/shared-types/src/validation/*.schema.json`，未被删除。M2-A 仅新增 `flow.schema.json` 与升级 4 个 schema。
- **依赖升级若需改 pnpm-lock**：标为阻塞。
- **公开字段新增**：M1 消费者忽略未知字段仍能读取 M2-A 输出（`templateVersion`、`outputs[].flowKey` 是新增；不删除 M1 已有字段）。

---

## 回滚方案

1. 删除 `openspec/changes/m2-a-deterministic-flow-and-output-protocol/`
2. `git checkout -- packages/shared-types/src/{design-state,render-request,render-result,runtime-template,index}.ts packages/shared-types/src/validation/*.schema.json packages/shared-types/src/validation/index.ts packages/shared-types/README.md packages/shared-types/package.json`
3. 删除 `packages/shared-types/src/flow.ts` 与 `packages/shared-types/src/__tests__/m2/`
4. 删除 `docs/changelogs/2026-07-14-m2-a-deterministic-flow-and-output-protocol.md`
5. 锁文件不需回滚（M2-A 不修改）

---

## 不做什么

- 不定义 flowKey 封闭枚举
- 不暴露 nodeId/port 给 Mall
- 不实现 flow 解析（M2-B）
- 不实现 server 入口（M2-C）
- 不修改 M0 / M1 已 archived 产物
- 不引入新依赖
- 不引入 ajv-formats / ajv-keywords / zod
- 不实现 UI / Mall / CORS / 新认证 / SKU / 订单 / 工厂账号