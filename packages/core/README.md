# @prism/core

自定义节点运行时注册表与内联执行器解析包。提供 `globalRegistry` 单例、`parseInlineExecutor` / `validateInlineCode` / `extractFunctionName` 三个工具函数。

## 功能

- **全局节点注册表**: `globalRegistry` - 管理所有内置和自定义节点类型
  - 启动时自动 initialize，从 `@prism/node-definitions` 加载全部内置定义，从 `@prism/image-ops` 加载全部内置执行器
  - 支持运行时注册 / 反注册自定义节点（`registerNode` / `unregisterCustomNode`）
  - 区分内置 / 自定义节点（`isCustomNode` / `listBuiltInNodes` / `listCustomNodes`）
  - 按平台过滤（`listByPlatform('browser' | 'nodejs')`）
- **内联执行器**: `parseInlineExecutor` - 用 `Function` 构造器将用户代码字符串包装为 `NodeExecutor`
- **代码验证**: `validateInlineCode` - 用同样的构造器做轻量语法校验
- **函数名提取**: `extractFunctionName` - 从代码中提取 `function name(...)` 的 `name`
- **批量注册**: `registerAll` - 一次注册多个 definitions + executors

## 核心 API

### globalRegistry

全局节点注册表，单例。所有 consumer 共享同一个 registry。

```typescript
import { globalRegistry } from '@prism/core';

// 1. 初始化（一般由执行服务调用）
globalRegistry.initialize();

// 2. 注册自定义节点
globalRegistry.registerNode({
  type: 'my-node',
  category: 'transform',
  label: 'My Custom Node',
  description: '示例',
  inputs: [],
  outputs: [],
  params: [],
  ui: { color: '#a855f7' },
}, /* isCustom */ true);

globalRegistry.registerExecutor('my-node', async (ctx) => {
  const input = ctx.requireInput('image');
  // 处理逻辑
  ctx.setOutput('result', processedImage);
});

// 3. 批量注册（推荐用于节点包）
globalRegistry.registerAll(
  [myDefinition1, myDefinition2],
  { 'my-node-1': myExec1, 'my-node-2': myExec2 },
  true,
);

// 4. 查询
const def = globalRegistry.getNode('my-node');
const exec = globalRegistry.getExecutor('my-node');
const allNodes = globalRegistry.listNodes();
const builtIn = globalRegistry.listBuiltInNodes();
const custom = globalRegistry.listCustomNodes();
const browserOnly = globalRegistry.listByPlatform('browser');

// 5. 卸载自定义节点
const removed = globalRegistry.unregisterCustomNode('my-node');

// 6. 获取所有执行器（一次性给 WorkflowExecutor）
const executorMap = globalRegistry.getExecutors();
```

### parseInlineExecutor

将内联执行器代码字符串解析为可调用 `NodeExecutor`：

```typescript
import { parseInlineExecutor } from '@prism/core';

const executor = parseInlineExecutor(
  `
  const img = inputs.image;
  const opacity = params.opacity ?? 0.5;
  // ... 处理
  context.setOutput('result', processed);
  `,
  'my-inline-node',
);

await executor({ image: iro }, { opacity: 0.7 }, context);
```

内联代码会被 `Function` 构造器包装为：

```js
new Function('inputs', 'params', 'context', `"use strict";\n${code}`)
```

### validateInlineCode

```typescript
import { validateInlineCode } from '@prism/core';

validateInlineCode('return inputs.image;'); // true
validateInlineCode('return inputs..;');      // false (语法错)
```

### extractFunctionName

```typescript
import { extractFunctionName } from '@prism/core';

extractFunctionName('export async function transformImage() {...}');
// 'transformImage'
```

## 目录结构

```
packages/core/
├── src/
│   ├── globalRegistry.ts       # 全局节点 / 执行器注册表
│   ├── executorUtils.ts        # parseInlineExecutor / validateInlineCode / extractFunctionName
│   ├── globalRegistry.test.ts
│   ├── executorUtils.test.ts
│   └── index.ts                # barrel export
├── package.json
└── README.md
```

## 快速开始

```typescript
// 在 dev-tool / user-app 的执行入口
import { globalRegistry } from '@prism/core';
import { WorkflowExecutor } from '@prism/workflow-core';

globalRegistry.initialize(); // 加载内置节点
const executor = new WorkflowExecutor(globalRegistry.getExecutors());
const result = await executor.execute(workflow, { signal });
```

## 依赖

- `@prism/shared-types` - 共享类型定义（`NodeDefinition` / `NodeExecutor` / `NodeExecutorMap`）
- `@prism/node-definitions` - 内置节点定义来源
- `@prism/image-ops` - 内置执行器来源

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm clean` | 清理构建产物 |
