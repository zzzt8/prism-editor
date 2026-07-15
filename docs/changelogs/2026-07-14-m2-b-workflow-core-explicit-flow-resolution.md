# Changelog: M2-B — Workflow Core Explicit Flow Resolution

- **change_id**: `m2-b-workflow-core-explicit-flow-resolution`
- **migration phase**: M2 (engine-layer, `prism-workflow` schema)
- **change_class**: `high` (engine-layer API expansion + breaking removal)
- **status**: `completed`
- **date**: 2026-07-15

---

## 阶段目标 (M2-B)

承接 M2-A 协议层的 `Flow / FlowOutput / FlowKey / FlowOutputSlot` 契约，把 workflow-core 真正消费按 `(TemplateVersion, flowKey)` 显式解析的唯一 Flow，消除 M1-B 留下的"固定 4 节点 DAG + 同义 `params` 夹带"。所有生产路径都必须经过 `Flow.explicitOutputs` 的显式输出声明，过滤 `requestedOutputSlots`，输出顺序仅由 Flow 声明顺序决定（不允许 `findFirst` / `Object.keys(...).pop()` 一类隐式选择）。

## 主要变更

| 模块 | 内容 |
|------|------|
| `packages/workflow-core/src/flow-resolver.ts` (新) | `resolveFlow` / `resolveTemplateVersion` / `TemplateVersionCatalog` + `InMemoryTemplateVersionCatalog`。精确 key 匹配，无 `findFirst`。 |
| `packages/workflow-core/src/errors.ts` (新) | `FlowResolverError` + `FLOW_RESOLVER_ERROR_CODES` 9 错误码常量（见 `T2`）。 |
| `packages/workflow-core/src/flow-execution.ts` (新) | `executeFlow` + `collectOutputsByExplicitOutputs` + `defaultBuildWorkflowFromFlow`。内部线性 DAG over `flow.nodeRefs`，输出顺序严格按 `flow.explicitOutputs` 声明。 |
| `packages/workflow-core/src/executor.ts` (改) | `executeFromDesignState` 改写：validate → resolveTemplateVersion → resolveFlow → executeFlow → mapFlowResultToRenderResult。`ExecuteFromDesignStateOptions.params` 删除（破坏性变更，但仅影响原 M1-B 测试 + image-ops adapter）；新增 `catalog`（DI）。 |
| `packages/workflow-core/src/design-state-execution.ts` (改) | 移除 `buildWorkflowFromDesignState`（写死 DAG） + `mapExecutorResultToRenderResult`（单 output extractor） + `ExecuteFromDesignStateParams` 类型。新增 `mapFlowResultToRenderResult(flow, ds, flowResult)`。 |
| `packages/workflow-core/src/index.ts` (改) | 导出 `resolveFlow` / `resolveTemplateVersion` / `executeFlow` / `FlowResolverError` / 错误码常量 / `InMemoryTemplateVersionCatalog`。 |
| `packages/workflow-core/src/__tests__/m2/` (新) | 13 测试文件（12 单测 + 1 fixture + 1 DAG 移除守门）共 112 断言。 |
| `packages/image-ops/src/__tests__/m2/dual-runtime-flow-resolution.test.ts` (新) | 5 场景 Browser / Node 双端闭环。 |
| `packages/image-ops/src/__tests__/m1/design-state-roundtrip.test.ts` (删) | 旧 M1-B 形态，已被 m2 套件取代。 |
| `packages/workflow-core/src/design-state-execution.test.ts` (删) | 同上。 |
| `packages/workflow-core/src/render-result-mapping.test.ts` (删) | 同上。 |

## 验证结果

### 单测

| 包 | 总数 | M2-B 新增 / 关键覆盖 |
|----|------|----------------------|
| `@prism/workflow-core` | 112 | `flow-resolver` × hit/miss/dup/shuffle、`resolveTemplateVersion` × current/explicit/missing、`executeFlow` × 1-output / 3-output order stability、`collectOutputsByExplicitOutputs` × requested order shuffle + undeclared slot、dual-runtime parity、stability across 3 runs、DAG removal guard。 |
| `@prism/image-ops` | 414 | 5-scenario dual-runtime：identity / scale-2x / rotate-90 / scale-rotate / translate-scale。Browser 与 Node mock 执行器 slots 一致。 |

### Typecheck

15/15 packages 类型检查通过：

```
@prism/core / @prism/composer-sdk / @prism/dev-tool / @prism/server
@prism/shared-types / @prism/workflow-core / @prism/image-ops
/ apps/dev-tool / server
```

### 5 场景双端闭环结果

| Scenario    | Browser slots                       | Node slots                          | 一致 |
|-------------|--------------------------------------|--------------------------------------|------|
| identity        | `[identity.print, identity.preview]`   | `[identity.print, identity.preview]`   | ✅ |
| scale-2x        | `[scale-2x.print, scale-2x.preview]`   | `[scale-2x.print, scale-2x.preview]`   | ✅ |
| rotate-90       | `[rotate-90.print, rotate-90.preview]` | `[rotate-90.print, rotate-90.preview]` | ✅ |
| scale-rotate    | `[scale-rotate.print, scale-rotate.preview]` | `[scale-rotate.print, scale-rotate.preview]` | ✅ |
| translate-scale | `[translate-scale.print, translate-scale.preview]` | `[translate-scale.print, translate-scale.preview]` | ✅ |

