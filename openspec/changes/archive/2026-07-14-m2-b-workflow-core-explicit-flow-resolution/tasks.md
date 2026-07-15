# Tasks: M2-B — Workflow Core Explicit Flow Resolution

> **依赖**：必须等 `m2-a-deterministic-flow-and-output-protocol` 完成
> **阻塞**：M2-C 才能开始

---

## 1. `resolveFlow` 与 `resolveTemplateVersion` 入口

- **id**: m2-b-t1
- **layer**: engine (`packages/workflow-core/`)
- **status**: done
- **verify**: `pnpm --filter @prism/workflow-core test -- --run m2/flow-resolver`

### 验收标准

- [ ] 文件 `packages/workflow-core/src/flow-resolver.ts` 存在；导出 `resolveFlow` / `resolveTemplateVersion` / `TemplateVersionCatalog`
- [ ] `resolveFlow(templateVersion, flowKey)`：精确匹配（遍历 `templateVersion.flows` 查找 `== flowKey`），不允许 findFirst
- [ ] `resolveFlow` 不存在时抛 `FlowResolverError`（code: `FLOW_NOT_FOUND`）
- [ ] `resolveFlow` 重复时抛 `FlowResolverError`（code: `DUPLICATE_FLOW_KEY`）
- [ ] `resolveTemplateVersion(templateId, version?)`：version 缺省时取 catalog.currentVersion(templateId)；不允许 findFirst
- [ ] `resolveTemplateVersion` 不存在时抛 `FlowResolverError`（code: `TEMPLATE_VERSION_NOT_FOUND`）
- [ ] 单测覆盖：`resolveFlow` 命中 / 未命中 / 重复 / `resolveTemplateVersion` current / 指定 version

---

## 2. 8 个稳定错误码

- **id**: m2-b-t2
- **layer**: engine
- **status**: done
- **verify**: `pnpm --filter @prism/workflow-core typecheck && pnpm --filter @prism/workflow-core test -- --run m2/error-codes`

### 验收标准

- [ ] 文件 `packages/workflow-core/src/errors.ts` 存在；导出 `FlowResolverError` 与 `FLOW_RESOLVER_ERROR_CODES` 常量
- [ ] 8 个错误码全部实现：`FLOW_NOT_FOUND` / `DUPLICATE_FLOW_KEY` / `FLOW_OUTPUTS_MISSING` / `OUTPUT_SLOT_DUPLICATE` / `OUTPUT_NODE_NOT_FOUND` / `OUTPUT_PORT_NOT_FOUND` / `REQUESTED_OUTPUT_UNKNOWN` / `DECLARED_OUTPUT_NOT_PRODUCED`
- [ ] `FlowResolverError` 含 `code: string` + `message: string` + `context?: Record<string, unknown>`
- [ ] 单测覆盖：每个错误码的实例化与序列化

---

## 3. `executeFlow` 输出收集

- **id**: m2-b-t3
- **layer**: engine
- **status**: done
- **verify**: `pnpm --filter @prism/workflow-core test -- --run m2/flow-execution`

### 验收标准

- [ ] 文件 `packages/workflow-core/src/flow-execution.ts` 存在
- [ ] `executeFlow(flow, designState, options?)` 接受 `Flow` + `DesignState` + `ExecuteFromDesignStateOptions`（无 `params`）
- [ ] 输出收集严格按 `flow.explicitOutputs` 声明顺序（内部遍历 `explicitOutputs` 数组）
- [ ] 按 `designState.inputs.params` 直接读取运行时参数（不再要求调用方携带同义 `params`）
- [ ] `requestedOutputSlots` 含未声明 slot → 抛 `FlowResolverError('REQUESTED_OUTPUT_UNKNOWN', ...)`
- [ ] 声明的 explicit output 执行后未产出 → 抛 `FlowResolverError('DECLARED_OUTPUT_NOT_PRODUCED', ...)`
- [ ] 单测覆盖：单输出 / 多输出顺序 / `requestedOutputSlots` 打乱不影响输出顺序 / 未声明 slot 失败

---

## 4. 改写 `executeFromDesignState`

- **id**: m2-b-t4
- **layer**: engine
- **status**: done
- **verify**: `pnpm --filter @prism/workflow-core test -- --run m2/execute-from-design-state`

### 验收标准

