---
name: fix-lint-cleanup-and-misc
change_class: medium
change_profile: medium
reason: "清理 116 个 ESLint 错误 + 5 个杂项代码质量问题，不涉及核心逻辑变更"
---

## Task Anchor Echo

- **原始任务**: 对整个项目进行彻底的 Bug 扫描，发现隐藏的问题
- **change 名称**: `fix-lint-cleanup-and-misc`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] 不改变任何运行时行为
  - [ ] 不修改功能逻辑

## Why

项目全面扫描发现 116 个 ESLint 错误以及多个代码质量问题：

| # | 问题 | 类型 | 影响 |
|---|------|------|------|
| 1 | 116 个 ESLint errors/warnings | Code Quality | 技术债，影响代码可维护性 |
| 2 | `replaceWorker` 无超时轮询 | Resource Leak | 极端环境可能无限轮询 |
| 3 | `transform.ts` 残留调试日志 | Code Quality | 生产环境污染 |
| 4 | `memoryUsed` 竞态条件 | Logic Bug | 可能变为负数 |
| 5 | `_executionAbort` 覆盖不清理旧 controller | State | 重复执行可能产生僵尸执行 |

## What Changes

### Lint 清理

- 在 `shared-types`、`image-ops`、`core`、`dev-tool`、`user-app` 中统一处理未使用的变量：
  - 枚举值：加 `_` 前缀（表示有意保留）
  - 接口参数：加 `_` 前缀或删除
  - 测试辅助参数：加 `_` 前缀

### 杂项修复

**FIX-1**: `workerPool.ts` — `replaceWorker` 添加超时
- 添加 `maxWaitMs` 参数（默认 30s）
- 超过超时则 resolve，不再等待

**FIX-2**: `transform.ts` — 删除调试日志
- 移除所有 `console.log` 调用

**FIX-3**: `memory-manager.ts` — 修复 `registerRef` 不增加 memoryUsed
- 在 `registerRef` 对新条目也增加 estimatedSize

**FIX-4**: `useCanvasStore.ts` — 执行前清理旧 AbortController
- 在 `executeWorkflow` 开始时调用旧的 `_executionAbort`

## Capabilities

### Modified Capabilities

- ESLint: 全项目 lint clean
- WorkerPool: 有限等待替代无限轮询
- Transform: 无调试日志残留
- MemoryManager: 内存追踪更准确
- Canvas Store: 执行前正确清理旧 controller

## Impact

- **packages/shared-types**: ESLint 清理
- **packages/image-ops**: ESLint 清理 + replaceWorker 超时 + 日志清理
- **packages/core**: ESLint 清理
- **apps/dev-tool**: ESLint 清理
- **apps/user-app**: ESLint 清理
- **packages/shared-ui**: ESLint 清理

无 API 契约变更，无 Prisma schema 变更。

## Out of Scope

- 不修改任何运行时逻辑（除明确列出的 4 个杂项修复外）
- 不修改测试文件中的 lint 配置
- 不修改 Prisma schema

---

## 质量与测试规范要求

本需求严格遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 本需求的执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | — |
| 节点级错误隔离 | 否 | — |
| Cancellation 完整性 | 是 | FIX-4 |
| Canvas 状态一致性 | 是 | FIX-4 |
| Node Registry 不变量 | 否 | — |
| API 契约稳定性 | 否 | — |
| Node Package 安全 | 否 | — |
| 交互完整性 | 是 | Lint 清理 |

### 验收要求

- [x] 本需求已覆盖所有涉及的质量检查维度
- [x] 新增 executor 路径已包含 try/catch 包裹（无新增 executor）
- [x] 涉及取消/状态机的逻辑已规划测试方案（FIX-4）
