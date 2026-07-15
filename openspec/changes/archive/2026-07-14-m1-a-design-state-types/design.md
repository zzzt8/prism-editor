# Design: M1-A — DesignState / RenderRequest / RenderResult / RuntimeTemplate

## Goals

1. 把 M0 fixture 输入结构正式抽象为 4 个 TypeScript 类型 + 对应 JSON schema
2. 用 ajv 在 `@prism/shared-types` 内提供运行时断言式校验入口
3. 保证 4 类型完全 JSON 可序列化，且 `JSON.stringify` round-trip 不丢字段
4. 不改任何既有类型与公开 API；不引入新数据库表；不动 server
5. 为 M1-B 的 workflow-core 新入口 / image-ops adapter 准备好契约与校验入口

## Non-Goals

- 不实现任何 Runtime 入口（M1-B）
- 不引入多 flow 选择逻辑（M2）
- 不做 schema 国际化或区域格式（保留 en-US 数字格式即可）
- 不强制 `flowKey` 枚举值（M2 收）
- 不暴露 `ExecutorOutput` discriminated union 中的中间形状给 RenderResult

---

## Architecture Review

### 候选方案对比

| # | 方案 | 描述 | 决策 |
|---|------|------|------|
| A | 仅 TypeScript type alias + comment | 不写 schema，纯类型 | ❌ 架构护栏 §3 明确"DesignState 必须 JSON 可序列化"且"独立于 React/DOM/Zustand"，校验入口缺失 → 放弃 |
| B | zod 派生 TS 类型 + schema | zod 同时给类型和 schema | ❌ zod 在 project 已有依赖吗？未确认（决定阶段已锁 ajv） |
| C | ajv + 手写 TS interface + 独立 JSON schema 文件 | TS 是 source of truth，JSON schema 由 TS 注释或手写维护；ajv 做运行时校验 | ✅ **采用**（决策见 §Decisions，ajv 已锁定） |
| D | 把新类型放进 `@prism/protocol` 全新包 | 物理隔离 shared-types 与公共协议 | ⚠️ M1+ 阶段可考虑；M1-A 暂不动包边界（护栏 §1.11 要求新增 package 必须在当前 OpenSpec 范围，且只在 shared-types 内增量） |

### 评审清单

- [x] 是否触及 Mall 业务模型？——否（4 类型皆不含 userId/skuId/orderId）
- [x] 是否恢复旧 user system？——否
- [x] 是否携带不可序列化对象？——否（仅 string/number/boolean/array/object/null）
- [x] 是否引入 `findFirst` / 隐式遍历？——否（flowKey 显式字段）
- [x] 是否在 M0 范围内做协议升级？——否（M0 已 archived，M1-A 是纯新增）
- [x] 是否限制 public API 增量？——是：仅新增 4 类型 + 4 校验函数，不改既有导出
- [x] 是否引入新 package？——否
- [x] 是否引入新数据库表？——否
- [x] 是否依赖具体执行器实现？——否（4 类型完全不引用 `@prism/image-ops` / `@prism/workflow-core`）
- [x] 是否兼容 React 19 / Vite 6？——是（与运行时无关，仅 shared-types 层编译）

---

## Type 字段定义

### DesignState（核心输入快照）

```ts
export interface DesignState {
  /** 协议主版本号。M1=1 */
  readonly schemaVersion: 1;
  /** 模板 ID（来自 RuntimeTemplate） */
  readonly templateId: string;
  /** 模板版本（必须 immutable；与 TemplateVersion 一一对应） */
  readonly templateVersion: string;
  /**
   * 显式选择的 flow 标识。当前为 string 类型，M2 收紧为枚举。
   * M1 阶段允许任意非空字符串，但 schema 要求 string 长度 1..256。
   */
  readonly flowKey: string;
  /** 设计输入：资产引用 + 参数 bundle。详见 AssetRef / InputsBundle */
  readonly inputs: DesignStateInputs;
  /** 创建时间（ISO 8601） */
  readonly createdAt: string;
  /** 模板可选 metadata */
  readonly metadata?: DesignStateMetadata;
  /**
   * 不透明追踪标识簇；M1 不校验其业务含义，仅作为可选字段携带。
   * 不进入任何 Runtime 决策路径。
   */
  readonly trace?: DesignStateTrace;
}
```

- 关键约束：`readonly` 全字段；运行时视为不可变快照
- `DesignStateInputs.assets: AssetRef[]`：使用稳定 asset reference + optional checksum
- `DesignStateInputs.params: Record<string, JsonValue>`：纯 JSON 值
- `DesignStateTrace.requestId / traceId / externalReferenceId` 全部可选 string
- ⚠️ **禁止携带**：`Blob / File / Canvas / ImageBitmap / DOM / Function / Store / blob URL`（架构护栏 §3）

### RenderRequest

```ts
export interface RenderRequest {
  /** 必须镜像 DesignState，结构相同 */
  readonly designState: DesignState;
  /**
   * 不透明追踪字段集合；service-to-service 鉴权需要时由调用方填入
   */
  readonly trace?: RenderRequestTrace;
  /** 渲染策略上下文：超时、并发、回执等 */
  readonly options?: RenderRequestOptions;
}
```

- `RenderRequest` 不强制 `designState` 通过校验；但 M1-B 入口必须先 `validateDesignState(request.designState)`

### RenderResult

