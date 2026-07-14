# @prism/shared-types

跨包共享的 TypeScript 类型定义。所有包和应用的类型都应从这里导入。涵盖工作流、节点、运行时、发布、编辑器、存储、认证、模板、片段、执行日志、运行协议、端口类型系统等领域。

## 模块概览

| 模块 | 关键导出 | 用途 |
|------|----------|------|
| `workflow.ts` | `Workflow` / `WorkflowNode` / `Connection` / `Port` / `PortType` / `WorkflowMetadata` | 工作流静态结构 |
| `node.ts` | `NodeDefinition` / `PortDefinition` / `ParamDefinition` / `NodeExecutor` / `NodeExecutorMap` | 节点 schema 与执行器契约 |
| `execution.ts` | `ExecutionContext` / `ExecutionProgress` / `ExecutionStatus` / `ImageRuntimeObject` | 运行时执行模型 |
| `image.ts` | 图像相关类型 | IRO 与图像操作 |
| `port-data-types.ts` | `PortDataType` 枚举 / `PipelineData` / `TYPE_COMPATIBILITY` / `canConnectByDataType` | 端口类型系统 + 连接校验 |
| `port-types.ts` | `PortType` 别名 + 端口类型集合 | PortType 是 PortDataType 的字符串别名 |
| `published.ts` | `PublishedWorkflow` / `PublishedParamDefinition` / `PublishedInputConfig` / `PublishedOutputConfig` / `PublishedConfig` | 发布态 v2 参数模型 |
| `editor-draft.ts` | `EditorDraft` / `EditorCanvasNode` / `EditorCanvasEdge` / `EditorNodeGroup` / `EditorWorkflowMeta` | 编辑器持久化状态（不含运行时） |
| `template.ts` | `Template` / `TemplateVersion` | 模板与版本化 |
| `snippet.ts` | `SnippetSummary` 等 | 节点片段 |
| `storage.ts` | `StorageAdapter` / `WorkflowMeta` | 存储抽象 |
| `auth.ts` | `AuthRole` / `AuthPermission` / `RolePermissions` / `AuthContext` | 三层角色 + 权限模型 |
| `runtime-protocol.ts` | `RuntimeProtocol` / `RuntimeEndpoint` / `EmbedConfig` | 运行协议抽象（page / api / embed） |
| `execution-log.ts` | `ExecutionLog` / `NodeTiming` / `ExecutionError` | 执行日志模型 |
| `node-package.ts` | 节点包相关类型 | 自定义节点包 |
| `design-state.ts`（M1-A） | `DesignState` / `AssetRef` / `JsonValue` / `DesignStateTrace` | 跨端设计输入快照 |
| `render-request.ts`（M1-A） | `RenderRequest` / `RenderRequestTrace` / `RenderRequestOptions` | 渲染调用契约 |
| `render-result.ts`（M1-A） | `RenderResult` / `RenderResultOutput` / `RenderError` / `RenderTiming` | 渲染输出契约 |
| `runtime-template.ts`（M1-A） | `RuntimeTemplate` / `RuntimeTemplateInputField` / `RuntimeTemplateFlow` | 运行时模板描述（与 `Template` 正交） |
| `validation/index.ts`（M1-A） | `validateDesignState` / `validateRenderRequest` / `validateRenderResult` / `validateRuntimeTemplate` / `ValidationError` | ajv 运行时校验入口 |
| `flow.ts`（M2-A） | `Flow` / `FlowKey` / `FlowNodeRef` / `FlowOutput` / `FlowOutputSlot` / `FlowKind` | Flow 权威定义与稳定 flowKey 字符串 brand |
| `validation/index.ts`（M2-A） | `validateFlow` / `validateFlowKey` | Flow 与 FlowKey 的 ajv 校验入口（含语义校验） |
| `createId.ts` | `createId()` | ID 生成器 |

## 导出类型

### 工作流相关

```typescript
import type {
  Workflow,              // 工作流定义
  WorkflowNode,          // 工作流节点
  Connection,            // 连接定义
  Port,                  // 端口定义
  PortType,              // 端口类型 (image | mask | number | string | boolean | file | text)
  WorkflowMetadata,      // 工作流元数据 (description / author / tags / createdAt / updatedAt / targetPlatform)
} from '@prism/shared-types';
```

### 节点相关

```typescript
import type {
  NodeDefinition,        // 节点元信息
  PortDefinition,        // 端口定义
  ParamDefinition,       // 参数定义
  NodeExecutor,          // 节点执行器签名
  NodeExecutorMap,       // 节点类型 → 执行器映射
  UIConfig,              // 节点 UI 配置
} from '@prism/shared-types';
```

### 端口类型系统

