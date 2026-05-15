## Task Anchor Echo

- **原始任务**: 深度审查整个项目找到所有的报错来源和存在的问题
- **change 名称**: `c8-lint-and-config-cleanup`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - （无）

## Why

项目当前的类型检查和 lint 工作流处于半瘫痪状态：根级 `tsconfig.json` 缺少 JSX 配置导致 2000+ 条虚假 JSX 报错掩盖了真实问题，`NodePanel.tsx` 存在编译期 `ReferenceError`，ESLint 配置缺失 react-hooks 插件，以及 ~100 个未使用变量错误分布在整个 `editor` layer。这些问题阻塞了 `npm run typecheck` 和 `npm run lint` 的正常使用，影响开发效率和 CI 可靠性。

## What Changes

- 修复根级 `tsconfig.json`，补全 `"jsx"` 和 `"module"` 配置，使 `npm run typecheck` 正确工作
- 修复 `apps/dev-tool/src/components/NodePanel.tsx` 中 `setInitError` 未定义问题
- 在 `eslint.config.js` 中添加 `react-hooks` 插件并启用 `react-hooks/exhaustive-deps` 规则
- 批量清理 ~100 个未使用变量（重命名为 `_` 前缀或删除）
- 迁移 npm pnpm-only 配置（`shamefully-hoist`、`auto-install-peers`）到 pnpm 专属配置文件

## Capabilities

### New Capabilities

（本 change 不引入新能力，仅修复现有问题）

### Modified Capabilities

- **CI/CD typecheck 流程**: 根 tsconfig 修复后，`turbo run typecheck` 将只报告真实类型错误
- **代码质量检查**: 清理未使用变量后，lint 通过率提升，真实代码问题更易发现

## Impact

- **tsconfig.json**（meta layer）: 根配置变更，影响所有子项目的 typecheck 行为
- **NodePanel.tsx**（editor layer）: 修复 `setInitError` 未定义问题，移除该函数调用或改为 `console.warn`
- **eslint.config.js**（meta layer）: 添加 react-hooks 插件和规则
- **~20 个文件**（editor layer）: 未使用变量清理，涉及 TemplateCenter、TemplateManager、VersionHistory、canvas、nodes、editor/stores、services、header 等模块
- **package.json**（meta layer）: pnpm-only 配置迁移

## Out of Scope

- 不修改任何业务逻辑或 UI 交互
- 不修改任何 engine、backend、runtime layer 的功能代码
- 不修改 `packages/` 下的任何文件（均无报错）
- 不新增功能或改变 API

---

## 质量与测试规范要求

本需求严格遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 本需求的执行完整性检查

|| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | — |
| 节点级错误隔离 | 否 | — |
| Cancellation 完整性 | 否 | — |
| Canvas 状态一致性 | 否 | — |
| Node Registry 不变量 | 否 | — |
| API 契约稳定性 | 否 | — |
| Node Package 安全 | 否 | — |
| 交互完整性 | 是 | 手工验收 |

### 验收要求

- [x] 本需求已覆盖所有涉及的质量检查维度
- [x] 新增 executor 路径已包含 try/catch 包裹（不适用）
- [x] 涉及取消/状态机的逻辑已规划测试方案（不适用）
