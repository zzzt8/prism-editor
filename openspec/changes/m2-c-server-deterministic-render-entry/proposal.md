# Proposal: M2-C — Server Deterministic Render Entry

> **change_class**: high
> **reason**: 在 `server` 引入 `POST /api/render/design-state` 端点（入参即 `RenderRequest`，出参即 `RenderResult`）；按 `TemplateVersion + flowKey` 精确定位 Flow；消除 `prisma.workflow.findFirst` + `Object.keys(results).pop()` 违规；Prisma schema 增加 `flowKey` 唯一约束；旧 `/api/render/template` 调用方调查结果写入。涉及 server 公开 API 新增 + Prisma schema 变更；按 openspec-propose 规则为 `high`。
> **depends_on**: `m2-a-deterministic-flow-and-output-protocol`（M2-C 消费 Flow / FlowKey 契约）、`m2-b-workflow-core-explicit-flow-resolution`（M2-C 消费 executeFromDesignState / executeFlow 引擎入口）
> **blocks**: 无（M2-C 是 M2 阶段最后一环）

---

## Why

M2-A 定义协议（M2-C 的设计契约层），M2-B 在 workflow-core 实现确定性执行（M2-C 的引擎依赖层）。M2-C 必须：

1. **让生产入口真正消费 DesignState / RenderRequest**：当前 `server/src/routes/render.ts` 的 `/api/render/template` 路由还走老的 `RenderTemplateBody`（`templateId` + `userParams`），没有消费 `DesignState` / `RenderRequest`。
2. **消除 `prisma.workflow.findFirst` 违规**：`server/src/services/product-template-service.ts:177` 使用 `findFirst({ where: { templateId, platform: 'nodejs' } })` 选生产 Flow（违反护栏 §1.7）。
3. **消除 `Object.keys(results).pop()` 违规**：`server/src/routes/render.ts:84` 使用 `Object.keys(results).pop()` 决定最终输出节点（违反护栏 §1.8）。
4. **Prisma 最小正确迁移**：当前 Workflow 表缺少 `flowKey` 列，导致无法用 `(templateId, flowKey)` 精确定位。需要最小迁移方案。

---

## What Changes

1. **Prisma schema 迁移**
   - Workflow 表新增 `flowKey: String @unique([templateId, flowKey])`（复合唯一约束）
   - 迁移脚本：读取现有 Workflow.content JSON，解析其中的 `name` 或 `flowKey` 字段回填 `flowKey` 列
   - 若存在同一 templateId 下重复 flowKey → 迁移停止并输出冲突报告
   - 冲突报告写入 `server/prisma/migrations/flowKey-backfill-conflict.md`
2. **`server/src/services/product-template-service.ts`**
   - 新增 `selectFlowByKey(templateId, templateVersion, flowKey): Promise<Workflow>`
   - `selectFlowByKey` 使用 Prisma `findUnique`（复合唯一约束 `(templateId, flowKey)`）精确定位
   - 标记 `selectProductionFlow` 为 `@deprecated`（使用平台 + findFirst 的旧函数）；记录下线任务到 design.md §"旧接口处理"
3. **`server/src/routes/render.ts`**
   - 新增 `POST /api/render/design-state`：入参即 `RenderRequest`，出参即 `RenderResult`（JSON）
   - 调用 `WorkflowExecutorNodeJs.executeFromDesignState(designState, options)` 驱动渲染
   - 输出按 `RenderResult.outputs` 声明顺序（不再使用 `Object.keys(results).pop()`）
   - 保留 `/api/render/template` 旧路由（调查结论：仅被 tests/e2e/render-template.spec.ts 使用，无真实调用方；旧路由改为调用新路由，flowKey 默认 `'production'`）
   - 旧路由加 `@deprecated` 注释；写入 design.md 下线计划（M4 阶段删除）
4. **`server/src/services/flow-catalog.ts`**（新文件）
   - 实现 `TemplateVersionCatalog` 接口（供 M2-B `resolveTemplateVersion` 使用）
   - 从 Prisma 读取 `ProductTemplate` + `Workflow` 构建 `TemplateVersion` 对象
   - `currentVersion(templateId)` 返回最新 `version` 字段的 `TemplateVersion`
5. **`server/src/routes/render.test.ts`**（新增测试）
   - 覆盖 `/api/render/design-state` 正常路径
   - 覆盖无效 RenderRequest 拒绝
   - 覆盖 flowKey 不存在返回 `404`
   - 覆盖 `requestedOutputSlots` 含未声明 slot 返回 `422`
6. **`server/prisma/migrations/`**（新迁移）
   - `add_workflow_flowkey_column`：增加 `flowKey` 列 + 复合唯一约束
   - 回填脚本；冲突报告机制
7. **`docs/changelogs/2026-07-14-m2-c-server-deterministic-render-entry.md`**（新文件）

---

## Capabilities

### New Capabilities

- `server-design-state-render`: 新生产入口消费 `RenderRequest` + `DesignState`
- `prisma-flowkey-constraint`: Prisma schema 增加 `flowKey` 复合唯一约束

### Modified Capabilities

无（server 已有路由扩展，不改变既有非 RenderRequest 路由）

---

## Impact

| 范围 | 影响 |
|------|------|
| 新增文件 | `server/src/services/flow-catalog.ts`、`server/src/routes/render.test.ts`、`server/prisma/migrations/*flowKey*` |
| 修改文件 | `server/src/routes/render.ts`、`server/src/services/product-template-service.ts`、`server/prisma/schema.prisma`、`server/src/routes/render.test.ts`（新增测试） |
| 触及层 | server / database |
| 数据库 | Prisma schema 变更（Workflow 表新增 flowKey 列 + 复合唯一约束） |
| 公开 API | **新增** `POST /api/render/design-state`（RenderRequest 入，RenderResult 出） |
| Mall 接入 | **无**（新端点仍由 Mall 后端调用） |
| UI | **无** |

---

## Decisions（high class 必须 Section，引用 `design.md`）

详见 `design.md`：
- 新端点 `POST /api/render/design-state`；请求体为 `RenderRequest`
- `selectFlowByKey` 使用 Prisma `findUnique` + 复合唯一约束
- Prisma 迁移：增加 `flowKey` 列；冲突报告机制
- 旧 `/api/render/template` 处理：仅被 tests/e2e/render-template.spec.ts 调用；旧路由转发到新路由；M4 阶段删除
- `WorkflowExecutorNodeJs.executeFromDesignState` 调用链

---

## Out of Scope

- 不修改 `packages/shared-types` / `packages/workflow-core` / `packages/image-ops`
- 不恢复 user-app / 旧登录系统
- 不实现 Mall 接入 / CORS
- 不实现 SKU / 订单 / 工厂账号
- 不实现 UI 修改
- 不实现 M3 / M4 / M6 / M7 范围
- 不修改 M0 / M1 已 archived 产物