```typescript
import {
  PortDataType,          // 枚举：IMAGE | MASK | VIDEO | AUDIO | FILE | JSON | STRING | NUMBER | BOOLEAN | ANY | VOID
  canConnectByDataType,  // 检查两个端口是否可连接
  isCompatible,          // 同上 boolean 版
  toPipeline,            // 创建 PipelineData 包装
  isPipelineData,        // 类型守卫
  TYPE_COMPATIBILITY,    // 类型兼容矩阵
} from '@prism/shared-types';
```

`PortDataType` 与 `PortType` 同值（`PortType` 是 `PortDataType` 的字符串别名）。

### 运行时相关

```typescript
import type {
  ExecutionContext,      // 执行上下文
  ExecutionProgress,     // 执行进度
  ExecutionStatus,       // 执行状态 (idle | running | done | error | cancelled)
  ImageRuntimeObject,    // 运行时图像对象 (IRO)
} from '@prism/shared-types';

import {
  CacheEntry,            // LRU 缓存条目（仅 workflow-core 内部使用）
} from '@prism/shared-types';
```

### 发布相关（v2 参数模型）

```typescript
import type {
  PublishedWorkflow,           // 已发布工作流
  PublishedWorkflowMeta,       // 已发布工作流元数据
  PublishedConfig,             // 已发布配置 (nodeTypes, nodeConfigs, connections, inputs, exposedParams, outputs, paramDefinitions, requiredNodes)
  PublishedInput,              // 已发布输入
  PublishedOutput,             // 已发布输出
  PublishedInputConfig,        // v2 输入配置
  PublishedOutputConfig,       // v2 输出配置
  PublishedParamConfig,        // v2 参数配置（精简）
  PublishedParamDefinition,    // v2 参数定义（富元信息）
  PublishedParamValidation,    // 参数校验规则
  PublishedParamVisibility,    // 可见性
  ParamControlType,            // 'select' | 'number' | 'string' | 'boolean' | 'image-file'
  ExportFormat,                // 'png' | 'jpeg' | 'webp'
  PublishOptions,
} from '@prism/shared-types';
```

### 存储相关

```typescript
import type {
  StorageAdapter,        // 存储适配器接口
  WorkflowMeta,          // 工作流元数据
  JsonFileAdapter,       // JSON 文件导入/导出
  LocalStorageAdapterOptions,
} from '@prism/shared-types';
```

### 认证相关

```typescript
import { AuthRole, AuthPermission, RolePermissions } from '@prism/shared-types';
import type { AuthContext } from '@prism/shared-types';

// AuthRole: AUTHOR | OPERATOR | ADMIN
// AuthPermission: READ | EXECUTE | EDIT | PUBLISH | MANAGE
```

### 编辑器相关

```typescript
import type {
  EditorDraft,           // 编辑器草稿（持久化层契约）
  EditorCanvasNode,      // 画布节点
  EditorCanvasEdge,      // 画布边
  EditorNodeGroup,       // 节点分组
  EditorWorkflowMeta,    // 工作流元数据
  EditorNodeData,        // 节点数据（带 [key: string]: unknown 索引签名支持运行时扩展字段）
} from '@prism/shared-types';
```

`EditorNodeData` 通过索引签名允许附加 `executionResult` / `executionError` 等运行时字段（`@prism/core` 内部约定，详见 `editor-draft.ts`）。

### 模板相关

```typescript
import type {
  Template,              // 模板
  TemplateVersion,       // 模板版本
} from '@prism/shared-types';
```

### 执行日志

```typescript
import type {
  ExecutionLog,          // 单次执行完整生命周期
  NodeTiming,            // 节点耗时记录
  ExecutionError,        // 节点错误
  ExecutionLogStatus,    // 'started' | 'completed' | 'failed' | 'cancelled'
  NodeTimingStatus,      // 'pending' | 'running' | 'done' | 'error'
} from '@prism/shared-types';
```

### 运行协议

```typescript
import type {
  RuntimeProtocol,       // 运行协议（page | api | embed）
  RuntimeEndpoint,       // API 端点
  EmbedConfig,           // 嵌入配置
  RuntimeProtocolType,   // 'page' | 'api' | 'embed'
  HttpMethod,
} from '@prism/shared-types';
```

## 工具函数

```typescript
import { createId } from '@prism/shared-types';
const id = createId(); // 生成 ID
```

## M1-A 公共契约（m1-a-design-state-types）

Prism 跨端共享的版本化契约。`DesignState` / `RenderRequest` / `RenderResult` / `RuntimeTemplate` 在 Browser Runtime 与 Production Runtime 之间保持同一形状。

### DesignState

```typescript
import {
  type DesignState,
  validateDesignState,
} from '@prism/shared-types';

const ds: DesignState = JSON.parse(rawJson);
validateDesignState(ds); // throws ValidationError on failure; narrows to DesignState on success
```

