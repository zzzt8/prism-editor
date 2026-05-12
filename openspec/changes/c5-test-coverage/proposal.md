---
name: c5-test-coverage
change_class: medium
change_profile: medium
reason: "为无测试的包建立测试基础：shared-ui 组件、node-definitions、user-app stores、CI 流水线"
---

## Task Anchor Echo

- **原始任务**: 修复 prism-editor 全部硬伤，分多步走
- **change 名称**: `c5-test-coverage`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] 测试覆盖在所有代码改动稳了之后做（C2、C3 完成后）
  - [ ] 不做 100% 覆盖，先建立基础安全网

## Why

`shared-ui`、`node-definitions`、`user-app` 目前没有测试；所有 6 个包的 vitest 配置都缺少 coverage 配置；没有 CI 流水线。

## What Changes

1. 建 `.github/workflows/ci.yml` — lint + typecheck + test + build
2. 配置 ESLint / Prettier；修复全项目 lint 错误
3. `shared-ui` 组件加快照测试（Button、Modal、Spinner）
3. `node-definitions` 加节点定义验证测试
4. `user-app` store 加加载/错误/取消路径测试
5. 6 个缺失 coverage 配置的包统一加上（80% 门槛）

## Capabilities

### New Capabilities

- **CI Pipeline**: PR 必须通过 typecheck + test + build 才能合并
- **组件快照测试**: shared-ui 组件覆盖回归风险
- **Store 单元测试**: user-app store 逻辑覆盖

## Impact

- `.github/workflows/ci.yml`
- `packages/shared-ui/src/**/*.test.tsx`
- `packages/node-definitions/src/**/*.test.ts`
- `apps/user-app/src/**/*.test.ts`
- 所有包的 `vitest.config.ts`

## Out of Scope

- 100% 测试覆盖
- E2E 测试
- 性能/基准测试（benchmark 已有）
