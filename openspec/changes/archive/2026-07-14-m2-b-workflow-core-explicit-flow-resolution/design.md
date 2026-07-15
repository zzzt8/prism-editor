# Design: M2-B — Workflow Core Explicit Flow Resolution

## Context

M2-A（proposal）完成 `Flow` / `FlowOutput` / `FlowKey` / `FlowOutputSlot` 协议契约与 ajv 校验。M1-B（archived）在 `packages/workflow-core/src/executor.ts` 提供 `WorkflowExecutor.executeFromDesignState(designState, options)`，其中 `options` 强制要求调用方传 `params: { transformParams, compositeParams }`（同义参数夹带）；`packages/workflow-core/src/design-state-execution.ts` 的 `buildWorkflowFromDesignState` 写死 4 节点 `load-image → transform → composite → export`（固定 M0 scenario）；`mapExecutorResultToRenderResult` 仅从 `export` 节点抽 1 帧（违反 M2 路标"按 explicitOutputs 声明收集"）。

M2-B 必须：

1. 引入 `flow-resolver`：按 `(templateId, templateVersion, flowKey)` 精确定位唯一 Flow。
2. 引入 `flow-execution`：按 `Flow.explicitOutputs` 收集输出。
3. 改写 `executeFromDesignState` 消除同义 `params` 夹带；运行时所需参数从 `DesignState.inputs.params` 直接读取。
4. 定义 8 个稳定错误码。
5. 复用 M1-B 的 5 场景 fixture 验证 Browser / Node 双端确定性。

---

## Goals / Non-Goals

**Goals:**

1. `resolveFlow(templateVersion, flowKey)` 按精确键返回唯一 `Flow`；不允许 findFirst
2. `executeFlow(flow, designState, options)` 按 `flow.explicitOutputs` 顺序收集输出，过滤 `requestedOutputSlots`
3. `executeFromDesignState` 不再携带 `options.params`；运行时参数从 `DesignState.inputs.params` 直接读取
4. Browser / Node 共享同一解析语义
5. 保留 `WorkflowExecutor.execute()` 旧入口（M4 才删）
6. 8 个稳定错误码 + JSON-Pointer-style path
7. 12 套单测覆盖关键不变量

**Non-Goals:**

- 不实现 server 入口或 Prisma 迁移（M2-C）
- 不删除 `WorkflowExecutor.execute()`（M4 才删）
- 不重写 `core/*` 算法
- 不暴露内部 nodeId/port 到 Mall 公开协议
- 不为每个品类硬编码 flowKey / params
- 不修改 M0 metrics.json / fixtures（baseline 不变）
- 不实现 M3 / M4 / M6 / M7 范围

---

## Architecture Review

### 候选方案对比

| # | 方案 | 描述 | 决策 |
|---|------|------|------|
| A | 保留 `WorkflowExecutor.executeFromDesignState` 旧签名 + 加 `flowKey` 参数 | 最小破坏 | ❌ `options.params` 同义夹带依然存在；违反 M2 路标 |
| B | 改写 `executeFromDesignState` 为 `(designState, options?)`，移除 `options.params` | 干净 API | ✅ **采用**（决定 #2） |
| C | 保留 `buildWorkflowFromDesignState` 写死 DAG 实现 | 简化迁移 | ❌ 违反 M2 路标"不再通过固定 M0 scenario 构建写死 DAG" |
| D | 内部构建 DAG 时使用 `flow.nodeRefs` + `flow.explicitOutputs` 直接映射 | 内部引擎消费 Flow | ✅ **采用**（决定 #3） |
| E | 输出收集按 `flow.explicitOutputs` 声明顺序（经 `requestedOutputSlots` 过滤） | 显式 + 稳定 | ✅ **采用**（决定 #4） |
| F | 输出收集按 executor 完成顺序 | 隐式 | ❌ 违反护栏 §1.8 |
| G | `resolveFlow` 内部允许 `findFirst({ where: { flowKey } })` fallback | 容错 | ❌ 违反护栏 §1.7 |
| H | `resolveFlow` 内部使用 `(templateVersionId, flowKey)` 复合键 `findUnique` | 精确 | ✅ **采用**（决定 #5） |
| I | 抛错通过 `FlowResolverError` 含 `code` + `path` + `templateVersion` + `flowKey` | 可审计 | ✅ **采用**（决定 #6） |
| J | 在 engine 层维护 `nodeId → port 列表` 注册表以校验 `OUTPUT_PORT_NOT_FOUND` | 严格 | ✅ **采用**（决定 #6） |

