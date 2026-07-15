# Design: M1-B — DesignState 双端闭环验证

## Goals

1. 在 `@prism/workflow-core` 提供 `executeFromDesignState(ds, opts?)` 入口，封装 ajv 校验 + 内部映射 + 执行 + RenderResult 包装
2. 在 `@prism/image-ops` 提供 `designStateToExecutorParams(ds)` adapter
3. 用 M0 同 5 场景 fixture 重新喂入，Browser/Node 双端渲染结果与 `artifacts/verification/M0/metrics.json` 几何一致
4. 不破坏任何现有 API；不引入新数据库表；不动 server

## Non-Goals

- 不引入多 flow 选择（M2）
- 不引入 `explicitOutputs` 字段（M2）
- 不引入 /api/render/design-state 服务端路由（M6）
- 不删除 `WorkflowExecutor.execute()` 旧入口（M4 才删）
- 不重写 M0 fixture 与 metrics.json 文件

---

## Architecture Review

### 候选方案对比

| # | 方案 | 描述 | 决策 |
|---|------|------|------|
| A | 把 `executeFromDesignState` 写成 free function | 与 `WorkflowExecutor` 类无关 | ❌ 现有 `WorkflowExecutor` 已经持有 `executors` 注册表；method 形式便于复用 |
| B | 直接在 `WorkflowExecutor` 上添加 `executeFromDesignState` 方法 | 复用实例 | ✅ **采用** |
| C | 把 adapter 做成"设计期 + 运行时"两套，DesignState 直接携待 adapter 引用 | 序列化无法携带函数 | ❌ 护栏 §3 禁止运行时携带函数 |
| D | 在 `WorkflowExecutor.execute()` 上加 overload 接受 DesignState | 改函数签名 | ❌ 破坏现有签名，不符合"不破坏 API"目标 |
| E | adapter 接受完整 DesignState vs 仅 inputs 段 | 完整更显式，但要求 adapter 容忍 schemaVersion/flowKey 噪音 | ✅ **采用 完整 DesignState**，adapter 仅消费 `inputs` 字段（详见 Decision 2） |

### 评审清单

- [x] 是否动 Mall 业务模型？——否
- [x] 是否动 user 系统？——否
- [x] 是否携带不可序列化对象？——否（adapter 输入输出都是 plain object）
- [x] 是否引入新 package？——否
- [x] 是否引入新数据库表？——否
- [x] 是否依赖 Browser DOM / Node fs？——`@prism/image-ops` 平台层选择已有；design-state-execution 不引入新的平台依赖
- [x] 是否影响 Composer / Dev Tool？——否（M4 才动 UI）
- [x] 是否引入 `findFirst` 隐式选择？——否（M1-B 仍只支持单 flow，flowKey 显式由调用方传入）
- [x] 是否能用 M0 evidence 验证？——是（5 场景 fixture + metrics.json 已存在，作为基线比对）

---

## 1. `executeFromDesignState` 入口设计

签名：
```ts
export interface ExecuteFromDesignStateOptions {
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
  /** 透传给底层 WorkflowExecutor */
  cache?: ExecutionCache;
  enableCache?: boolean;
}

export interface ExecuteFromDesignStateResult {
  renderResult: RenderResult;
  /** 调试用：实际内部生成的 Workflow.snapshot 不外暴露 */
  flowKey: string;
}

export class WorkflowExecutor {
  // 既有 execute() 不动
  async execute(workflow: Workflow, options?: WorkflowExecutorOptions): Promise<ExecutorResult> { /* ... unchanged */ }

  // 新增
  async executeFromDesignState(
    designState: DesignState,
    options?: ExecuteFromDesignStateOptions,
  ): Promise<ExecuteFromDesignStateResult> {
    // 1. ajv 校验（M1-A 提供 validateDesignState）
    validateDesignState(designState);

    // 2. 内部构造 Workflow（私有，调用方看不见）
    const workflow = buildWorkflowFromDesignState(designState);

    // 3. 调用既有 execute()
    const execResult = await this.execute(workflow, options);

    // 4. 包装为 RenderResult
    return {
      renderResult: toRenderResult(designState, execResult, options),
      flowKey: designState.flowKey,
    };
  }
}
```

关键约束：
- 校验失败抛 `ValidationError`（M1-A 已定义）
- `workflow` 构造细节在 `WorkflowExecutor` 内部完成，**不暴露**给外部消费者
- `RenderResult.designState` 是原设计状态的镜像（用于审计）

---

