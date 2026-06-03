# @prism/shared-types

共享类型定义包，所有包和应用的类型都应从这里导入。

## 导出类型

### 工作流相关

```typescript
import type {
  Workflow,              // 工作流定义
  WorkflowVersion,       // 工作流版本
  WorkflowNode,         // 工作流节点
  WorkflowMetadata,      // 工作流元数据
  Connection,           // 连接定义
  Port,                 // 端口定义
  PortType,             // 端口类型 (image | mask | number | string | boolean | text)
  PortDataType,         // 端口数据类型
} from '@prism/shared-types';
```

### 运行时相关

```typescript
import type {
  ExecutionContext,   // 执行上下文
  ImageRuntimeObject, // 运行时图像对象 (IRO)
  ExecutionLog,       // 执行日志
  ExecutionStatus,    // 执行状态
} from '@prism/shared-types';
```

### 发布相关

```typescript
import type {
  PublishedWorkflow,          // 已发布工作流
  PublishedWorkflowMeta,     // 已发布工作流元数据
  PublishedConfig,          // 已发布配置 (nodeTypes, nodeConfigs, connections)
  PublishedInput,           // 已发布输入
  PublishedOutput,          // 已发布输出
  PublishedInputConfig,     // 输入配置
  PublishedOutputConfig,    // 输出配置
  PublishedParamConfig,     // 参数配置
  PublishedParamDefinition, // 参数定义 (含 UI 元数据)
  ExportFormat,            // 导出格式 (png | jpeg | webp)
  ParamControlType,        // 参数控件类型
} from '@prism/shared-types';
```

### 存储相关

```typescript
import type {
  StorageAdapter,     // 存储适配器接口
  WorkflowStorage,     // 工作流存储
} from '@prism/shared-types';
```

### 认证相关

```typescript
import type {
  User,               // 用户
  AuthToken,          // 认证 Token
  LoginCredentials,   // 登录凭据
} from '@prism/shared-types';
```

### 编辑器相关

```typescript
import type {
  EditorDraft,        // 编辑器草稿
  CanvasState,        // 画布状态
} from '@prism/shared-types';
```

### 模板相关

```typescript
import type {
  Template,           // 模板
  TemplateVersion,    // 模板版本
} from '@prism/shared-types';
```

## 类型验证

使用 Zod 进行运行时类型验证：

```typescript
import { z } from 'zod';
import type { Node } from '@prism/shared-types';

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
});

// 验证数据
const validNode = nodeSchema.parse(nodeData);
```

## 依赖

- `zod` - 类型验证库
- `zustand` - 状态管理库

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行测试 |
| `pnpm clean` | 清理构建产物 |