### 评审清单

- [x] 是否触及 Mall 业务模型？——否（Flow / FlowOutput / DesignState 都是 Prism 内部）
- [x] 是否恢复旧 user system？——否
- [x] 是否携带不可序列化对象？——否（Flow / DesignState 都是 JSON-safe）
- [x] 是否引入 `findFirst` / 隐式遍历？——否（M2-B 强制 `(templateVersion, flowKey)` 精确定位）
- [x] 是否限制公开 API 增量？——是：移除 `ExecuteFromDesignStateParams`；新增 `resolveFlow` / `executeFlow` 等
- [x] 是否引入新 package？——否
- [x] 是否引入新数据库表？——否
- [x] 是否依赖 Browser DOM / Node fs？——否（engine 层与平台无关；image-ops adapter 选择已有平台层）
- [x] 是否影响 Composer / Dev Tool？——否（M4 才动 UI）
- [x] 是否能用 M0 evidence 验证？——是（5 场景 fixture + metrics.json 复用）

---

## Decisions

### Decision 1: `resolveFlow` 精确定位

**选择**：

```ts
// packages/workflow-core/src/flow-resolver.ts

export interface TemplateVersion {
  readonly templateId: string;
  readonly version: string;
  readonly flows: ReadonlyArray<Flow>;
  readonly createdAt: string;
}

export function resolveTemplateVersion(
  templateId: string,
  version?: string,
  catalog?: TemplateVersionCatalog,
): TemplateVersion {
  // catalog 由调用方注入；M2-B 单测构造内存 catalog，M2-C 注入 Prisma-backed catalog
  // version 缺省时取 catalog.currentVersion(templateId)；必须显式标注"current version"
  // 不允许 findFirst 隐式选择第一条
}

export function resolveFlow(
  templateVersion: TemplateVersion,
  flowKey: FlowKey,
): Flow {
  // 遍历 templateVersion.flows 查找 == flowKey；不抛错时返回唯一 Flow
  // 若 flowKey 不存在 → throw new FlowResolverError('FLOW_NOT_FOUND', ...)
  // 若重复 flowKey（catalog 应保证唯一性，但若传入错误 catalog）→ throw 'DUPLICATE_FLOW_KEY'
}
```

**理由**：
- `TemplateVersion` 是不可变快照；`flows[]` 在同一 TemplateVersion 内 `flowKey` 唯一（M2-A schema 保证）。
- `resolveFlow` 不接受 `(templateId, flowKey)` 二元键（违反护栏 §1.4 "TemplateVersion 必须参与精确定位"）。
- `catalog` 由调用方注入（dependency injection），M2-B 单测用内存 catalog，M2-C 注入 Prisma-backed catalog。

### Decision 2: 消除 `options.params` 同义参数夹带

**选择**：

```ts
export interface ExecuteFromDesignStateOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: ProgressCallback;
  readonly cache?: ExecutionCache;
  readonly enableCache?: boolean;
  readonly catalog?: TemplateVersionCatalog;
  /**
   * Render id override. Defaults to `DesignState.trace.requestId` then `m2-b-<unixMs>`.
   */
  readonly renderId?: string;
  // ❌ params 字段已移除
}
```

**理由**：
- 运行时所需参数（transformParams / compositeParams）来自 `DesignState.inputs.params`。
- 调用方不需要构造同义结构。
- 旧 `ExecuteFromDesignStateParams` 类型删除（M2-B 破坏性变更，但只影响 `image-ops` adapter 单测）。

### Decision 3: 输出收集按 Flow 声明顺序

**选择**：

