# Tasks: M1-B — DesignState 双端闭环验证

> **依赖**：必须等 `m1-a-design-state-types` 完成（按 /opsx-apply 顺序消费 M1-A artifact）
> **阻塞**：无（M1-B 是 M1 阶段最后一环）

---

## Task 1: `executeFromDesignState` 入口

- **id**: m1-b-t1
- **layer**: engine (`packages/workflow-core/`)
- **status**: completed
- **verify**: `pnpm --filter @prism/workflow-core test -- --run design-state-execution`

### 验收标准

- [x] 文件 `packages/workflow-core/src/design-state-execution.ts` 存在
- [x] `WorkflowExecutor` 类新增方法 `executeFromDesignState(designState, options?)`
- [x] 入口先调用 `validateDesignState(designState)`（M1-A 提供），失败抛 `ValidationError`
- [x] 内部构造 `Workflow` 形状是私有的，**不**通过类型导出
- [x] 返回 `{ renderResult, flowKey }`；`renderResult` 字段完整镜像 `designState`
- [x] 现有 `WorkflowExecutor.execute()` 行为**完全不变**
- [x] 单元测试覆盖 5 项设计态校验（详见 design.md §3.1）

---

## Task 2: `executeFromDesignState` → `RenderResult` 包装

- **id**: m1-b-t2
- **layer**: engine
- **status**: completed
- **verify**: `pnpm --filter @prism/workflow-core test -- --run render-result-mapping`

### 验收标准

- [x] `ExecutorResult` → `RenderResult` 转换函数 `toRenderResult(designState, execResult, options)` 实现并单测
- [x] `RenderResult.status === 'done'` ↔ `ExecutorResult.status === 'done'`；`'error'` / `'cancelled'` 同理
- [x] `RenderResult.outputs[].slot` 由 `flowKey` 决定（M1 阶段为单输出，slot 取 `flowKey` 默认值；M2 引入 explicitOutputs 后改为按 declared slot）
- [x] `RenderResult.timingMs` 包含真实 start/end 时刻（毫秒整数）
- [x] `RenderResult.designState` 必须等于入参 `designState`（引用相等即可）
- [x] 失败时（`status === 'error'`）`error.code` 取 `RENDER_FAILED` / `RENDER_TIMEOUT` / `RENDER_CANCELLED`，`message` 来自 `execResult.error`
- [x] 单元测试覆盖 7 项转换分支

---

## Task 3: DesignState → Executor Params Adapter

- **id**: m1-b-t3
- **layer**: engine (`packages/image-ops/`)
- **status**: completed
- **verify**: `pnpm --filter @prism/image-ops test -- --run design-state-adapter`

### 验收标准

- [x] 文件 `packages/image-ops/src/adapters/design-state-adapter.ts` 存在
- [x] 导出 `designStateToExecutorParams(designState): ExecutorParamsBundle`
- [x] 接受完整 `DesignState`，仅消费 `inputs` 字段
- [x] 不修改入参，不调用平台 API，纯函数
- [x] 字段缺失抛 `AdapterError extends Error`，含 `path: string`
- [x] `packages/image-ops/src/index.ts` 追加 export
- [x] 单元测试覆盖 5 场景字段映射 + 异常分支

---

## Task 4: 5 场景 fixture → DesignState → 双端闭环集成测试

- **id**: m1-b-t4
- **layer**: engine
- **status**: completed
- **verify**: `pnpm --filter @prism/image-ops test -- --run design-state-roundtrip`

### 验收标准

- [x] 文件 `packages/image-ops/test/m1/design-state-roundtrip.test.ts` 存在
- [x] 复用 `_m0_evidence/shared/fixtures.ts` 的 5 场景 fixture（**不**复制实体）
- [x] 用 M1-A 类型构造对应 `DesignState`，调用 `executeFromDesignState`
- [x] 用同样的 Browser executor 路径输出图像 + 与 `artifacts/verification/M0/metrics.json` 比对
- [x] 用同样的 Node executor 路径输出图像 + 与 `artifacts/verification/M0/metrics.json` 比对
- [x] Browser vs Node RenderResult 几何指标交叉比对
- [x] 全部指标在 design.md §3.3 容差策略范围内
- [x] M0 fixture hash 与 metrics.json 记录的 hash 一致（防 fixture 漂移）
- [x] 若失败，必须输出调试 PNG 到 `artifacts/verification/M1/`（不污染 M0 artifacts）

---

## Task 5: 端到端 typecheck + Smoke check

- **id**: m1-b-t5
- **layer**: engine
- **status**: completed
- **verify**: `pnpm typecheck && pnpm --filter @prism/workflow-core test && pnpm --filter @prism/image-ops test`

### 验收标准

- [x] `pnpm typecheck` 全局通过
- [x] `@prism/workflow-core` 全部单测通过（含 M1-A 新增 ajv 调用已被消费）
- [x] `@prism/image-ops` 全部单测通过（既有 + M1-B 新增）
- [x] 既有 `pnpm test` 不能新增失败用例
- [x] 不动 `packages/shared-types/`（M1-A 已收口）

---

## Task 6: M1-B changelog + OpenSpec 收尾

- **id**: m1-b-t6
- **layer**: meta
- **status**: completed
- **verify**: `cat openspec/changes/m1-b-design-state-roundtrip/tasks.md | grep status`

### 验收标准

- [x] 文件 `docs/changelogs/2026-07-14-m1-b-design-state-roundtrip.md` 存在
- [x] changelog 内容：阶段目标 / 完成证据（5 场景几何指标表）/ 与 M0 对比
- [x] 不动架构文档 / 不动 roadMap / 不动 guardrail
- [x] 6 个具体 task 全部 `completed`

---

## 依赖关系

```
T1 (executeFromDesignState) ──┐
T2 (RenderResult 包装)         ├── 内部依赖 T1
T3 (image-ops adapter)        │   独立
T4 (5 场景集成测试) ────────┬──┘
                           └─ 依赖 T1, T2, T3
T5 (typecheck + smoke) ── 依赖 T1-T4
T6 (changelog + 收尾) ── 依赖 T1-T5
```

---

## 回退方式

- 删除 `openspec/changes/m1-b-design-state-roundtrip/`
- 删除 `packages/workflow-core/src/design-state-execution.ts`
- 还原 `packages/workflow-core/src/executor.ts`（去除 `executeFromDesignState` 方法）
- 还原 `packages/workflow-core/src/index.ts`
- 删除 `packages/image-ops/src/adapters/`、`packages/image-ops/test/m1/` 整个子树
- 还原 `packages/image-ops/src/index.ts`
- 删除 `docs/changelogs/2026-07-14-m1-b-design-state-roundtrip.md`