失败用例会向 `artifacts/verification/M2/` 输出诊断 JSON（不污染 M0 artifacts）。

## 与 M1-B 对比

| 维度 | M1-B | M2-B |
|------|------|------|
| DAG 来源 | 写死 `load-image → transform → composite → export` | `flow.nodeRefs` + 客户端可覆盖的 `additionalConnections` / `buildWorkflow` |
| 运行时参数 | `ExecuteFromDesignStateOptions.params`（同义） | `DesignState.inputs.params.nodeParams`（唯一载体） |
| Flow 选择 | 隐式（实际无 flow 概念） | `catalog.currentVersion(templateId)` / 显式 `(templateId, version)` + 精确 `flowKey` 匹配 |
| 输出选择 | 单 output（export 节点 frame） | `flow.explicitOutputs` 声明顺序 × `requestedOutputSlots` 过滤 |
| 错误码 | ad-hoc string | 9 stable codes（`FLOW_NOT_FOUND` / `DUPLICATE_FLOW_KEY` / `TEMPLATE_VERSION_NOT_FOUND` / `FLOW_OUTPUTS_MISSING` / `OUTPUT_SLOT_DUPLICATE` / `OUTPUT_NODE_NOT_FOUND` / `OUTPUT_PORT_NOT_FOUND` / `REQUESTED_OUTPUT_UNKNOWN` / `DECLARED_OUTPUT_NOT_PRODUCED`） |
| 双端一致 | 写死 1 path | Browser / Node 共享 `executeFlow` 解析 + 收集语义 |
| Catalog | 无 | `TemplateVersionCatalog`（DI）+ `InMemoryTemplateVersionCatalog`（测试用） |

## 架构护栏符合性

| 护栏 | 状态 |
|------|------|
| §1.7 Flow 选择必须显式 (`flowKey` 精确匹配) | ✅ `resolveFlow` 遍历 `templateVersion.flows` 找 `== flowKey`；无 `findFirst`。 |
| §1.8 输出必须显式声明 (`explicitOutputs`) | ✅ `collectOutputsByExplicitOutputs` 按 `flow.explicitOutputs` 遍历；`Object.keys(...).pop()` 已由 `grep` 守门。 |
| §1.4 双渲染逻辑不得长期分叉 | ✅ Browser / Node 共用 `executeFlow` 路径。 |
| §1.5 共享 `DesignState` + 参数语义 | ✅ 不再有 `options.params` 同义夹带。 |
| §5.1 单阶段原则 | ✅ M2-B 仅触及 engine + image-ops adapter；server / dev-tool / Mall 不动。 |
| §5.2 OpenSpec 先行 | ✅ change_id `m2-b-workflow-core-explicit-flow-resolution` 在 apply 前已批准。 |

## 不做什么（Out of Scope）

- 不动 `@prism/shared-types/`（M2-A 已交付，`flow.ts` / `render-result.ts` 的 `schemaVersion = 2` 不变）。
- 不动 `@prism/server/` 入口（M2-C）。
- 不删除 `WorkflowExecutor.execute()`（M4 才删）。
- 不重写 `core/*` 算法。
- 不暴露 `nodeId` / `port` 到 Mall 公开协议。
- 不修改 M0 `metrics.json` / fixtures。

## 12 个 task 完成状态

| ID | 内容 | 状态 |
|----|------|------|
| m2-b-t1  | `flow-resolver.ts` | ✅ completed |
| m2-b-t2  | 8+1 个错误码 | ✅ completed |
| m2-b-t3  | `executeFlow` + output 收集 | ✅ completed |
| m2-b-t4  | 改写 `executeFromDesignState` | ✅ completed |
| m2-b-t5  | `mapFlowResultToRenderResult` | ✅ completed |
| m2-b-t6  | 删除 `ExecuteFromDesignStateParams` | ✅ completed |
| m2-b-t7  | `index.ts` 新导出 | ✅ completed |
| m2-b-t8  | 12 单测 | ✅ completed |
| m2-b-t9  | 5 场景双端闭环 | ✅ completed |
| m2-b-t10 | 旧 DAG 移除守门 | ✅ completed |
| m2-b-t11 | typecheck + smoke | ✅ completed |
| m2-b-t12 | changelog + wrap-up | ✅ completed |

## 阻塞 / 下一步

- M2-B 应用完成；M2-C (`m2-c-server-deterministic-render-entry`) 可在此基础上接入 server 入口与 Prisma-backed `TemplateVersionCatalog`。
- M3 / M4 才迁移 Browser Runtime 抽出和 Composer 收敛。

---

本文档与变更同步：未触及 `PRISM_TARGET_ARCHITECTURE.md` / `PRISM_ARCHITECTURE_GUARDRAILS.md` / `PRISM_MIGRATION_ROADMAP.md` / Cursor Rule 等架构资产。
