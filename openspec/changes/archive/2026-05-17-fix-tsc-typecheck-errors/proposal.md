# Proposal: fix-tsc-typecheck-errors

## Metadata

- **change_class**: medium
- **reason**: 修复 TypeScript 编译错误，恢复项目 typecheck 能力
- **created**: 2026-05-17
- **status**: proposed

## Why

项目当前存在 132 个 TypeScript 编译错误，导致 `npx tsc --noEmit` 失败。这些错误主要源于：

1. **vendor/openspec-cli/** — `node_modules/` 不存在，依赖未安装（47 个 TS2307）
2. **apps/dev-tool/** — 缺少测试框架类型定义（41 个 TS2582/TS2304）
3. **packages/shared-ui/** — vitest globals 配置不完整（5 个 TS2304）

这些问题阻塞了 CI 和本地类型检查，必须修复。

## What Changes

| 包 | 问题 | 修复方案 |
|----|------|----------|
| `vendor/openspec-cli/` | node_modules 不存在 | 安装依赖或确认 vendor 管理方式 |
| `apps/dev-tool/` | 缺少 @types/jest | 安装 `@types/jest` 并更新 tsconfig |
| `packages/shared-ui/` | vitest globals 不完整 | 检查并补充 vitest 类型配置 |

## Capabilities

- [x] 修复后 `npx tsc --noEmit` 应返回 exit code 0
- [x] 所有 `.test.ts` / `.test.tsx` 文件不再报 TS2582 错误
- [x] 不影响业务代码逻辑

## Impact

- **Layer**: `layer:config` — 仅涉及包管理和类型配置
- **风险**: 低 — 仅配置变更，不触及业务逻辑
- **回滚**: 简单 — revert git 即可

## Out of Scope

- 业务代码重构
- 新功能开发
- 性能优化
- 其他包的改动
