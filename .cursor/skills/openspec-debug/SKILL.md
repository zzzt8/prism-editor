---
name: openspec-debug
description: 调试 apply 阶段遇到的问题。环境自适应诊断，支持多类错误模式。
version: "3.0"
category: debug
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-debug
depends_on:
  - openspec-apply
  - openspec-verify
permissions: []
risks: []
verify:
  - typecheck
---

> **前置共享片段：** layer 映射、验证命令见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## 核心职责

- 读取项目输出（test / typecheck / build）
- 分析相关代码
- 诊断环境问题
- 给出具体修复建议

## 执行流程

### 1. 项目输出优先

读取以下输出：
- `pnpm test` 测试结果
- `pnpm typecheck` 类型检查结果
- `pnpm build` 构建日志（如有）

**不要**上来就检查环境，先从项目输出入手。

### 2. 错误分类

| 错误关键词 | 可能原因 | 诊断方向 |
|-----------|---------|---------|
| `Cannot find module '@prisma/client'` | Prisma Client 未生成 | `pnpm --filter=@prism/server exec prisma generate` |
| `Type error: Argument of type '...' is not assignable` | TypeScript 类型不匹配 | 读取类型定义文件 |
| `expect(received).toEqual(expected)` | 像素级测试 regression | 对比 test fixture |
| `expect(received).toEqual(expected)` | 普通单元测试失败 | 读取业务逻辑文件 |
| `Cannot read properties of undefined` | 运行时 null 访问 | 读取相关代码，检查数据流 |
| `Validation error` | Prisma schema 与 DB 不同步 | Prisma 环境诊断 |
| `ENOENT: no such file or directory` | 文件路径问题 | 检查 working directory |
| `SyntaxError` | 语法错误 | 读取源文件，检查语法 |

**上下文判断示例：**

```javascript
function classifyError(error, context) {
  if (error.includes('expect(received).toEqual(expected)')) {
    if (context.testFilePath?.includes('fixture') ||
        context.testFilePath?.match(/\.(png|jpg|jpeg)$/)) {
      return 'pixel-level-test-regression';
    }
    return 'unit-test-failure';
  }
  // ...
}
```

### 3. 分析相关代码

根据错误类型选择：

**类型错误（TypeScript）：**
1. 读取 `pnpm typecheck` 输出中的具体文件和行号
2. 读取 `git diff --name-only HEAD~1` 获取实际改动的文件
3. 读取相关类型定义文件

**测试失败：**
1. 读取 `pnpm test` 输出中的失败用例
2. 读取对应的 `.test.ts` 文件
3. 读取 `tasks.md` 了解预期行为
4. 读取 `design.md` 了解技术方案

### 4. 环境诊断

> 当项目输出无法定位问题，或错误涉及 Prisma / 数据库时，执行此步骤。

**Prisma 环境检查清单（按顺序执行）：**

```
Step 4.1: Prisma Client 生成状态
├─ ls server/node_modules/.prisma/client/
│    └─ 如缺失 → pnpm --filter=@prism/server exec prisma generate

Step 4.2: 数据库文件存在性
├─ ls server/prisma/*.db
│    └─ 如缺失 → pnpm --filter=@prism/server exec prisma migrate dev

Step 4.3: Migration 同步状态
├─ pnpm --filter=@prism/server exec prisma migrate status
│    └─ 如有 pending → pnpm --filter=@prism/server exec prisma migrate deploy

Step 4.4: .env 环境变量
├─ cat server/.env
│    └─ 缺失或 DATABASE_URL 错误 → 修复 .env

Step 4.5: 基础运行时环境
├─ node --version
├─ pnpm --version
└─ pnpm install --dry-run
```

### 5. 建议修复方案

给出：
- **具体要改的代码片段**（精确到文件 + 行号）
- **验证命令**（增量，不跑全量）
- **风险提示**（是否有 regression 风险）

**格式：**

```
## 诊断结果

**根因**：Prisma Client 未重新生成，引用了旧版本的 schema 类型

**修复步骤**：

1. 重新生成 Prisma Client：
   pnpm --filter=@prism/server exec prisma generate

2. 验证修复：
   pnpm typecheck --filter=@prism/server
   pnpm test --filter=@prism/server

**风险**：无 regression 风险，纯生成步骤
```

## 跨平台兼容性

- 使用 `pnpm` 而非 `npm` 或 `yarn`
- 使用 `pnpm test` 而非直接调用 jest/vitest
- **禁止**写死 Windows 命令（如 `netstat`, `Get-Process`）
- **禁止**上来就扫端口/进程

## Guardrails

- **禁止**跳过项目输出直接环境诊断
- **禁止**写死 Windows-only 命令
- **强制**先读取 test/typecheck 输出再分析代码
- **强制**提供具体的修复建议（包含精确命令）
- **强制**在 Prisma / 数据库错误时执行环境检查
- **强制**诊断完成后报告根因 + 修复方案 + 验证命令
- **强制**错误分类使用上下文判断，避免过度简化
