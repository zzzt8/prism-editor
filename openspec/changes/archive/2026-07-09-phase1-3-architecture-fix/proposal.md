# Proposal: phase1-3-architecture-fix

> **change_class**: `high`
> **reason**: 触及 image-ops core/node-definitions/composer-sdk 三层核心架构，PRD §6.4 方案 C 未完整落地，必须修复

## Why

根据 PRD v1.0 §6.4 方案 C，Phase 1 核心目标是：
1. image-ops 拆分为 `core/`（纯算法）+ `browser/`（Canvas）+ `nodejs/`（sharp）三层
2. 所有节点定义加 `platforms` 字段，支持 browser/nodejs 双平台
3. 前端 Canvas 预览与后端 sharp 生产输出像素级一致

探索发现三个 P0 阻断问题：
- **P0-1**: nodejs executor 调用旧 `composite-math.ts` 而非新 `core/composite/composite.ts`
- **P0-2**: image-ops/nodejs/ 无独立单元测试
- **P0-3**: 所有 7 个节点 `platforms: ['browser']`，没有一个支持 nodejs，Phase 1 核心目标完全未落地

以及 P1 架构风险：
- **P1-1**: browser/CompositeExecutor 混用新旧 core
- **P1-2**: 存在两份 composite 实现需统一
- **P1-4**: composer-sdk 使用原生 Canvas API 而非 image-ops，与后端 sharp 不一致
- **P1-5**: ProductTemplate 编辑器功能不完整

## What Changes

### Phase 1 Core Fix（image-ops/node-definitions）

1. **统一 core 算法调用**：将 `nodejs/composite-executor.ts` 改为调用 `core/composite/composite.ts`，与 browser executor 共享同一纯算法层
2. **补充节点 platforms 配置**：7 个节点全部添加 `platforms: ['both']`（或按需 browser/nodejs）
3. **清理旧实现**：移除 `core/composite-math.ts`（向后兼容用旧版），保留 `core/composite/composite.ts` 作为唯一真相源
4. **补充 nodejs executor 单元测试**：为 `nodejs/*-executor.ts` 补充 Vitest 单元测试

### Phase 3 Composer SDK Fix

5. **composer-sdk 集成 image-ops**：将 `ComposerCanvas` 的 Canvas 合成替换为调用 `image-ops/browser` executor，确保与后端 sharp 算法一致
6. **补充 cross-platform 一致性测试**：添加 pixel-level diff 测试，验证前端 Canvas 预览与后端 sharp 输出一致

### Phase 2 Partial（ProductTemplate Editor）

7. **完善 ProductTemplate 编辑器**：补全 inputs/bindings/assets tab 实现，连接 Flow CRUD

## Capabilities

- 同一 WorkflowDefinition 可分别在 browser 和 nodejs 执行，输出像素级一致
- dev-tool 可创建 browser/nodejs 目标工作流，节点面板按目标过滤
- composer-sdk 使用 image-ops/browser 执行合成，与后端 sharp 一致

## Impact

| Layer | 影响范围 |
|-------|---------|
| `packages/image-ops/src/core/` | 统一 composite 算法调用路径 |
| `packages/image-ops/src/nodejs/` | 修复 executor 调用 + 补充测试 |
| `packages/node-definitions/` | 所有 7 个节点补充 platforms 配置 |
| `packages/composer-sdk/` | ComposerCanvas 改用 image-ops |
| `apps/dev-tool/` | ProductTemplate 编辑器补全 |

## Out of Scope

- `/api/render` Production API（Phase 2 T2.4）
- 批量生产 / 成本统计
- 多用户实时协作
- 节点市场

---

*本文档基于 PRD v1.0 §6.4 方案 C 及探索结果生成*