- `schemaVersion: 1` 是字面量类型；纯字段增 → 仍是 `1`，改名 / 删除 / 改类型 → 必须 bump 到 `2`
- `templateVersion` 与 `schemaVersion` 独立；前者是模板内容版本，后者是协议版本
- `flowKey` 当前为 string 形态（M2 收紧为 enum）
- **禁止携带**：`Blob / File / Canvas / ImageBitmap / DOM / Function / Store / blob URL`（架构护栏 §3）
- `JsonValue` 联合是递归的 JSON-safe 值；不允许任何不可序列化对象

### RenderRequest

```typescript
import { type RenderRequest, validateRenderRequest } from '@prism/shared-types';
```

包裹 `DesignState` + 可选 trace 字段 + 可选 options。`designState` 通过 `$ref` 复用 DesignState schema，不重复声明字段。

### RenderResult

```typescript
import { type RenderResult, type RenderResultStatus } from '@prism/shared-types';
```

跨端统一的渲染输出形状。`outputs[].image` 是 `ImageRef`（不含 `ExecutorOutput` 内部子类型）；`status: 'done' | 'error' | 'cancelled'`；`timingMs` 必填。

### RuntimeTemplate

```typescript
import { type RuntimeTemplate, validateRuntimeTemplate } from '@prism/shared-types';
```

公共的运行时模板描述，独立于 `Template`（EditorDraft 快照模型）。`flows[].nodes` 仅暴露 `{id, type}`，**不**含位置 / 参数 / DAG 内部结构。

### 运行时校验入口

`@prism/shared-types/src/validation/index.ts` 暴露四个 `validate*` 函数（M1-A），全部为 `asserts input is <Type>` 形态，校验失败抛 `ValidationError`：

| 函数 | 目标类型 |
|------|----------|
| `validateDesignState(input)` | `DesignState` |
| `validateRenderRequest(input)` | `RenderRequest` |
| `validateRenderResult(input)` | `RenderResult` |
| `validateRuntimeTemplate(input)` | `RuntimeTemplate` |
| `validateFlow(input)`（M2-A） | `Flow` |
| `validateFlowKey(input)`（M2-A） | `FlowKey` |

```typescript
import { validateDesignState, ValidationError } from '@prism/shared-types';

try {
  validateDesignState(JSON.parse(raw));
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.target, err.errors);
  }
}
```

- ajv 配置：`{ allErrors: true, strict: true, removeAdditional: false, useDefaults: true }`
- **不**引入 ajv-formats / ajv-keywords；M1 不需要 `date-time` 等格式扩展
- 校验函数是 pure：不会 stringify 输入、不会修改入参

### 版本策略

- M1 = `schemaVersion: 1`
- M2-A = `schemaVersion: 2`（适用于 `RenderRequest` / `RenderResult` / `RuntimeTemplate`）；`DesignState` 仍是 `1`（纯字段增）；`Flow` 初始 `1`
- 纯加字段 → 保持当前版本
- 重命名 / 删除 / 改类型 / 新增必填字段 → 必须 bump
- schema 文件位于 `packages/shared-types/src/validation/`

### Mall 公开 vs 内部字段边界

| 字段 / 类型 | Mall 可见？ | 备注 |
|------------|-----------|------|
| `DesignState.flowKey` | ✅ | 唯一权威 flow 选择依据 |
| `RenderRequest.requestedOutputSlots` | ✅ | 必填非空 slot 名数组 |
| `RuntimeTemplateFlow.flowKey` | ✅ | 公开 |
| `RuntimeTemplateFlow.explicitOutputs[].slot / kind / mediaType` | ✅ | 公开 slot 投影 |
| `Flow.explicitOutputs[].nodeId / port` | ❌ | 内部 DAG 细节（护栏 §2.1） |
| `Flow`（整体） | ❌ | 引擎 / server 内部消费 |
| `RenderRequest` 中携带 `flowKey` | ❌ | schema `additionalProperties: false` 拒绝（决定 #5） |

## M2-A 公共契约（m2-a-deterministic-flow-and-output-protocol）

`M2-A` 在 `M1-A` 基础上引入 4 个跨包公开类型 + 收紧 `flowKey` 形态，并完成 5 个 schema 的同步升级。对应护栏 §1.7（Flow 选择显式）、§1.8（输出显式声明）。

### FlowKey

`flowKey` 是稳定格式字符串（**非封闭枚举**）。新增 flowKey 只需配置模板与 Flow，**不需要修改 shared-types**（护栏 §1.9）。

```typescript
import { type FlowKey, validateFlowKey } from '@prism/shared-types';

// pattern: ^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$
// minLength: 1, maxLength: 96
const k: FlowKey = 'production.print' as FlowKey;
validateFlowKey(k); // throws ValidationError on shape mismatch
```

### Flow / FlowNodeRef / FlowOutput / FlowOutputSlot

