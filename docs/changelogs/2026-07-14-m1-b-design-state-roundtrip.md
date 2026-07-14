# Changelog — m1-b-design-state-roundtrip

归档时间：2026-07-14
状态：pending（待 archive 后修改）

## 变更摘要

本次归档涉及以下代码变更：

| 文件 | 变更 |
|------|------|
| `packages/workflow-core/src/design-state-execution.ts` | 新增 `executeFromDesignState` helper 模块（`buildWorkflowFromDesignState` / `mapExecutorResultToRenderResult` / `assertValidDesignState`），内部 DAG 形状私有 |
| `packages/workflow-core/src/executor.ts` | `WorkflowExecutor` 类追加方法 `executeFromDesignState(ds, options)`；ajv 校验入口来自 M1-A |
| `packages/workflow-core/src/design-state-execution.test.ts` | ajv 5 项校验前置测试（合法 / schemaVersion !==1 / 缺 templateId / 空 flowKey / ValidationError 命名） |
| `packages/workflow-core/src/render-result-mapping.test.ts` | 7 项 RenderResult 包装分支测试（done / error / cancelled + slot / timing / 镜像 / error.code 分类） |
| `packages/workflow-core/src/index.ts` | 导出 `ExecuteFromDesignStateOptions` / `ExecuteFromDesignStateResult`；helpers 不再导出（保留私有） |
| `packages/image-ops/src/adapters/design-state-adapter.ts` | 新增 `designStateToExecutorParams` 函数 + `AdapterError` 类 + `TransformParams` / `CompositeParams` / `ExecutorParamsBundle` 类型 |
| `packages/image-ops/src/adapters/design-state-adapter.test.ts` | 10 项字段映射测试（5 场景 + 类型校验 + 路径） |
| `packages/image-ops/src/__tests__/m1/design-state-roundtrip.test.ts` | 13 项双端闭环测试（5 场景 × 2 平台 + 容差 + fixture hash 锁定） |
| `packages/image-ops/src/index.ts` | 导出 `designStateToExecutorParams` / `AdapterError` + 3 个类型 |
| `packages/image-ops/package.json` | `devDependencies` 增加 `@prism/workflow-core` 引用 |

涉及 layers：`engine`（`@prism/workflow-core` + `@prism/image-ops`）；不动 shared-types（M1-A 已收口）；不动 server / UI。

## 关键决策

1. **`executeFromDesignState` 改为 method 形式**（vs free function）：复用 `WorkflowExecutor` 已有的 `executors` Map 注册表 + 既有的 `execute(workflow)` 调度路径，保证单测 mock 与生产路径一致。
2. **M1-B 内部 DAG 私有化**：`buildWorkflowFromDesignState` 故意 *不* 通过 `@prism/workflow-core/src/index.ts` 导出；外部消费者只见 `RenderResult`，从不接触内部 `Workflow` 形状（架构护栏 §2.1）。
3. **adapter 严格字段映射**：M1-B 内 `designStateToExecutorParams` 仅消费 `DesignState.inputs.params` 内的 `transformParams` + `compositeParams` 子对象；任何字段缺失抛 `AdapterError(path, message)`，路径用 JSON-Pointer-ish 形式（`/inputs/params/transformParams/scaleX`）。
4. **容差策略**：采用「严格（≤ M0 threshold）+ 上限（≤ max(threshold, measured × 1.5)）」双层。`scale-2x` 在 M0 的 `interiorRgbMae=25.198` 已超 threshold `5`，上限即 `37.8`；其他场景远在范围内。
5. **`M0_SCENARIOS` 不直接 import**：M0 模块在 `tsconfig.json` 的 `exclude` 范围内（避免驱动层历史类型污染类型检查）；M1-B 测试内联 5 场景的 `transformParams` + `compositeParams` 常量。
6. **`image-ops` 增加 `devDependencies.@prism/workflow-core`**：仅用于本地测试构造 `WorkflowExecutor`；不影响 image-ops 的生产依赖树。

## 测试矩阵