```ts
function collectOutputsByExplicitOutputs(
  flow: Flow,
  requestedSlots: ReadonlyArray<string>,
  execOutputs: Record<string, Record<string, unknown>>,
): ReadonlyArray<RenderResultOutput> {
  const out: RenderResultOutput[] = [];
  const seen = new Set<string>();
  const requestedSet = new Set(requestedSlots);

  // 按 Flow.explicitOutputs 声明顺序
  for (const decl of flow.explicitOutputs) {
    if (!requestedSet.has(decl.slot)) continue;
    if (seen.has(decl.slot)) continue;

    const nodeOutputs = execOutputs[decl.nodeId];
    if (!nodeOutputs) {
      throw new FlowResolverError('DECLARED_OUTPUT_NOT_PRODUCED', `...`, { flowKey: flow.flowKey, slot: decl.slot, nodeId: decl.nodeId });
    }

    const image = nodeOutputs[decl.port] as ImageRef | undefined;
    if (!image) {
      throw new FlowResolverError('DECLARED_OUTPUT_NOT_PRODUCED', `...`, { flowKey: flow.flowKey, slot: decl.slot, port: decl.port });
    }

    out.push({
      id: `${flow.flowKey}.${decl.slot}`,
      image: image as ImageRef,
      slot: decl.slot,
      flowKey: flow.flowKey,
    });
    seen.add(decl.slot);
  }

  // 校验 requestedOutputSlots 中未声明 slot
  for (const requested of requestedSlots) {
    if (!flow.explicitOutputs.some((d) => d.slot === requested)) {
      throw new FlowResolverError('REQUESTED_OUTPUT_UNKNOWN', `...`, { flowKey: flow.flowKey, slot: requested });
    }
  }

  return out;
}
```

**理由**：
- 严格按 `flow.explicitOutputs` 声明顺序遍历。
- 不依赖 `requestedOutputSlots` 输入顺序（决定 #4）。
- 不依赖 `execOutputs` 对象 key 顺序（决定 #5）。
- 校验 `requestedOutputSlots` 全部在 `flow.explicitOutputs` 中声明（决定 #6）。

### Decision 4: `requestedOutputSlots` 顺序不影响输出

**单测覆盖**：

```ts
it('requestedOutputSlots order does not affect RenderResult.outputs order', async () => {
  const flow = makeFlow({
    flowKey: 'production.print',
    explicitOutputs: [
      { slot: 'production.print', nodeId: 'export-print', port: 'image', kind: 'image' },
      { slot: 'production.preview', nodeId: 'export-preview', port: 'image', kind: 'image' },
      { slot: 'production.mask', nodeId: 'export-mask', port: 'image', kind: 'image' },
    ],
  });

  const exec = new WorkflowExecutor({}).registerAll(makeMockExecutors());

  for (const requestedOrder of [
    ['production.print', 'production.mask', 'production.preview'],
    ['production.mask', 'production.print', 'production.preview'],
    ['production.preview', 'production.print', 'production.mask'],
  ]) {
    const ds = makeDS({ flowKey: 'production.print', requestedOutputSlots: requestedOrder });
    const { renderResult } = await exec.executeFromDesignState(ds, { catalog: makeCatalog(flow) });
    expect(renderResult.outputs.map((o) => o.slot)).toEqual([
      'production.print', 'production.preview', 'production.mask',
    ]);
  }
});
```

### Decision 5: nodes 对象/数组顺序打乱不影响输出

**单测覆盖**：

```ts
it('flow.nodeRefs order shuffling does not affect RenderResult.outputs', async () => {
  const flowA = makeFlow({ nodeRefs: [{nodeId:'a',nodeType:'load-image'},{nodeId:'b',nodeType:'export'}] });
  const flowB = makeFlow({ nodeRefs: [{nodeId:'b',nodeType:'export'},{nodeId:'a',nodeType:'load-image'}] });
  // 两个 flow 产生的 RenderResult.outputs 完全相同
});
```

### Decision 6: 8 个错误码

