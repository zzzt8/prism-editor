# Phase 1: 核心架构重构（方案 C 落地）

**change_class**: high

**reason**: 触及 packages/core / packages/image-ops / apps/dev-tool 多层，跨包接口变更，需要完整设计评审。

---

## Why

Phase 0 完成后，image-ops 目前是单体结构：
- `image-ops/` 包含 browser（Canvas 2D）和 nodejs（sharp）实现混合在一起
- 现有 executor 直接调用 Canvas/sharp API，无法跨平台复用
- nodejs 执行器缺失，无法满足 Phase 2 Production API 的性能要求

需要将 image-ops 拆分为三层架构，让核心算法与平台 API 解耦。

---

## What Changes

### 核心变更

1. **`packages/image-ops/` 拆分为三层**：
   - `image-ops/core/` — 纯算法，不依赖任何平台 API
   - `image-ops/browser/` — Canvas 2D 实现（现有代码迁移）
   - `image-ops/nodejs/` — sharp 实现（新增）

2. **`NodeDefinition` 增加 `platforms` 字段**：
   - 标记节点支持的平台：`['browser']` | `['nodejs']` | `['browser', 'nodejs']`

3. **Executor 改造**：
   - 现有 7 个 executor 改为调用 `core/` + 平台实现
   - 新增 `image-ops/nodejs/` 的 sharp 版本（composite/transform/load/export）

4. **dev-tool 目标选择**：
   - 新建工作流时选择目标平台（browser/nodejs）
   - 根据平台过滤可用节点

---

## Capabilities

- **跨平台执行**：同一 WorkflowDefinition 可分别在 browser 和 nodejs 执行
- **算法复用**：core 层算法在两个平台保持一致
- **像素级一致**：browser/nodejs 输出一致（通过 shared test fixtures）

---

## Impact

| 包/应用 | 影响 |
|---------|------|
| `packages/image-ops` | 重构，三层拆分 |
| `packages/core` | NodeDefinition 增加 platforms 字段 |
| `packages/workflow-core` | 可能调整 executor 注册逻辑 |
| `apps/dev-tool` | 节点选择 UI 增加平台过滤 |

---

## Out of Scope

- 不实现完整的 nodejs executor 套件（仅 composite/transform/load/export）
- 不修改 Prisma schema
- 不修改 server 路由
- 不实现 Composer SDK（Phase 3 任务）
