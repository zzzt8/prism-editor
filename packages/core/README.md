# @prism/core

自定义节点内联执行器包。

## 功能

- **全局节点注册表**: `globalRegistry` - 管理所有自定义节点类型的注册
- **内联执行器解析**: `parseInlineExecutor` - 解析和执行内联代码节点
- **代码验证**: `validateInlineCode` - 验证内联代码的有效性和安全性
- **函数提取**: `extractFunctionName` - 从内联代码中提取函数名

## 核心 API

### globalRegistry

全局节点注册表，用于注册和管理自定义节点类型。

```typescript
import { globalRegistry } from '@prism/core';

// 注册自定义节点
globalRegistry.register('my-node', {
  execute: async (ctx) => {
    const input = ctx.requireInput('image');
    // 处理逻辑
    ctx.setOutput('result', processedImage);
  }
});
```

### parseInlineExecutor

解析内联执行器代码，创建可执行的函数。

```typescript
import { parseInlineExecutor } from '@prism/core';

const executor = parseInlineExecutor(code, nodeType);
await executor.execute(context);
```

## 依赖

- `@prism/shared-types` - 共享类型定义
- `@prism/node-definitions` - 节点定义
- `@prism/image-ops` - 图像处理操作

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm clean` | 清理构建产物 |