| 错误码 | 触发条件 |
|--------|----------|
| `FLOW_NOT_FOUND` | `templateVersion.flows` 不包含 `flowKey` |
| `DUPLICATE_FLOW_KEY` | `templateVersion.flows` 含 2+ 同 `flowKey`（catalog 错误） |
| `FLOW_OUTPUTS_MISSING` | `flow.explicitOutputs` 为空数组 |
| `OUTPUT_SLOT_DUPLICATE` | `flow.explicitOutputs` 含重复 slot |
| `OUTPUT_NODE_NOT_FOUND` | `explicitOutputs[].nodeId` 不在 `flow.nodeRefs` |
| `OUTPUT_PORT_NOT_FOUND` | `explicitOutputs[].port` 不在节点定义（依赖 `node-definitions` 注册表） |
| `REQUESTED_OUTPUT_UNKNOWN` | `requestedOutputSlots` 含未声明 slot |
| `DECLARED_OUTPUT_NOT_PRODUCED` | 声明的 explicit output 在执行后未产出 |

```ts
// packages/workflow-core/src/errors.ts
export class FlowResolverError extends Error {
  public readonly code: string;
  public readonly path?: string;
  public readonly context?: Record<string, unknown>;
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(`Prism flow resolver error [${code}]: ${message}`);
    this.name = 'FlowResolverError';
    this.code = code;
    this.context = context;
  }
}

export const FLOW_RESOLVER_ERROR_CODES = {
  FLOW_NOT_FOUND: 'FLOW_NOT_FOUND',
  DUPLICATE_FLOW_KEY: 'DUPLICATE_FLOW_KEY',
  FLOW_OUTPUTS_MISSING: 'FLOW_OUTPUTS_MISSING',
  OUTPUT_SLOT_DUPLICATE: 'OUTPUT_SLOT_DUPLICATE',
  OUTPUT_NODE_NOT_FOUND: 'OUTPUT_NODE_NOT_FOUND',
  OUTPUT_PORT_NOT_FOUND: 'OUTPUT_PORT_NOT_FOUND',
  REQUESTED_OUTPUT_UNKNOWN: 'REQUESTED_OUTPUT_UNKNOWN',
  DECLARED_OUTPUT_NOT_PRODUCED: 'DECLARED_OUTPUT_NOT_PRODUCED',
} as const;
```

### Decision 7: 5 场景 fixture 重做 round-trip

**单测矩阵**（M2-B 单测目录 `packages/workflow-core/src/__tests__/m2/`）：

| # | 测试名 | 覆盖不变量 |
|---|--------|------------|
| 1 | `flow-key-format.test.ts` | FlowKey pattern 边界（accept/reject） |
| 2 | `resolve-flow.test.ts` | `resolveFlow` 命中/未命中/重复 |
| 3 | `resolve-template-version.test.ts` | `resolveTemplateVersion` current / 指定 version / 未找到 |
| 4 | `flow-execution-single-output.test.ts` | 单 explicit output 端到端 |
| 5 | `flow-execution-multi-output.test.ts` | 多 explicit output 顺序稳定 |
| 6 | `flow-execution-shuffled-flows.test.ts` | flows 数组顺序打乱，输出不变 |
| 7 | `flow-execution-shuffled-nodes.test.ts` | nodeRefs 顺序打乱，输出不变 |
| 8 | `flow-execution-shuffled-completion.test.ts` | 节点完成顺序打乱，输出不变 |
| 9 | `flow-execution-requested-slots-order.test.ts` | requestedOutputSlots 顺序打乱，输出顺序不变 |
| 10 | `flow-execution-undeclared-slot.test.ts` | requestedOutputSlots 含未声明 slot → `REQUESTED_OUTPUT_UNKNOWN` |
| 11 | `flow-execution-no-output.test.ts` | Flow 无 explicitOutputs → `FLOW_OUTPUTS_MISSING` |
| 12 | `flow-execution-dual-runtime.test.ts` | Browser / Node 对同一输入得到相同 slots |
| 13 | `flow-execution-stability.test.ts` | 同一输入重复 3 次结果稳定 |
| 14 | `flow-execution-no-findfirst.test.ts` | 断言 grep 不再出现 `Object.keys(...).pop()` 选择最终输出 |
| 15 | `flow-execution-no-params-option.test.ts` | 断言 `executeFromDesignState` 不再要求 `options.params` |

### Decision 8: WorkflowExecutor.execute() 旧入口保留

**理由**：
- M2-A / M2-B 公开 spec 不破坏既有签名。
- M4 才删除旧入口；M2-B 仅在 `executeFromDesignState` 内不再要求 `params`。
- `image-ops/_m0_evidence` 与 `executor.test.ts` 仍可能调用 `execute(workflow, options)`。

