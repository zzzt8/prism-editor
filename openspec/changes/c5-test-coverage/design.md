## Context

测试现状：
- `shared-ui`: 0 测试文件
- `node-definitions`: 0 测试文件
- `user-app`: 0 测试文件
- 所有 6 个包的 vitest 配置无 coverage
- 无 CI 流水线

## Goals / Non-Goals

**Goals:**
- 建立 CI 流水线，覆盖 typecheck + test + build
- 为关键组件建立快照测试
- 为 store 建立基本逻辑测试
- 所有包配置 coverage

**Non-Goals:**
- 100% 覆盖率（先建立基础，80% 行覆盖门槛）
- E2E 测试
- Lighthouse / 性能测试

## Decisions

### 1: CI 工具选择

使用 GitHub Actions（`.github/workflows/ci.yml`）：
- `actions/checkout@v4`
- `pnpm/action-setup@v4`
- `actions/setup-node@v4`
- Node 20 LTS

### 2: 组件测试框架

`shared-ui` 使用 Vitest + React Testing Library：
```ts
// vitest.config.ts 加
environment: 'jsdom',
globals: true,
```

### 3: Coverage 门槛

统一 80% 行覆盖率。低于门槛 CI 失败。

### 4: Node Definitions 测试

使用 `describe.each` 遍历所有 7 个节点，验证每个节点有 id / category / ports / inputs / outputs。

## Risks / Trade-offs

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| CI 运行时间过长 | 中 | 开发体验差 | 分两步：快速失败（typecheck + test）+ 慢速（build） |
| 快照测试频繁变更导致 CI 失败 | 中 | PR 被阻塞 | 快照更新可以在本地 `pnpm test --update` 后提交 |

**回滚方案**: 删除 `.github/workflows/ci.yml` 并 revert vitest config 改动
