---
name: fix-critical-logic-security-bugs
change_class: high
change_profile: high
reason: "修复 7 个代码逻辑/安全 bug，涉及 4 个 workspace packages，3 个 P0 问题会直接导致功能失效或安全漏洞"
---

## Task Anchor Echo

- **原始任务**: 对整个项目进行彻底的 Bug 扫描，发现隐藏的问题
- **change 名称**: `fix-critical-logic-security-bugs`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] 不改变现有 API 契约
  - [ ] 不修改 Prisma schema
  - [ ] 不改变 node definition schema
  - [ ] 不修改 workflow JSON 格式

## Why

项目经过全面代码扫描，发现 7 个严重的逻辑错误和安全漏洞：

| # | Bug | 严重度 | 影响 |
|---|-----|--------|------|
| 1 | `exportExecutor` 硬编码参数，忽略用户配置 | P0 | Export 节点完全失效 |
| 2 | `ParamsSection` hooks 在条件 return 后调用 | P0 | React 行为异常 |
| 3 | AccessToken 不检查黑名单 | P0 | 登出后 token 仍有效 |
| 4 | `transform.translateX/Y` 被静默忽略 | P1 | Transform 节点平移功能无效 |
| 5 | params 合并顺序与注释矛盾 | P1 | developer-locked 参数可被用户覆盖 |
| 6 | WorkerPool 重复 push worker | P1 | 池状态破坏 |
| 7 | Content-Disposition 特殊字符过滤不完整 | P2 | 文件名注入风险 |

## What Changes

### P0 修复

**BUG-1**: `export-image.ts` — `exportExecutor` 硬编码参数
- 移除所有硬编码值，从 `_params` 读取 `format` / `quality` / `width` / `height`
- 添加参数校验，超出范围时使用默认值

**BUG-2**: `ParamsSection/index.tsx` — hooks 调用顺序违规
- 将 `useCallback` 移到 `return null` 之前，确保每次渲染时 hook 都被调用

**BUG-3**: `auth.ts` — AccessToken 黑名单缺失
- 在 `authenticate` middleware 中添加 `isTokenBlacklisted` 检查

### P1 修复

**BUG-4**: `transform.ts` — translateX/Y 未传递
- 将 `translateX` / `translateY` 添加到 `transformOptions` 对象
- 在 `transformImage` 函数中实现平移逻辑

**BUG-5**: `published-executor.ts` — params 合并顺序错误
- 调整 spread 顺序：`params → _internalParams → exposedParams`
- 使 `_internalParams` 覆盖 `params`，符合 developer-locked 语义

**BUG-6**: `workerPool.ts` — 重复 push
- 在 catch 块 push 前添加守卫：`if (!this.workers.includes(pooledWorker))`

**BUG-7**: `workerPool.ts` — selectWorker 索引递增两次
- 删除 `this.currentWorkerIndex++` 在循环体中的重复调用

### P2 修复

**BUG-8**: `workflow.ts` — Content-Disposition 不完整
- 移除所有 RFC 5987 特殊字符

## Capabilities

### Modified Capabilities

- `Export Node`: 支持用户配置的格式和质量，不再忽略参数
- `Transform Node`: 支持 translateX/Y 平移参数
- `Auth Middleware`: 正确黑名单检查登出用户的 token
- `Published Workflow`: developer-locked 参数不会被 user override 覆盖
- `Worker Pool`: 不再出现重复条目和轮询错误

## Impact

- **packages/image-ops**: `export-image.ts`, `transform.ts`, `scheduler/workerPool.ts`
- **packages/workflow-core**: `published-executor.ts`
- **apps/user-app**: `ParamsSection/index.tsx`
- **server**: `auth.ts`, `workflow.ts`

无 API 契约变更，无 Prisma schema 变更，无 workflow JSON 格式变更。

## Out of Scope

- 不修改 Prisma schema
- 不修改 node definition schema
- 不修改 workflow JSON 格式
- 不修改任何 package.json 或依赖
- 不修改 OpenSpec 以外的任何文档

---

## 质量与测试规范要求

本需求严格遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 本需求的执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | — |
| 节点级错误隔离 | 是 | exportExecutor 有 try/catch |
| Cancellation 完整性 | 否 | — |
| Canvas 状态一致性 | 是 | ParamsSection hooks 修复 |
| Node Registry 不变量 | 否 | — |
| API 契约稳定性 | 是 | Auth middleware 修改（Security fix） |
| Node Package 安全 | 否 | — |
| 交互完整性 | 是 | Export/Transform 参数修复 |

### 验收要求

- [x] 本需求已覆盖所有涉及的质量检查维度
- [x] 新增 executor 路径已包含 try/catch 包裹
- [x] 涉及取消/状态机的逻辑已规划测试方案
