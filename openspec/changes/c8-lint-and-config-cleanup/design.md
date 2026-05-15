## Context

在 `/opsx-explore` 深度审查中，发现项目存在以下配置和质量问题：

1. **根级 tsconfig.json 缺少 JSX 配置**: 该文件没有 `"jsx"` 和 `"module"` 配置项，导致 `tsc --noEmit` 在项目根目录执行时将所有 `.tsx` 文件误判为无法使用 JSX（TS17004 错误）。各子项目的 typecheck 脚本（`tsc --noEmit`）实际使用了根级 tsconfig（而非各自的 tsconfig），因此产生 2000+ 条虚假报错。

2. **`setInitError` 未定义**: `apps/dev-tool/src/components/NodePanel.tsx` 第 125、129 行调用了 `setInitError`，但该函数从未被定义（组件中没有对应的 `useState`）。

3. **ESLint 缺少 react-hooks 插件**: `eslint.config.js` 没有引入 `eslint-plugin-react-hooks`，导致 `PublishDialog.tsx` 中引用的 `react-hooks/exhaustive-deps` 规则报错。

4. **~100 个未使用变量**: 分布在 dev-tool 的 TemplateCenter、TemplateManager、VersionHistory、canvas、nodes、stores、services、header 等模块。

5. **npm pnpm-only 配置警告**: `package.json` 中的 `shamefully-hoist` 和 `auto-install-peers` 配置即将在 npm 未来版本中废弃（pnpm 专属配置不应写在 package.json 中）。

## Goals / Non-Goals

**Goals:**

- 修复根级 `tsconfig.json` 使 `npm run typecheck` 正常报告真实错误
- 消除 `NodePanel.tsx` 的编译错误和运行时崩溃风险
- 添加 react-hooks 插件并修复相关 lint 错误
- 清理所有未使用变量，使 `npm run lint` 通过
- 迁移 pnpm-only 配置到 `pnpm-workspace.yaml` 或 `package.json` 的 `pnpm` 字段

**Non-Goals:**

- 不修改任何业务逻辑
- 不重构任何代码结构
- 不修改 engine、backend、runtime layer 的代码
- 不修改 shared-ui、shared-types 等 ui-skin layer

## Decisions

### D1: 根级 tsconfig.json 的 jsx 配置

**选项 A**: 在根 tsconfig 中添加 `"jsx": "react-jsx"` 和 `"module": "ESNext"`
- Pros: 一劳永逸，`npm run typecheck`（即 `turbo run typecheck`）将正常工作
- Cons: 需要验证不会与子项目的 tsconfig 冲突（但由于 `tsconfig.json` 的 `extends` 机制，子项目会覆盖父级配置）

**选项 B**: 修改 `turbo.json` 中的 typecheck 脚本为 `tsc --noEmit -p <project>`，按子项目逐个指定 project
- Pros: 更精确控制每个子项目的类型检查
- Cons: 需要修改 turbo.json 和所有子项目的 package.json；增加维护成本

**决策**: 采用 **选项 A**。根级 tsconfig 补全配置后，各子项目的 tsconfig 通过 `extends` 继承并覆盖，经验证（单独用 `-p apps/dev-tool/tsconfig.json` 执行时）dev-tool 的 `"jsx": "react-jsx"` 会覆盖根级设置，不会产生冲突。这是改动最小、最符合 TypeScript monorepo 最佳实践的方案。

### D2: `setInitError` 的处理

**选项 A**: 删除 `setInitError` 调用，改为 `console.warn`
- Pros: 最简单，消除编译错误和运行时错误风险
- Cons: 丢失了向用户展示初始化错误的能力

**选项 B**: 实现 `setInitError` 状态
- Pros: 保留了向用户展示错误的能力
- Cons: 需要在组件中添加对应的 `useState`，改动较大；且目前 UI 中并无对应的错误展示逻辑

**决策**: 采用 **选项 A**。当前组件中无任何使用 `initError` 状态的 UI 逻辑，`setInitError` 的调用目的是"向用户展示初始化错误"，但没有对应的展示代码。将调用改为 `console.warn` 即可保留错误记录，且符合最小改动原则。

### D3: 未使用变量的清理策略

**选项 A**: 批量重命名为 `_` 前缀（对于有意忽略的参数）或直接删除（对于完全无用的导入）
- Pros: 符合 ESLint 配置（`argsIgnorePattern: '^_'`）
- Cons: 需要逐文件处理

**选项 B**: 放宽 ESLint 规则，允许某些类型的未使用变量
- Pros: 改动最小
- Cons: 降低代码质量标准，回避问题而非解决问题

**决策**: 采用 **选项 A**。对于函数参数中的未使用变量，重命名为 `_` 前缀（符合 ESLint 配置）；对于完全无用的导入，直接删除。

### D4: npm pnpm-only 配置迁移

**选项 A**: 将配置迁移到 `package.json` 的 `"pnpm"` 字段
- Pros: 符合 pnpm 官方推荐方式

**选项 B**: 删除配置（`shamefully-hoist` 设为 false，`auto-install-peers` 设为 false）
- Pros: 消除警告，回归 pnpm 默认行为
- Cons: 可能影响现有依赖解析行为

**决策**: 采用 **选项 B**。`shamefully-hoist: true` 和 `auto-install-peers: true` 都是非默认行为，可能掩盖依赖问题。删除这些配置，回归 pnpm 默认行为，消除警告。

## Risks / Trade-offs

- **风险**: 根级 tsconfig 变更后，某些之前被 JSX 错误掩盖的真实类型错误可能暴露出来
- **缓解**: 先修复已知的 2 个真实错误（`NodePanel.tsx`），再验证 typecheck 输出
- **权衡**: 清理未使用变量会产生 ~100 个 diff，但这是提升代码质量的必要代价

---

## Architecture Review

> Low-risk change，跳过 formal review。

### 目标

修复配置和代码质量问题，使 `npm run typecheck` 和 `npm run lint` 恢复正常。

### 约束

- 技术约束: 只能在 editor 和 meta layer 操作
- 不变量: 不修改任何业务逻辑
- 可验证性: typecheck 和 lint 零错误通过

### 决策

本 change 由 5 个相对独立的任务组成，无跨任务依赖，按任意顺序执行均可。

---

## Review Checklist

> Low-risk change，跳过 formal review。

---

## 质量合规性

本设计遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- 拓扑排序: 不涉及
- 节点级错误隔离: 不涉及
- Cancellation 链路: 不涉及

### 不变量检查

- Node Registry: 不涉及
- API 契约: 不涉及

### 测试策略

- 单元测试: 不适用（纯配置和 lint 修复）
- 手工验收: 修复后运行 `npm run typecheck` 和 `npm run lint` 验证零错误
