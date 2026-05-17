# Tasks: fix-tsc-typecheck-errors

## Phase 1: 调查

- [ ] T1: 确认 vendor/openspec-cli 的依赖管理策略（独立安装 vs workspace）
- [ ] T2: 检查 vitest 版本兼容性（dev-tool 用 vitest 1.x，shared-ui 可能不同版本）

## Phase 2: 修复

### vendor/openspec-cli

- [x] T3: 如果 vendor 需独立安装，执行 `cd vendor/openspec-cli && pnpm install`
- [x] T4: 如果 vendor 依赖 workspace，确认 pnpm workspace 配置

### apps/dev-tool

- [ ] T5: 在 apps/dev-tool 安装 `@types/jest` 作为 devDependency
- [ ] T6: 验证 `.test.ts` 文件不再报 TS2582 错误

### packages/shared-ui

- [ ] T7: 添加 `@vitest/expect` 到 packages/shared-ui/devDependencies
- [ ] T8: 验证 `afterEach` 等全局类型可用

## Phase 3: 验证

- [ ] T9: 运行 `npx tsc --noEmit`，确认 exit code 0
- [ ] T10: 运行 `pnpm test`，确认测试仍然通过

## Rollback

- [ ] T11: 如有问题，revert git 变更即可回滚
