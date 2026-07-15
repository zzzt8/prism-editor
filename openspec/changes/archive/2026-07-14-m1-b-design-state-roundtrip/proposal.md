# Proposal: M1-B — DesignState 双端闭环验证

> **change_class**: high
> **reason**: 在 `@prism/workflow-core` 引入 `WorkflowExecutor.executeFromDesignState()` 方法，在 `@prism/image-ops` 引入 DesignState → executor params adapter，并复用 M0 的 5 场景 fixture 重新验证 Browser/Node 双端几何一致性。涉及 2 个包（workflow-core + image-ops）的 engine 层 API 新增；按 openspec-propose 规则为 `high`。
> **depends_on**: `m1-a-design-state-types`（M1-B 必须消费 M1-A 的 4 类型 + 4 校验入口）
> **blocks**: 无（M1-B 是 M1 阶段最后一环；M2 再向上推进）

---

## Why

M1-A 把 fixture 输入正式抽象为 `DesignState` + 4 类型契约与 ajv 校验，但只是"类型存在"，两端 Runtime（`@prism/image-ops` 的 Browser/Node executor）实际仍未消费它。M1-B 必须打通从 `DesignState → RenderRequest → WorkflowExecutor → RenderResult` 的完整路径，并把 M0 的 5 个场景（identity / scale-2x / rotate-90 / scale-rotate / translate-scale）以 DesignState 形态重新喂入，让 Browser / Node 端输出与 M0 `artifacts/verification/M0/metrics.json` 保持几何一致。

完成 M1-B 后才真正满足架构护栏 §1.5："浏览器预览和 Node 生产必须共享同一套 `DesignState` 与参数语义"——这是路线图 M1 的"阶段完成标志"。

## What Changes

1. **`packages/workflow-core/src/design-state-execution.ts`**（新文件）
   - 导出 `executeFromDesignState` 函数与辅助类型
2. **`packages/workflow-core/src/executor.ts`**
   - 保留现有 `WorkflowExecutor.execute()`，**新增**方法 `executeFromDesignState(designState, options?)`
3. **`packages/image-ops/src/adapters/design-state-adapter.ts`**（新文件）
   - 导出 `designStateToExecutorParams(designState): Record<string, unknown>`：把 DesignState inputs 映射为 executor params
4. **`packages/image-ops/test/m1/design-state-roundtrip.test.ts`**（新文件）
   - 5 场景 fixture → DesignState → executeFromDesignState → 双端执行 → 几何指标比对 `metrics.json`
5. **`packages/workflow-core/src/design-state-execution.test.ts`**（新文件）
   - ajv 校验失败时抛 `ValidationError`
   - flowKey 为空 / schemaVersion 非 1 拒绝
   - 合法 DesignState 通过并返回 RenderResult 形态
6. **`packages/image-ops/test/m1/design-state-adapter.test.ts`**（新文件）
   - 5 场景 inputs → params 转换的字段完整性
   - 字段 null/undefined 行为
7. **`docs/changelogs/2026-07-14-m1-b-design-state-roundtrip.md`**（新文件）
   - 阶段总结：M1-B 完成 + 几何验证结果

---

## Capabilities

- **双端闭环入口**：`@prism/workflow-core` 提供 `executeFromDesignState()`，接受 `DesignState` + `RenderRequestOptions`，返回 `RenderResult`
- **校验前置**：执行前先 ajv `validateDesignState(designState)`，失败抛 `ValidationError`
- **adapter 隔离**：`@prism/image-ops` 通过 adapter 把 DesignState 字段映射到 executor params；adapter 是唯一允许知道"DesignState 内部字段如何映射 params"的地方
- **M0 fixture 重现**：M1-B 测试套件用 M0 同 5 场景 fixture 重新生成 DesignState，并比对 `artifacts/verification/M0/metrics.json` 记录的几何指标（边缘差异在 M0 已记录的 anti-aliasing 范围内允许）
- **不破坏旧入口**：现有 `WorkflowExecutor.execute(workflow, options)` **不变**；M1-B 是**新增**，不在 M1-B 阶段做 M4 那种合并
- **可观测**：`RenderResult.timingMs` 必填，方便 M1+ 阶段对比双端耗时
- **不追溯 DB**：本阶段不把 DesignState 落到 Prisma

---

## Impact

| 范围 | 影响 |
|------|------|
| 新增文件 | `packages/workflow-core/src/design-state-execution.ts`、`packages/image-ops/src/adapters/design-state-adapter.ts`、测试 3 个、changelog 1 个 |
| 修改文件 | `packages/workflow-core/src/executor.ts`（仅追加方法，不改 `execute()`）、`packages/workflow-core/src/index.ts`（仅追加 export）、`packages/image-ops/src/index.ts`（仅追加 export） |
| 触及层 | engine（`@prism/workflow-core` + `@prism/image-ops`）；不动 shared-types（M1-A 已交付类型） |
| 数据库 | **无** |
| 公开 API | **新增** `executeFromDesignState`；不删任何旧公开 API |
| Mall 接入 | **无** |
| 服务端 | **无改动**（M1-B 不新增 /api/render/design-state 端点） |
| UI | **无改动** |

---

## Decisions（high class 必须 Section，引用 `design.md`）

详见 `design.md`：
- `executeFromDesignState` 用 method 还是 free function（method，与现有 WorkflowExecutor 实例一致）
- DesignState → Workflow 的内部映射（不暴露给 M1-B 外部消费者）
- adapter 接受 `DesignState` 的最小子集 vs 完整对象（最小子集，但不严格要求）
- 5 场景 fixture 与 M0 metrics 对比容差策略（M0 已记录 anti-aliasing 差异）

---

## Out of Scope

- 不在 M1-B 引入多 flow 选择 / explicitOutputs（M2）
- 不引入服务端 HTTP 接入（M6）
- 不引入 Composer / Dev Tool UI 切换（M4）
- 不删 `WorkflowExecutor.execute()` 旧入口（M4 才删）
- 不持久化 DesignState 到 Prisma
- 不动 M0 已 archived 的产物文件（`artifacts/verification/M0/*` 视为不可变基线）
- 不重写 `core/*` 的纯算法实现
- 不引入 `WorkerPool` / `OffscreenCanvas` 改造（M3 范围）
- 不动 ajv 依赖（已在 M1-A 加入）
- 不动 server / 不动 mall BFF
