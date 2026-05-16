---
change_class: medium
reason: 修复 editor 层和 engine 层的 React Hook 规则违规和 lint 错误，不涉及架构变更但需要代码重构。
---

# Proposal: fix-react-hooks-and-lint

## Why

项目当前存在以下阻断性问题：

1. **React Hook 条件调用错误**（18 处）
   - `ParametersPanel.tsx`, `SettingsPanel.tsx`, `DebugTab.tsx`, `InfoPanel.tsx`
   - React Hooks 必须在每次渲染时以相同顺序调用，条件调用会导致运行时未定义行为

2. **ESLint 未使用变量错误**（223 errors）
   - dev-tool: ~50 个未使用变量
   - workflow-core: ~15 个未使用变量
   - shared-types: ~50 个未使用枚举导出

这些问题影响代码质量且可能在 CI 中阻断部署。

## What Changes

1. 修复 5 个文件中的 React Hook 条件调用问题
2. 清理所有未使用的变量和导入
3. 添加必要的 useEffect 依赖或使用 eslint-disable 注释（当依赖是 intentional stable reference 时）

## Capabilities

- 消除所有 React Hook 条件调用导致的运行时风险
- 通过删除死代码减少包体积
- 提升 ESLint 通过率（234 problems → 0）

## Impact

| Layer | Files | Change Type |
|-------|-------|-------------|
| editor | 5 files | Refactor Hook calls, remove unused vars |
| engine | 2 files | Remove unused imports/vars |
| ui-skin | 5 files | Remove unused exports |

## Out of Scope

- 不修改任何业务逻辑
- 不添加新功能
- 不修改测试文件（test 相关的问题单独处理）
- 不处理 `vendor/openspec-cli/` 的类型问题
- 不处理 vitest globals 类型配置问题