`Flow` 是引擎 / server 内部消费的不可变 Flow 定义；`explicitOutputs` 携带 `nodeId + port` 内部细节。`FlowOutputSlot` 是 `Flow.explicitOutputs` 的**公开投影**，仅暴露 `{ slot, kind, mediaType? }`，对 Mall 屏蔽内部 DAG。

```typescript
import { type Flow, type FlowOutputSlot } from '@prism/shared-types';

// 公开协议只能看到 FlowOutputSlot 三字段
const slot: FlowOutputSlot = { slot: 'mockup', kind: 'image', mediaType: 'image/png' };
```

### RuntimeTemplate.flows[].explicitOutputs

`RuntimeTemplateFlow` 新增 `explicitOutputs: ReadonlyArray<FlowOutputSlot>` 必填非空；`schemaVersion` 升级为 `2`。

```typescript
import { type RuntimeTemplate, validateRuntimeTemplate } from '@prism/shared-types';

const t: RuntimeTemplate = { /* ... */ flows: [{
  flowKey: 'production.print' as FlowKey,
  nodes: [{ id: 'n1', type: 'load-image' }],
  explicitOutputs: [{ slot: 'mockup', kind: 'image' }],
}] };
validateRuntimeTemplate(t);
```

### RenderRequest.requestedOutputSlots

`RenderRequest` 新增 `requestedOutputSlots: ReadonlyArray<string>` 必填非空（`minItems: 1, maxItems: 64`）。`schemaVersion` 升级为 `2`。`RenderRequest` 不允许携带 `flowKey`（schema `additionalProperties: false` 拒绝）。

```typescript
import { type RenderRequest, validateRenderRequest } from '@prism/shared-types';

const req: RenderRequest = {
  designState: ds,
  requestedOutputSlots: ['mockup'], // 必填非空
};
validateRenderRequest(req);
```

### RenderResult 顺序规则 + 追溯字段

- `RenderResult.outputs` 顺序 = `Flow.explicitOutputs` 声明顺序（经 `requestedOutputSlots` 过滤）—— **不**依赖对象遍历顺序 / 执行顺序 / `findFirst`
- `RenderResult.templateVersion` 必填；与 `designState.templateVersion` 一致（post-validation 校验）
- `RenderResultOutput.flowKey` 必填；与 `designState.flowKey` 一致（post-validation 校验）
- `schemaVersion` 升级为 `2`

```typescript
import { type RenderResult, validateRenderResult } from '@prism/shared-types';

const r: RenderResult = { /* ... */ outputs: [
  { id: 'o1', slot: 'mockup', flowKey: 'production.print' as FlowKey, image: {...} },
] };
validateRenderResult(r);
```

### M2-A 校验错误码

| 错误码 | 抛出位置 | 触发条件 |
|--------|---------|----------|
| `DUPLICATE_FLOW_KEY` | `validateRuntimeTemplate` | 同一 TemplateVersion 内出现 2+ 同名 `flows[].flowKey` |
| `OUTPUT_SLOT_DUPLICATE` | `validateFlow` | 同一 Flow 内 `explicitOutputs[]` 含重复 `slot` |
| `OUTPUT_NODE_NOT_FOUND` | `validateFlow` | `explicitOutputs[].nodeId` 不在 `nodeRefs[].nodeId` |
| `REQUESTED_OUTPUTS_EMPTY` | `validateRenderRequest` | `requestedOutputSlots.length === 0` |
| `TEMPLATE_VERSION_MISMATCH` | `validateRenderResult` | `templateVersion !== designState.templateVersion` |
| `OUTPUT_FLOW_KEY_MISMATCH` | `validateRenderResult` | `outputs[].flowKey !== designState.flowKey` |
| `OUTPUT_PORT_NOT_FOUND` | M2-B 启用 | `explicitOutputs[].port` 不在节点定义 |
| `REQUESTED_OUTPUT_UNKNOWN` | M2-B 启用 | `requestedOutputSlots` 包含 Flow 未声明 slot |

错误统一通过 M1-A `ValidationError` 抛出，含 `target` + `errors[]`（每个 error 带 JSON Pointer 路径的 `instancePath`）。

## 类型验证

各包使用 ajv / Zod 进行运行时类型验证。M1-A 引入的公共契约在 `@prism/shared-types` 内自带 ajv 校验入口（`validateDesignState` / `validateRenderRequest` / `validateRenderResult` / `validateRuntimeTemplate`）；consumer 包可选择直接复用或自行声明 schema。

## 依赖

- `zustand` - 状态管理库（被编辑器 store 引用）
- `ajv` ^8.18.0 - JSON Schema 运行时校验（M1-A 引入）
- `zod` ^4.3.6 - 运行时类型校验（project 已存在依赖）

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm clean` | 清理构建产物 |