## 2. DesignState → Executor Params Adapter

```ts
// packages/image-ops/src/adapters/design-state-adapter.ts

import type { DesignState } from '@prism/shared-types';

export interface ExecutorParamsBundle {
  /** 给哪类节点执行器用 */
  [nodeId: string]: {
    params: Record<string, unknown>;
    inputs: Record<string, unknown>;
  };
}

/**
 * 把 DesignState.inputs 映射成 executor params。
 * 接受 DesignState 完整对象，但仅消费 `inputs` 字段：
 *   - inputs.assets        → AssetRef[]
 *   - inputs.params        → Record<string, JsonValue>
 *   - inputs.transforms    → TransformDescriptor[]
 *
 * 不修改入参，不调用任何平台 API，纯函数。
 */
export function designStateToExecutorParams(
  designState: DesignState,
): ExecutorParamsBundle {
  // 在 M1-B 仅支持 5 个 M0 fixture 场景：identity / scale-2x / rotate-90 / scale-rotate / translate-scale
  // 对应 TransformDescriptor shape: { translateX, translateY, scaleX, scaleY, rotation }
  // 输入形态经由 image-ops 的 fixture builder 决定
  // ...
}
```

- 失败抛 `AdapterError`（继承 `Error`），含字段路径
- 不做 fallback；字段缺失直接抛错

---

## 3. 测试策略

### 3.1 设计态校验（workflow-core/design-state-execution.test.ts）

- ✅ 合法 DesignState 通过校验
- ✅ `schemaVersion: 2` 拒绝
- ✅ 缺 `templateId` 拒绝
- ✅ `flowKey` 为空字符串拒绝
- ✅ `validateDesignState` 抛 `ValidationError`（不是 `Error`）

### 3.2 Adapter 字段映射（image-ops/test/m1/design-state-adapter.test.ts）

- ✅ 5 场景 inputs → params 字段完整性
- ✅ 字段类型校验（string/number/boolean/null）
- ✅ 数组字段空数组 vs 缺失区分
- ✅ params 字段命名映射（camelCase ↔ kebab-case 规则锁定）

### 3.3 双端闭环（image-ops/test/m1/design-state-roundtrip.test.ts）

- ✅ 5 场景 fixture → DesignState 构造 → `executeFromDesignState`
- ✅ Browser executor 执行 → RenderResult 与 M0 metrics 对比
- ✅ Node executor 执行 → RenderResult 与 M0 metrics 对比
- ✅ Browser vs Node RenderResult 几何比对
- **容差**（与 M0 已记录差异对齐）：
  - `alphaMaskIoU >= 0.95`
  - `interiorRgbMae <= max(M0_threshold, M0_measured * 1.1)`
  - 其余指标 ≤ M0 阈值

---

## Decisions

### Decision 1: `executeFromDesignState` 用 method 而非 free function

**选择**：`WorkflowExecutor` 类上新增方法。

**理由**：
- 现有 `WorkflowExecutor` 实例持有 `executors` 注册表；free function 还需要传 executors，破坏 API
- method 形态方便测试时 mock

### Decision 2: Adapter 接受完整 DesignState 但仅消费 `inputs`

**选择**：`designStateToExecutorParams(designState: DesignState)`；内部仅取 `designState.inputs`。

**理由**：
- 与将来"Multi-flow"扩展一致（adapter 不需要关心 flowKey）
- 调用方无需先解构

**备选**：仅接收 `DesignStateInputs` 子集——更窄，但调用方需要先 destructure，调用更啰嗦

### Decision 3: 内部 `buildWorkflowFromDesignState` 私有化

**选择**：构造 Workflow 的细节在 `WorkflowExecutor` 内私有；不对外暴露 `Workflow` 形状。

**理由**：M1-B 阶段尚不允许把内部 DAG 暴露给外部（架构护栏 §2.1）；M2/M4 会进一步设计

### Decision 4: M0 fixture 不复制，重用

**选择**：`packages/image-ops/test/m1/fixtures/` 软链接 / 复用 `packages/image-ops/_m0_evidence/shared/fixtures.ts`，不复制实体代码

**理由**：保证两阶段 fixture hash 一致，比对才有意义

### Decision 5: 几何比对容差策略

**选择**：比对指标时若超 M0 阈值，**额外允许** 1.1× 倍数（吸收可能的浮点小差），但**禁止**超过 M0 已记录最大值的 1.5×。

**理由**：M0 已在 metrics.json 记录了"最大 borderline 场景"；M1-B 不能比 M0 更差
