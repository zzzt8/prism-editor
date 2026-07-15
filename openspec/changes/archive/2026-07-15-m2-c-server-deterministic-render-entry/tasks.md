# Tasks: M2-C — Server Deterministic Render Entry

> **依赖**：必须等 `m2-a-deterministic-flow-and-output-protocol` + `m2-b-workflow-core-explicit-flow-resolution` 完成
> **阻塞**：无（M2-C 是 M2 阶段最后一环）

---

## 1. Prisma schema 增加 flowKey 列 + 复合唯一约束

- **id**: m2-c-t1
- **layer**: database (`server/prisma/`)
- **status**: done
- **verify**: `cd server && pnpm prisma validate && pnpm prisma generate`

### 验收标准

- [ ] `server/prisma/schema.prisma` 中 `Workflow` 模型新增 `flowKey: String` 列
- [ ] `@@unique([templateId, flowKey])` 复合唯一约束存在
- [ ] `@@index([templateId, platform])` 保留
- [ ] `pnpm prisma validate` 通过
- [ ] `pnpm prisma generate` 生成新 Prisma Client

---

## 2. Prisma 迁移脚本

- **id**: m2-c-t2
- **layer**: database
- **status**: done
- **verify**: `cd server && pnpm prisma migrate dev --name add_workflow_flowKey`

### 验收标准

- [ ] `server/prisma/migrations/` 下新增 migration 文件
- [ ] 迁移脚本包含：增加 `flowKey` 列 + 复合唯一约束
- [ ] 迁移前审计脚本：读取现有 `Workflow` 表，解析 `content` JSON 中的 `flowKey`（或回退到从 `name` 推断）
- [ ] 若同一 `templateId` 下存在重复 `flowKey` → 迁移停止并写入 `server/prisma/migrations/flowKey-backfill-conflict.md`
- [ ] 冲突报告包含每条冲突记录的 `id`、`templateId`、`name`、推断的 `flowKey`

---

## 3. `selectFlowByKey` 实现

- **id**: m2-c-t3
- **layer**: server
- **status**: done
- **verify**: `cd server && pnpm typecheck && pnpm --filter @prism/server test -- --run selectFlowByKey`

### 验收标准

- [ ] `server/src/services/product-template-service.ts` 新增 `selectFlowByKey(templateId, templateVersion, flowKey): Promise<Workflow>`
- [ ] `selectFlowByKey` 使用 Prisma `findUnique` + `templateId_flowKey` 复合键
- [ ] 校验 `template.version === templateVersion`（不一致时抛 `FlowNotFoundError`）
- [ ] 不使用 `findFirst`
- [ ] `selectProductionFlow` 标记 `@deprecated` 并加注释说明
- [ ] 单测覆盖：命中 / 未命中 / templateVersion 不一致

---

## 4. `FlowCatalog` 实现

- **id**: m2-c-t4
- **layer**: server
- **status**: done
- **verify**: `cd server && pnpm typecheck && pnpm --filter @prism/server test -- --run flow-catalog`

### 验收标准

- [ ] `server/src/services/flow-catalog.ts` 存在；实现 `TemplateVersionCatalog` 接口
- [ ] `getTemplateVersion(templateId)` 返回完整 `TemplateVersion`（含 flows 数组）
- [ ] `currentVersion(templateId)` 返回最新 `version` 的 `ProductTemplate`
- [ ] 不使用 `findFirst` 选择 version
- [ ] 单测覆盖：正常路径 / templateId 不存在 / flows 为空

---

## 5. 新端点 `POST /api/render/design-state`

- **id**: m2-c-t5
- **layer**: server
- **status**: done
- **verify**: `cd server && pnpm typecheck && pnpm --filter @prism/server test -- --run design-state-render`

### 验收标准

- [ ] `server/src/routes/render.ts` 新增 `POST /api/render/design-state` 路由
- [ ] 请求体 Fastify schema 对应 `RenderRequest` 结构
- [ ] handler 内部调用 `validateRenderRequest(request.body)`（失败返回 400）
- [ ] 调用 `selectFlowByKey(ds.templateId, ds.templateVersion, ds.flowKey)`
- [ ] 调用 `WorkflowExecutorNodeJs.executeFromDesignState(ds, options)` 驱动渲染
- [ ] 返回 `renderResult`（JSON）；不返回裸二进制
- [ ] 不再使用 `Object.keys(results).pop()` 选择最终输出

---

## 6. 输出收集按 `RenderResult.outputs`

- **id**: m2-c-t6
- **layer**: server
- **status**: done
- **verify**: `grep -r "Object.keys.*pop" server/src/routes/render.ts`

### 验收标准

