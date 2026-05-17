# Design: fix-tsc-typecheck-errors

## Goals

1. 消除 132 个 TypeScript 编译错误
2. 恢复 `npx tsc --noEmit` 正常执行
3. 不破坏现有测试运行能力

## Non-Goals

- 不修复 vendor 目录的内部代码逻辑错误（仅处理依赖/类型缺失）
- 不改变业务代码行为
- 不调整项目架构

## Decisions

### D1: vendor/openspec-cli 依赖管理

**问题**: `vendor/openspec-cli/node_modules/` 不存在

**选项**:

| 方案 | 描述 | 评估 |
|------|------|------|
| A | 在 vendor 目录内执行 `pnpm install` | 需要确认 vendor 是否应该独立安装 |
| B | 依赖已通过其他方式安装（symlink/workspace） | 需要检查 workspace 配置 |
| C | vendor 是 git subtree，postinstall 脚本未执行 | 检查 scripts/postinstall.js |

**决定**: 先调查 vendor 的依赖管理策略，再决定修复方式。

### D2: apps/dev-tool 测试类型

**问题**: `@types/jest` 缺失，但代码使用 vitest

**选项**:

| 方案 | 描述 | 评估 |
|------|------|------|
| A | 安装 `@types/jest` | 可能与 vitest 冲突 |
| B | 添加 `vitest/globals` 到 tsconfig types | 已有，但可能版本不匹配 |
| C | 检查 vitest 版本和 globals 配置 | 需要确认 vitest 1.x 的类型要求 |

**决定**: vitest 1.x 使用 `@vitest/expect` 提供全局类型，检查 dev-tool 是否需要升级依赖。

### D3: packages/shared-ui vitest globals

**问题**: tsconfig 有 `types: ["vitest/globals"]` 但仍报错

**选项**:

| 方案 | 描述 | 评估 |
|------|------|------|
| A | 确认 vitest 版本 | 可能需要显式 import vitest |
| B | 添加 `@vitest/expect` 依赖 | 提供 expect 全局类型 |
| C | 移除 globals，使用显式 import | 侵入性较大 |

**决定**: 添加 `@vitest/expect` 作为 devDependency。

## Architecture Review

### 当前状态

```
prism-editor/
├── vendor/openspec-cli/    ← node_modules 不存在
├── apps/dev-tool/          ← @types/jest 缺失
├── packages/shared-ui/     ← vitest globals 不完整
```

### 目标状态

```
prism-editor/
├── vendor/openspec-cli/    ← 依赖已安装
├── apps/dev-tool/          ← @types/jest 已安装
├── packages/shared-ui/     ← vitest globals 正常
```

## Verification

修复完成后验证：

```bash
npx tsc --noEmit  # 应返回 exit code 0
```