```ts
/**
 * 渲染输出状态
 */
export type RenderResultStatus = 'done' | 'error' | 'cancelled';

export interface RenderResultOutput {
  /** 稳定产出 ID（用于幂等/回放） */
  readonly id: string;
  /** 输出帧：Browser / Node 均用 ImageRef 抽象 */
  readonly image: ImageRef;
  /** 显式声明的输出 slot name（例如 'mockup' / 'cutting'） */
  readonly slot: string;
}

export interface RenderResult {
  /** 渲染任务 ID（与 trace 对应） */
  readonly renderId: string;
  /** 必须镜像发起请求的 DesignState（用于审计） */
  readonly designState: DesignState;
  /** 渲染结束状态 */
  readonly status: RenderResultStatus;
  /** 输出帧列表。M1 至少含 1 个；M2 引入 explicitOutputs 时允许多个 */
  readonly outputs: ReadonlyArray<RenderResultOutput>;
  /** 错误信息（仅在 status === 'error' 时存在） */
  readonly error?: { code: string; message: string };
  /** 渲染起止时间（毫秒） */
  readonly timingMs: { startedAt: number; endedAt: number };
}
```

### RuntimeTemplate

```ts
export interface RuntimeTemplateInputField {
  readonly id: string;
  readonly name: string;
  /** 公开输入类型（与 shared-types/port-data-types 对齐） */
  readonly type: string;
  readonly required: boolean;
  readonly defaultValue?: JsonValue;
  /** 编辑器暴露给宿主端的可编辑字段 schema（JSON Schema Draft 07 片段） */
  readonly editableSchema?: Record<string, unknown>;
}

export interface RuntimeTemplateFlow {
  readonly flowKey: string;
  /** 该 flow 内部节点定义（M1-B 内部消费，M1-A 仅占位） */
  readonly nodes: ReadonlyArray<{ readonly id: string; readonly type: string }>;
}

export interface RuntimeTemplate {
  readonly id: string;
  readonly version: string;
  readonly schemaVersion: 1;
  readonly displayName: string;
  readonly inputs: ReadonlyArray<RuntimeTemplateInputField>;
  readonly flows: ReadonlyArray<RuntimeTemplateFlow>;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

---

## Decisions

### Decision 1: `schemaVersion` 字段语义与编号策略

**选择**：
- 字段类型为数字字面量联合 `1`；M1 仅支持 `1`
- 同一主版本下：纯增字段 → 仍是 `1`（向后兼容，旧消费者忽略未知字段）
- 同一主版本下：删除/重命名字段 → 必须升 `2`（破坏兼容）
- 字段改名/语义变更 → 必须升 `2`

**理由**：把 schemaVersion 设计成数字而不引入 semver，避免 major/minor 名词混淆；架构护栏 §2.2 要求 `templateVersion` 不可变，`schemaVersion` 用于 DesignState 自身，不与 templateVersion 耦合。

**备选**：semver `"1.0.0"` 字符串 — 灵活但需要解释 major/minor 含义；M1 暂不需要此粒度。

### Decision 2: `flowKey` 为 `string` 而非 enum

**选择**：`flowKey: string`，schema 校验：`minLength: 1, maxLength: 256, pattern: "^[a-z0-9][a-z0-9._-]{0,255}$"`

**理由**：决策阶段已锁。`string` 给 M2 收紧为枚举保留空间（M2 之前新增 flowKey 不需要发版）。

### Decision 3: ajv 版本与配置

**选择**：`ajv ^8`；`ajv-formats` M1-A 不引入；validator 配置：
```ts
{
  allErrors: true,
  strict: true,
  removeAdditional: false,
  useDefaults: true,
}
```

**理由**：
- `allErrors: true` 让一次返回所有错误，方便 UI 一次性高亮
- `strict: true` 拒绝未知关键字（防 schema 错配）
- `removeAdditional: false` 强制字段多余时直接报错（不静默丢弃）
- `useDefaults: true` 自动填充字段默认值（如 schemaVersion 缺省为 1）

### Decision 4: JSON schema 文件组织

**选择**：
```
packages/shared-types/src/validation/
  design-state.schema.json
  render-request.schema.json
  render-result.schema.json
  runtime-template.schema.json
  index.ts          # ajv instance + 4 validator 导出
```

**理由**：每类型一文件，路径稳定；M1-B 引用 `@prism/shared-types` 即可。

### Decision 5: RenderResult 只暴露最终帧，不暴露 ExecutorOutput union 子类型

**选择**：`RenderResult.outputs[].image` 是 `ImageRef`（来自 `@prism/shared-types/image.ts`），不是 `ImageRuntimeObject` 也不是 `ExecutorOutput`。

**理由**：架构护栏 §2.1 "Mall 可见范围" 明确 Mall 只理解最终产出；M1-A 的 RenderResult 是"跨端公共契约"，不应包含中间执行器内部形状。

### Decision 6: 校验入口形态

**选择**：
```ts
// packages/shared-types/src/validation/index.ts
import Ajv from 'ajv';
import designStateSchema from './design-state.schema.json';
// ... 其他 schema

const ajv = new Ajv({ allErrors: true, strict: true, removeAdditional: false, useDefaults: true });
const validateDesignStateImpl = ajv.compile<DesignState>(designStateSchema);

export function validateDesignState(input: unknown): asserts input is DesignState {
  if (!validateDesignStateImpl(input)) {
    throw new ValidationError('DesignState', validateDesignStateImpl.errors);
  }
}
// 同形：validateRenderRequest / validateRenderResult / validateRuntimeTemplate

export class ValidationError extends Error {
  constructor(public readonly target: string, public readonly errors: AjvError[] | null | undefined) { /* ... */ }
}
```

**理由**：
- `asserts input is T` 给消费者类型守卫
- throw 不是 silent return，强制调用方处理
- M1 不做 try/catch helper

### Decision 7: 不引入 ajv-keywords / ajv-formats

**选择**：仅 ajv 核心，不引扩展包。

**理由**：M1 的 4 schema 用核心语法足够；扩展包能放到 M2 真正用到再考虑。
