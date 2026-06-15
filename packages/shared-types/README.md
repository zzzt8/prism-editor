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

## 类型验证

各包使用 Zod 进行运行时类型验证。`@prism/shared-types` 提供契约类型，consumer 包可选择自行声明 Zod schema。

## 依赖

- `zustand` - 状态管理库（被编辑器 store 引用）

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm clean` | 清理构建产物 |