### Decision 9: 不修改 M0 metrics.json / fixtures

**理由**：
- M0 已 archived 产物视为不可变 baseline。
- M2-B 复用 `packages/image-ops/_m0_evidence/shared/fixtures.ts` 的 5 场景 fixture 形态（M1-B 路径）。
- M2-B 不修改 metrics.json。

---

## 测试策略

### Unit（`packages/workflow-core/src/__tests__/m2/`）

详见 Decision 7 表格。

### 双端闭环

```ts
// packages/image-ops/src/__tests__/m2/dual-runtime-flow-resolution.test.ts
describe('M2-B: dual-runtime Flow resolution', () => {
  it.each(['identity', 'scale-2x', 'rotate-90', 'scale-rotate', 'translate-scale'])(
    'scenario %s produces identical RenderResult.outputs on Browser and Node',
    async (scenarioId) => {
      const flow = makeFlowFromScenario(scenarioId);
      const ds = makeDSFromScenario(scenarioId, flow.flowKey);
      const catalog = makeInMemoryCatalog([flow]);

      const browserResult = await runOnBrowser(flow, ds, catalog);
      const nodeResult = await runOnNode(flow, ds, catalog);

      expect(browserResult.outputs.map((o) => o.slot)).toEqual(nodeResult.outputs.map((o) => o.slot));
    },
  );
});
```

---

## 错误模型

| 错误码 | 抛出位置 | 触发条件 |
|--------|----------|----------|
| `FLOW_NOT_FOUND` | `resolveFlow` | 模板版本内不存在 flowKey |
| `DUPLICATE_FLOW_KEY` | `resolveFlow` | 模板版本内 flowKey 重复（catalog 错误） |
| `FLOW_OUTPUTS_MISSING` | `executeFlow` / ajv | `flow.explicitOutputs.length === 0` |
| `OUTPUT_SLOT_DUPLICATE` | ajv（M2-A 提供） | flow.explicitOutputs 含重复 slot |
| `OUTPUT_NODE_NOT_FOUND` | ajv post-validation | explicitOutputs.nodeId 不在 flow.nodeRefs |
| `OUTPUT_PORT_NOT_FOUND` | `executeFlow` + node-definitions | explicitOutputs.port 不在节点定义 |
| `REQUESTED_OUTPUT_UNKNOWN` | `executeFlow` | requestedOutputSlots 含未声明 slot |
| `DECLARED_OUTPUT_NOT_PRODUCED` | `executeFlow` | 声明的 explicit output 在执行后未产出 |

---

## 兼容策略

- **`WorkflowExecutor.execute(workflow, options)` 不动**。
- **`ExecuteFromDesignStateParams` 类型删除**：仅影响 `image-ops` adapter 单测；该单测在 M2-B apply 阶段同步更新。
- **`DesignState.inputs.params` schema 不动**：M2-A 已定义 JSON-safe `Record<string, JsonValue>`。
- **5 场景 fixture 形态复用**：仅同步更新 `flowKey` 字符串（如 `'production.print'`）与 `requestedOutputSlots` 字段。

---

## 回滚方案

1. 删除 `openspec/changes/m2-b-workflow-core-explicit-flow-resolution/`
2. `git checkout -- packages/workflow-core/src/{executor,design-state-execution,index}.ts packages/image-ops/src/adapters/design-state-adapter.ts packages/image-ops/src/__tests__/m1/design-state-roundtrip.test.ts`
3. 删除 `packages/workflow-core/src/{flow-resolver,flow-execution,errors}.ts` 与 `packages/workflow-core/src/__tests__/m2/`
4. 删除 `docs/changelogs/2026-07-14-m2-b-workflow-core-explicit-flow-resolution.md`

---

## 不做什么

- 不实现 server 入口（M2-C）
- 不删除 `WorkflowExecutor.execute()`（M4）
- 不重写 core/* 算法
- 不暴露 nodeId/port 到 Mall
- 不修改 M0 metrics.json / fixtures
- 不为每个品类硬编码
- 不实现 M3 / M4 / M6 / M7 范围