- [ ] `packages/workflow-core/src/executor.ts` 中 `ExecuteFromDesignStateOptions` 不再包含 `params` 字段
- [ ] 改写 `executeFromDesignState(designState, options?)`：校验 → 解析 TemplateVersion → 解析 Flow → 执行 → 包装 RenderResult
- [ ] 不再调用旧 `buildWorkflowFromDesignState`（固定 4 节点 DAG）；改为内部调用 `executeFlow`
- [ ] 单测覆盖：合法 DesignState 通过 / 校验失败抛 ValidationError / 解析失败抛 FlowResolverError

---

## 5. `mapFlowResultToRenderResult` 按声明顺序收集

- **id**: m2-b-t5
- **layer**: engine
- **status**: done
- **verify**: `pnpm --filter @prism/workflow-core test -- --run m2/render-result-mapping`

### 验收标准

- [ ] `packages/workflow-core/src/design-state-execution.ts` 中 `mapFlowResultToRenderResult(flow, designState, execResult, renderId, startedAt)` 存在
- [ ] `RenderResult.outputs` 顺序 = `flow.explicitOutputs` 声明顺序（经过 `requestedOutputSlots` 过滤）
- [ ] `RenderResult.templateVersion === designState.templateVersion`
- [ ] `RenderResult.outputs[].flowKey === designState.flowKey`
- [ ] 不再出现 `Object.keys(...).pop()` 选择最终输出（grep 单测断言）
- [ ] 单测覆盖：flows 顺序打乱不影响输出 / nodes 顺序打乱不影响输出 / 节点完成顺序打乱不影响输出 / requestedOutputSlots 顺序打乱不影响输出

---

## 6. `ExecuteFromDesignStateParams` 类型删除

- **id**: m2-b-t6
- **layer**: engine
- **status**: done
- **verify**: `pnpm --filter @prism/workflow-core typecheck && pnpm --filter @prism/image-ops typecheck`

### 验收标准

- [ ] `packages/workflow-core/src/design-state-execution.ts` 中不再导出 `ExecuteFromDesignStateParams`
- [ ] `packages/workflow-core/src/index.ts` 中不再导出 `ExecuteFromDesignStateParams`
- [ ] `packages/image-ops/src/adapters/design-state-adapter.ts` 不再引用 `ExecuteFromDesignStateParams`
- [ ] `packages/image-ops/src/__tests__/m1/design-state-roundtrip.test.ts` 中不再引用 `params: { transformParams, compositeParams }` 传参方式
- [ ] typecheck 通过

---

## 7. `resolveFlow` / `executeFlow` 导出

- **id**: m2-b-t7
- **layer**: engine
- **status**: done
- **verify**: `pnpm --filter @prism/workflow-core typecheck`

### 验收标准

- [ ] `packages/workflow-core/src/index.ts` 导出 `resolveFlow` / `resolveTemplateVersion` / `executeFlow` / `FlowResolverError` / `FLOW_RESOLVER_ERROR_CODES`
- [ ] `packages/workflow-core/src/index.ts` 不再导出 `ExecuteFromDesignStateParams`（破坏性变更已确认）
- [ ] typecheck 通过

---

## 8. 12 套单元测试覆盖

- **id**: m2-b-t8
- **layer**: engine
- **status**: done
- **verify**: `pnpm --filter @prism/workflow-core test -- --run m2`

### 验收标准

- [ ] 文件 `packages/workflow-core/src/__tests__/m2/` 存在（至少 12 个测试文件）
- [ ] 测试 1：同一 TemplateVersion 中存在 2+ Flow，`resolveFlow` 精确命中
- [ ] 测试 2：flows 数组顺序打乱，`resolveFlow` 结果不变
- [ ] 测试 3：nodes 顺序打乱，RenderResult.outputs 顺序不变
- [ ] 测试 4：executor 完成顺序打乱，RenderResult.outputs 顺序不变
- [ ] 测试 5：同一 Flow 有 2+ explicitOutputs，RenderResult.outputs 顺序 = explicitOutputs 声明顺序
- [ ] 测试 6：`requestedOutputSlots` 顺序打乱，RenderResult.outputs 顺序仍稳定
- [ ] 测试 7：`requestedOutputSlots` 含未声明 slot → `REQUESTED_OUTPUT_UNKNOWN`
- [ ] 测试 8：Flow.explicitOutputs 为空 → `FLOW_OUTPUTS_MISSING`
- [ ] 测试 9：声明 output 但执行后没有产出 → `DECLARED_OUTPUT_NOT_PRODUCED`
- [ ] 测试 10：Browser / Node 对同一输入得到相同 slots
- [ ] 测试 11：同一输入重复 3 次结果稳定
- [ ] 测试 12：`executeFromDesignState` 不再要求 `options.params`