- [ ] `server/src/routes/render.ts` 中不再包含 `Object.keys(...).pop()` 选择最终输出的代码
- [ ] `server/src/routes/render.ts` 中不再包含 `findFirst` 选择 Flow 的代码
- [ ] 输出直接使用 `WorkflowExecutorNodeJs.executeFromDesignState` 返回的 `RenderResult`（由 M2-B 保证输出顺序稳定）
- [ ] grep 确认：不得出现 `findFirst` / `Object.keys` 作为 Flow 选择或输出选择

---

## 7. 错误处理模型

- **id**: m2-c-t7
- **layer**: server
- **status**: done
- **verify**: `cd server && pnpm --filter @prism/server test -- --run design-state-render-error`

### 验收标准

- [ ] 无效 `RenderRequest`（缺字段）→ 400 + ValidationError JSON
- [ ] `flowKey` 不存在 → 404 + `{ code: 'FLOW_NOT_FOUND', ... }`
- [ ] `requestedOutputSlots` 含未声明 slot → 422 + `{ code: 'REQUESTED_OUTPUT_UNKNOWN', ... }`
- [ ] 执行超时 → 504 + `{ code: 'RENDER_TIMEOUT', ... }`
- [ ] 执行错误 → 500 + `{ code: 'RENDER_FAILED', ... }`

---

## 8. 旧 `/api/render/template` 路由处理

- **id**: m2-c-t8
- **layer**: server
- **status**: done
- **verify**: `grep -r "api/render/template" tests/e2e/`

### 验收标准

- [ ] `tests/e2e/render-template.spec.ts` 已迁移到 `POST /api/render/design-state`（替换测试用例）
- [ ] `server/src/routes/render.ts` 中旧 `/api/render/template` 路由不再使用 `selectProductionFlow` / `findFirst` / `Object.keys`
- [ ] 旧路由改为内部转发到新路由；`flowKey` 默认 `'production'`；加 `@deprecated` 注释
- [ ] design.md §"旧接口处理" 包含：调用方证据（e2e 测试已迁移）+ 下线计划（M4 阶段删除旧路由）
- [ ] 下线条件明确：M4 阶段删除旧 `/api/render/template` 路由

---

## 9. 端到端 smoke test

- **id**: m2-c-t9
- **layer**: server
- **status**: done
- **verify**: `cd server && pnpm --filter @prism/server test -- --run smoke`

### 验收标准

- [ ] `server/src/routes/render.test.ts` 覆盖 `/api/render/design-state` 正常路径
- [ ] 用内存 catalog（`FlowCatalog` mock）通过单测
- [ ] 新端点 `POST /api/render/design-state` 返回 `RenderResult` JSON（含 `renderId` / `status` / `outputs`）
- [ ] `outputs[].slot` 非空
- [ ] `outputs[].flowKey` 与 `designState.flowKey` 一致

---

## 10. typecheck + integration

- **id**: m2-c-t10
- **layer**: server
- **status**: done
- **verify**: `pnpm typecheck && cd server && pnpm test`

### 验收标准

- [ ] `pnpm typecheck` 全局通过
- [ ] `@prism/server` 全部单测通过
- [ ] `pnpm --filter @prism/server test` 通过
- [ ] 不动 shared-types / workflow-core / image-ops（M2-A / M2-B 已交付）
- [ ] Prisma 迁移文件生成

---

## 11. changelog + OpenSpec 收尾

- **id**: m2-c-t11
- **layer**: meta
- **status**: pending
- **verify**: `cat openspec/changes/m2-c-server-deterministic-render-entry/tasks.md | grep status`

### 验收标准

- [ ] 文件 `docs/changelogs/2026-07-14-m2-c-server-deterministic-render-entry.md` 存在
- [ ] changelog 内容：阶段目标 / Prisma 迁移摘要 / 旧路由处理方案 / M4 下线计划
- [ ] 不动架构文档 / roadMap / guardrail / Cursor Rule
- [ ] 10 个具体 task 全部 `completed`

---

## 依赖关系

```
T1 (Prisma schema) ──→ T2 (migrate)
T3 (selectFlowByKey) ──┐
T4 (FlowCatalog)     ──┤──→ T5 (new endpoint) ──→ T6 (output collection) ──→ T7 (error model) ──→ T8 (old route) ──→ T9 (smoke) ──→ T10 (typecheck) ──→ T11 (changelog)
                                                                                                                              ↑
                                                         T2 (migrate) ────────────────────────────────────────────────────────────────┘
```

---

## 回退方式

- `git checkout -- server/prisma/schema.prisma`
- 删除 `server/prisma/migrations/*flowKey*`
- `git checkout -- server/src/services/product-template-service.ts server/src/routes/render.ts`
- 删除 `server/src/services/flow-catalog.ts`
- 删除 `server/src/routes/render.test.ts` 新增测试
- 恢复 `tests/e2e/render-template.spec.ts`