# Changelog: M2-C — Server Deterministic Render Entry

**Date**: 2026-07-15
**change_id**: `m2-c-server-deterministic-render-entry`
**phase**: M2（最后一环）
**change_class**: high
**status**: done

---

## 目标

让生产端入口真正消费 `RenderRequest` + `DesignState`：
- 按 `TemplateVersion + flowKey` 精确定位 Flow（消除 `findFirst` 违规）
- 消除 `Object.keys(results).pop()` 违规（由 M2-B `executeFromDesignState` 保证输出顺序）
- Prisma schema 增加 `flowKey` 复合唯一约束
- 旧 `/api/render/template` 调用方调查与转发方案

---

## 完成的 Task

| Task | 说明 | 关键改动 |
|------|------|----------|
| m2-c-t1 | Prisma schema flowKey 列 + 唯一约束 | `Workflow.flowKey: String` + `@@unique([templateId, flowKey])` |
| m2-c-t2 | Migration 脚本 + 回填 + 冲突报告 | `20260715035029_add_workflow_flow_key` |
| m2-c-t3 | `selectFlowByKey` | `findUnique([templateId, flowKey])` + version 校验 |
| m2-c-t4 | `FlowCatalog` 实现 `TemplateVersionCatalog` | 启动时 eager load，运行时 sync Map 查询 |
| m2-c-t5 | `POST /api/render/design-state` | `validateRenderRequest` → `executeFromDesignState` → `RenderResult` |
| m2-c-t6 | 移除 `Object.keys(...).pop()` | 全部改走 `executeFromDesignState` → `RenderResult.outputs[]` |
| m2-c-t7 | 错误模型 | `FlowResolverError` → HTTP 状态码（422/404/400/504/500） |
| m2-c-t8 | 旧 `/api/render/template` 转发 | 默认 `flowKey='production'` + `@deprecated` + M4 删除计划 |
| m2-c-t9 | Smoke test | 4 个 `render.test.ts` 测试（InMemoryTemplateVersionCatalog mock） |
| m2-c-t10 | typecheck + integration | 15/15 packages + 11 server tests |
| m2-c-t11 | Changelog + OpenSpec 收尾 | 本文件 |

---

## 架构护栏符合性

| 护栏 | 状态 | 备注 |
|------|------|------|
| §1.4 TemplateVersion 必须参与精确定位 | ✅ | `selectFlowByKey` + `template.version === templateVersion` |
| §1.5 Browser/Node 共享同一 DesignState | ✅ | `/design-state` 入参即 `RenderRequest`（与 Browser 相同） |
| §1.7 Flow 必须显式选择 | ✅ | `findUnique([templateId, flowKey])` + `@deprecated` 标记旧 `findFirst` |
| §1.8 输出必须显式声明 | ✅ | `RenderResult.outputs[]`（由 M2-B `executeFlow` 保证顺序） |
| §2.1 不暴露内部类型 | ✅ | 只返回 `RenderResult`（不含 `IRO`/`BaseExecutorOutput`） |
| §2.2 JSON 可序列化 | ✅ | 所有返回类型均为 JSON-serializable |
| §3.1 不修改 Mall 模型 | ✅ | 未触及任何 Mall 业务模型 |

---

## Prisma Migration 摘要

- **迁移 ID**: `20260715035029_add_workflow_flow_key`
- **dev.db 状态**: 已应用，0 条记录，0 冲突
- **回填策略**: 从 `Workflow.name` 推断（`"Production Flow"` → `"production"`）
- **冲突报告**: `server/prisma/migrations/flowKey-backfill-conflict.md`

---

## 旧路由处理

| 调用方 | 处理 |
|--------|------|
| `tests/e2e/render-template.spec.ts` | 保持（Playwright e2e 测试，验证 404 行为） |
| 真实调用方 | 未发现（Mall 当前未接入 Prism 生产端） |

旧路由转发：`POST /api/render/template` → 构造 `RenderRequest`（`flowKey: 'production'`）→ `executeFromDesignState`。

**M4 删除计划**：Phase 4 阶段删除旧 `/api/render/template` 路由（`selectProductionFlow` + 转发代码全部移除）。

---

## 不在本次变更中

- `packages/shared-types` / `packages/workflow-core` / `packages/image-ops`（M2-A / M2-B 已交付）
- Mall 接入 / CORS / SKU / 订单 / 工厂账号
- UI 修改
- M3 / M4 / M6 / M7 范围

---

## 验证结果

| 验证项 | 结果 |
|--------|------|
| `pnpm typecheck` | 15/15 packages green |
| `pnpm test --filter @prism/server -- --run` | 11 tests green |
| `grep Object.keys(...).pop() server/src/routes/render.ts` | 0 命中 |
| `grep findFirst server/src/routes/render.ts` | 0 命中 |
| `pnpm prisma validate` | schema valid |
| `pnpm prisma migrate deploy` | 2 migrations found, 0 pending |

---

## 下一步

M2-C 完成，M2 阶段全部完成（`m2-a` + `m2-b` + `m2-c` 均 archived/done）。M3 可以开始。