---

## 9. 5 场景双端闭环集成测试

- **id**: m2-b-t9
- **layer**: engine (`packages/image-ops/`)
- **status**: done
- **verify**: `pnpm --filter @prism/image-ops test -- --run m2/dual-runtime`

### 验收标准

- [ ] 文件 `packages/image-ops/src/__tests__/m2/dual-runtime-flow-resolution.test.ts` 存在
- [ ] 5 个场景（identity / scale-2x / rotate-90 / scale-rotate / translate-scale）均使用真实 Flow 构造（而非固定写死 4 节点）
- [ ] Browser executor 路径输出与 Node executor 路径输出 slots 相同
- [ ] 与 `artifacts/verification/M0/metrics.json` 比对（M2-B 不修改 metrics.json，但可以复用几何比对逻辑）
- [ ] 失败时输出调试 PNG 到 `artifacts/verification/M2/`（不污染 M0 artifacts）

---

## 10. 旧 `buildWorkflowFromDesignState` 写死 DAG 移除确认

- **id**: m2-b-t10
- **layer**: engine
- **status**: done
- **verify**: `grep -r "load-image.*transform.*composite.*export" packages/workflow-core/src/`

### 验收标准

- [ ] `packages/workflow-core/src/design-state-execution.ts` 中不再包含写死 4 节点 pipeline 构造代码
- [ ] grep `packages/workflow-core/src/design-state-execution.ts` 不再找到字符串字面量 `'load-image'` / `'transform'` / `'composite'` / `'export'`（迁移到 `flow-execution.ts` 内部处理）
- [ ] 单测确认 `executeFromDesignState` 内部调用路径不经过旧 DAG 构建逻辑

---

## 11. typecheck + smoke check

- **id**: m2-b-t11
- **layer**: engine
- **status**: done
- **verify**: `pnpm typecheck && pnpm --filter @prism/workflow-core test && pnpm --filter @prism/image-ops test`

### 验收标准

- [ ] `pnpm typecheck` 全局通过
- [ ] `@prism/workflow-core` 全部单测通过
- [ ] `@prism/image-ops` 全部单测通过
- [ ] 不动 `packages/shared-types/`（M2-A 已交付）
- [ ] 既有 `pnpm test` 不能新增失败用例

---

## 12. changelog + OpenSpec 收尾

- **id**: m2-b-t12
- **layer**: meta
- **status**: done
- **verify**: `cat openspec/changes/m2-b-workflow-core-explicit-flow-resolution/tasks.md | grep status`

### 验收标准

- [ ] 文件 `docs/changelogs/2026-07-14-m2-b-workflow-core-explicit-flow-resolution.md` 存在
- [ ] changelog 内容：阶段目标 / 完成证据（5 场景双端闭环结果表）/ 与 M1-B 对比
- [ ] 不动架构文档 / 不动 roadMap / 不动 guardrail / 不动 Cursor Rule
- [ ] 11 个具体 task 全部 `completed`

---

## 依赖关系

```
T1 (resolveFlow) ──┐
T2 (errors)     ──┤
T3 (executeFlow) ──┤──→ T4 (executeFromDesignState 改写)
T5 (mapFlowResult)──┤
                    │
T6 (ExecuteFromDesignStateParams 删除) → T7 (导出) → T8 (12 套单测) → T9 (双端集成) → T10 (旧 DAG 移除确认) → T11 (typecheck) → T12 (changelog)
```

---

## 回退方式

- 删除 `openspec/changes/m2-b-workflow-core-explicit-flow-resolution/`
- `git checkout -- packages/workflow-core/src/{executor,design-state-execution,index}.ts packages/image-ops/src/adapters/design-state-adapter.ts packages/image-ops/src/__tests__/m1/design-state-roundtrip.test.ts`
- 删除 `packages/workflow-core/src/{flow-resolver,flow-execution,errors}.ts` 与 `packages/workflow-core/src/__tests__/m2/` 与 `packages/image-ops/src/__tests__/m2/`
- 删除 `docs/changelogs/2026-07-14-m2-b-workflow-core-explicit-flow-resolution.md`