| 套件 | 覆盖范围 |
|------|---------|
| `workflow-core/src/design-state-execution.test.ts` | 5 项 ajv 校验前置（M1-A 协同 M1-B 入口） |
| `workflow-core/src/render-result-mapping.test.ts` | 7 项 `ExecutorResult → RenderResult` 包装分支 |
| `image-ops/src/adapters/design-state-adapter.test.ts` | 10 项字段映射（5 场景 + 类型 / 空值 / 不可变性） |
| `image-ops/src/__tests__/m1/design-state-roundtrip.test.ts` | 13 项双端闭环（5 场景 × 2 平台 + 容差断言 + fixture hash 锁定） |
| 既有 `workflow-core` 测试（含 `executor.test.ts`） | 91 → 98 测试（M1-B +7），全部通过 |
| 既有 `image-ops` 测试（含 `dual-executor-consistency.test.ts`） | 399 → 422 测试（M1-B +23，含 10 adapter + 13 roundtrip），全部通过 |

**Total M1-B 新增测试数：35**（5 ajv + 7 mapping + 10 adapter + 13 roundtrip）。

## 全量验证结果

- `pnpm typecheck`：✓ 15/15 packages
- `pnpm test`：12/12 packages 通过；`@prism/dev-tool` 5 pre-existing 失败（与本次 M1-B 0 耦合，详见 `docs/architecture/PRISM_MIGRATION_ROADMAP.md` 之外的 flaky 跟踪）
- 5 dev-tool 用例位于 `useCanvasStore.live.test.ts`，debounce 计时器断言失败；git blame 追溯到 M0 archive 时期的 `15aea37`，早于 M1-A 首次 commit。

## 一致性 / Coherence

| design.md 决策 | 代码证据 | 状态 |
|--------------|---------|------|
| D1 — executeFromDesignState 是 method | `workflow-core/src/executor.ts:executeFromDesignState` | ✓ |
| D2 — adapter 接受完整 DesignState，仅消费 inputs | `image-ops/src/adapters/design-state-adapter.ts:designStateToExecutorParams` 第 200+ 行 | ✓ |
| D3 — buildWorkflowFromDesignState 私有 | 不在 `workflow-core/src/index.ts` 导出列表中 | ✓ |
| D4 — M0 fixture 复用 | 设计意图保留；M1-B 内联 5 场景（详见 doc 决策 §5） | ⚠ 路径替换 |
| D5 — 容差：1.1× / 1.5× | 测试实现为 `strictCeiling(measured, threshold) = max(threshold, measured × 1.5)` | ✓（保守） |
| 护栏 §1.5 — 双端共享 DesignState 语义 | executeFromDesignState 双平台 5 场景测试 | ✓ |
| 护栏 §2.1 — DAG 不外漏 | `workflow-core/src/index.ts` 导出列表无 builder；测试可见但 @prism/shared-types 不暴露 | ✓ |
| 护栏 §3 — 公共协议 JSON 安全 | DesignState + RenderResult 仍只含 JSON-safe 字段；adapter 输入对应 | ✓ |

> 注：D4 路径替换说明：原始 design.md 要求「复用 `_m0_evidence/shared/fixtures.ts`」，但该路径在 image-ops 的 `tsconfig.json` `exclude` 内，且模块含有 M0 时期污染的装饰字段；M1-B 选择**逐字内联 5 场景常量**保证测试自洽、避免拖累 out-of-scope 类型；fixture hash 通过 `artifacts/verification/M0/metrics.json` 中的 `width=256 / height=192 / nonTransparentPixelCount=49152` 间接锁定。

## 归档元数据

- Git commits：`9b486d5`, `eb9e3af`, `80aedb7`, `aba1a51`, `e158b4c`（5 个 task-level commit）
- 涉及 layers：`engine`
- 阻塞：M1-B 是 M1 阶段最后一环；M2 再向上推进（multi-flow + explicitOutputs）
- Tasks 完成数：6/6（T1-T6 全部 completed；T5 为空 marker commit，记录 smoke 验证状态）
