## Context

清理全项目 ESLint 错误和修复 4 个杂项代码质量问题。

## Goals / Non-Goals

**Goals:**
- 清除全项目 116 个 ESLint errors/warnings
- 添加 WorkerPool replaceWorker 超时保护
- 删除 transform.ts 调试日志
- 修复 memory-manager 竞态条件
- 修复 useCanvasStore 执行时旧 controller 清理

**Non-Goals:**
- 不改变任何运行时行为（lint 清理外）
- 不修改功能逻辑

## Decisions

### D1: ESLint 未使用变量处理

统一规则：
- enum 值：加 `_` 前缀（如 `_AUTHOR`、`AUTHOR` → `_AUTHOR`）
- 函数参数：加 `_` 前缀或删除
- 接口参数：加 `_` 前缀
- 测试文件：保持现状（已有 eslint-disable）

### D2: replaceWorker 超时

添加配置参数 `maxWaitMs: 30000`，超时则 resolve。

### D3: memory-manager 竞态

在 `registerRef` 中对新条目也增加 `estimatedSize`。

### D4: executionAbort 清理

在 `executeWorkflow` 开始时调用 `get()._executionAbort?.()`。

---

## Architecture Review（简化版 medium）

### 目标

清除 lint 错误 + 4 个杂项修复，不破坏任何运行时行为。

### 约束

- 技术约束: TypeScript strict mode
- 不变量: lint 清理不改变运行时行为

### 候选方案

#### 方案 A（选择）

Lint 清理 + 杂项修复分开执行。

**Pros**: 改动清晰，易于 review。
**Cons**: 需要两次变更。

选择方案 A。

### 决策

Lint 清理为纯机械性修改；杂项修复为独立的安全/稳定性改进。合并为一个 change 方便管理。

### 回滚方案

每个修复对应一个 git commit，可单独 revert。

---

## Review Checklist

### 简化版（medium）

- [x] 方案是否覆盖主要目标？ 是
- [x] 回退路径是否清晰？ 是（git revert）
- [x] 影响是否可控？ 是（lint 清理为纯机械，杂项修复有明确边界）

---

## 质量合规性

本设计遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- 拓扑排序：无改动
- 节点级错误隔离：无改动
- Cancellation 链路：FIX-4 确保执行前清理旧 controller

### 不变量检查

- Node Registry：无变更
- API 契约：无变更

### 测试策略

- [x] 单元测试：`pnpm test --run`
- [x] 类型检查：`pnpm typecheck`
