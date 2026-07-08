# Proposal: Phase 2 — ProductTemplate 多流化

**change_class**: high

**reason**: 跨 backend + editor + engine + ui-skin 四层。涉及 Prisma schema 微调、新增 5+3 个 server 路由、dev-tool 端 storage/repository 整层重写、删除 auth/published 历史债务、共享类型收敛。触发单点修改影响多个 layer 的契约，必须完整设计评审。

---

## Why

### 背景

Phase 0 完成了瘦身体系（删 JWT/User/NodePackage/SKU/user-app）+ API Key 认证中间件 + Prisma 3 表精简；Phase 1 完成了 image-ops 三层拆分（core/browser/nodejs）+ NodeDefinition.platforms 字段 + dev-tool 目标平台选择 UI。

当前代码状态在 engine 层（`packages/image-ops/`、`packages/workflow-core/`）已经满足方案 C 的目标结构，但 server-side CRUD API、dev-tool storage/auth 适配、E2E 前置 这 4 个面**仍停在 Phase 0 之前**，存在 4 个 🔴 高严重度断点：

| 断点 | 位置 | 后果 |
|---|---|---|
| R1 | `apps/dev-tool/src/storage/ApiStorageAdapter.ts` 调 `/api/workflows/...` | 调不通任何后端 |
| R2 | `apps/dev-tool/src/modules/repositories/publishRepository.ts` 调 `/api/published/...` | 发布流程断链（route 已删） |
| R3 | `apps/dev-tool/src/store/authStore.ts` + Login/Register Page 调 `/api/auth/...` | 整套 JWT 残余未清 |
| R4 | `server/src/routes/` 没有 `templates.ts` | PRD §11.3 承诺的 5 个 CRUD 端点全缺 |

PRD §8 已规划 Phase 2 = ProductTemplate 多流化，让一个 ProductTemplate 可关联 N 条 Preview Flow + M 条 Production Flow；PRD §6.2.2 已定义精简后的 Prisma schema（3 表）；PRD §6.5 已定义 ProductTemplate 数据模型；PRD §13 决策记录已明确 mall 信任模式（API Key + CORS）。

### 问题陈述

> 当前 dev-tool 不能创建/编辑 ProductTemplate，server 不提供 ProductTemplate CRUD API，render API 形态不对，auth/published 历史债务未清——Phase 2「ProductTemplate 多流化」没有可执行的数据链路底座。

### 动机

- Phase 1 已把 engine 层切干净（同一 WorkflowDefinition 可在 browser/nodejs 执行），没有数据层支撑，多 Flow 化落不下来
- PRD §8 明确 Phase 2 完成标准：「同一 ProductTemplate 可关联至少 1 Preview + 1 Production Flow；Production API 接受 ProductTemplate + 用户参数，返回生产文件」
- Phase 3（Composer SDK）与 Phase 4（mall 集成）都依赖 Phase 2 的数据链

---

## What Changes

### 核心变更

1. **新增** `server/src/routes/templates.ts` —— ProductTemplate CRUD + Flow 子资源（5+3 个端点）
2. **新增** `server/src/schemas/templates.ts` —— Zod 输入校验
3. **新增** `server/src/services/product-template-service.ts` —— 业务层（template ↔ flow 关系 + 校验）
4. **重写** `server/src/routes/render.ts` —— 接受 `{ templateId, userParams, inputs }` → 按 platform 选 Flow → server-side executor → sharp 渲染
5. **重写** `apps/dev-tool/src/storage/ApiStorageAdapter.ts` —— 适配 templates/render API；`X-PRISM-SECRET` 注水替代 JWT
6. **重写** `apps/dev-tool/src/modules/repositories/` —— 引入 `ProductTemplateRepository`，**删除** `PublishRepository`
7. **删除** dev-tool 端 auth 残余 —— `LoginPage` / `RegisterPage` / `authStore` / `AuthGuard`（简化保留）
8. **删除** `packages/shared-types/src/published.ts` 与 `packages/workflow-core/src/published-executor.ts`
9. **新增** `apps/dev-tool` ProductTemplate 编辑器 —— "Flows" 标签页：列表 + 选择 + 简单编辑（bindings 用 JSON 表单，不做可视化）
10. **微调** Prisma schema —— `Workflow` 新增复合索引 `@@index([templateId, platform])`
11. **重写** `tests/e2e/` —— 4 个 spec：template-list / template-create / flow-manage / render-template

### 新增内容

- `server/src/routes/templates.ts`（CRUD 5 端点 + 子资源 3 端点）
- `server/src/schemas/templates.ts`（Zod schemas）
- `server/src/services/product-template-service.ts`
- `apps/dev-tool/src/modules/repositories/productTemplateRepository.ts`
- `apps/dev-tool/src/modules/repositories/flowRepository.ts`
- `apps/dev-tool/src/components/ProductTemplateEditor/`（Flows 标签页 + Flow 编辑 Modal）
- `tests/e2e/template-list.spec.ts`
- `tests/e2e/template-create.spec.ts`
- `tests/e2e/flow-manage.spec.ts`
- `tests/e2e/render-template.spec.ts`

### 修改内容

- `server/prisma/schema.prisma` —— `Workflow` 新增复合索引
- `server/src/routes/render.ts` —— 改写接口形态
- `server/src/app.ts` —— 注册新 routes
- `server/src/index.ts` —— CORS 公开端点更新（如需要）
- `apps/dev-tool/src/storage/ApiStorageAdapter.ts` —— 重写
- `apps/dev-tool/src/storage/index.ts` —— 删除 token sync
- `apps/dev-tool/src/App.tsx` —— 移除 `/login` / `/register` 路由
- `apps/dev-tool/src/components/NewWorkflowModal.tsx` —— 与 ProductTemplate 视角对齐
- `packages/shared-types/src/template.ts` —— 收敛为 PRD §6.5 模型
- `packages/shared-types/src/index.ts` —— 删除 `published` 导出

### 删除内容

- `apps/dev-tool/src/pages/LoginPage.tsx`
- `apps/dev-tool/src/pages/RegisterPage.tsx`
- `apps/dev-tool/src/pages/AuthPage.css`
- `apps/dev-tool/src/store/authStore.ts`
- `apps/dev-tool/src/modules/repositories/publishRepository.ts`
- `apps/dev-tool/src/components/AuthGuard.tsx`（保留文件，去除登录重定向逻辑）
- `packages/shared-types/src/published.ts`
- `packages/workflow-core/src/published-executor.ts`
- `packages/workflow-core/src/published-executor.e2e.test.ts`
- `tests/e2e/login.spec.ts`
- `tests/e2e/create-workflow.spec.ts`（被 `template-create.spec.ts` 替代）
- `tests/e2e/open-workflow.spec.ts`（被 `template-open.spec.ts` 替代 / 或合并入 `template-list.spec.ts`）

---

## Capabilities

- **ProductTemplate CRUD**：mall admin-web / dev-tool 可创建/读取/更新/删除 ProductTemplate（含完整 inputs/designParams/assets/preview/production 结构）
- **多 Flow 关联**：同一 ProductTemplate 可关联 N 条 Workflow 记录，每条带 `platform: 'browser' | 'nodejs'` 标记
- **Preview/Production 分离**：同一 ProductTemplate 可同时关联 Preview Flow（browser Canvas 执行）与 Production Flow（nodejs sharp 执行）
- **Production Render API**：`POST /api/render/template` 接受 `{ templateId, userParams, inputs }` → 自动按 platform 选择对应 Flow → server-side 执行 → 返回 PNG/JPEG 二进制
- **API Key 信任模式**：dev-tool → server / mall backend → server 全部用 `X-PRISM-SECRET` header 鉴权
- **dev-tool 端到端**：dev-tool 启动后能列出/创建/编辑/删除 ProductTemplate；UI 不再有登录页

---

## Impact

| 包/应用 | 影响 |
|---------|------|
| `server/prisma` | `Workflow` 加复合索引 `@@index([templateId, platform])`；migration 验证 |
| `server/src/routes` | 新增 `templates.ts`；`render.ts` 重写 |
| `server/src/schemas` | 新增 `templates.ts`（Zod） |
| `server/src/services` | 新增 `product-template-service.ts` |
| `server/src/app.ts` | 注册新 routes |
| `apps/dev-tool/src/storage` | `ApiStorageAdapter` 重写；删除 JWT 字段 |
| `apps/dev-tool/src/modules/repositories` | 新增 ProductTemplate/Flow Repository；删除 PublishRepository |
| `apps/dev-tool/src/store` | 删除 `authStore.ts` |
| `apps/dev-tool/src/pages` | 删除 Login/Register Page |
| `apps/dev-tool/src/App.tsx` | 移除 `/login` `/register` 路由 |
| `apps/dev-tool/src/components` | 新增 ProductTemplateEditor（Flows 标签）；简化 AuthGuard |
| `packages/shared-types` | 删除 `published.ts`；`template.ts` 收敛 |
| `packages/workflow-core` | 删除 `published-executor.ts` 与对应 e2e 测试 |
| `tests/e2e/` | 重写为 4 个 ProductTemplate 视角的 spec |
| `.env.example`（项目根） | 新增 `VITE_PRISM_SECRET` |

---

## Out of Scope

- ~~节点市场 / NodePackage 复活~~（PRD §10.1 / Phase 0 已删）
- ~~User / JWT / Auth 系统复活~~（PRD §13.3 / Phase 0 已删）
- ~~SKU 模型复活~~（PRD §13.3 / Phase 0 已删）
- ~~WorkflowVersion 独立表~~（由 `ProductTemplate.version` 替代）
- ~~Composer SDK 实现~~（Phase 3 任务）
- ~~mall 集成接入代码~~（Phase 4 任务）
- ~~bindings 可视化编辑器~~（PRD §9 Q5：v1.0 用 JSON 表单）
- ~~批量生产 / Production 任务队列~~（PRD §10.1）
- ~~Runtime 沙箱~~（PRD §10.1 / Q7）
- ~~多租户 SaaS~~（PRD §10.1）
- ~~PDF / 多页 Output Spec~~（PRD §9 Q4：v1.0 只做 PNG/JPEG）

---

## Dependencies

| 依赖 | 原因 |
|------|------|
| Phase 0（已 archived） | 瘦身体系 + Prisma 3 表精简 + API Key 中间件 |
| Phase 1（已 archived） | image-ops 三层拆分 + NodeDefinition.platforms + dev-tool 目标平台选择 |
| `openspec/specs/PHASE2_DECISIONS.md` | Q1-Q5 + Q-E1 决策记录 |

无未完成的 active change 前置。

---

## Success Criteria

| 标准 | 验证方式 |
|------|----------|
| 5 个 ProductTemplate CRUD 端点可工作 | curl / Playwright request context 集成测试 |
| 3 个 Flow 子资源端点可工作 | 同上 |
| 同一 ProductTemplate 可关联至少 1 Preview + 1 Production Flow | DB 状态 + API 验证 |
| `POST /api/render/template` 接受 `{ templateId, userParams, inputs }` → 返回 PNG/JPEG 二进制 | Playwright `request` 上下文 E2E |
| dev-tool 启动后能列出 ProductTemplate 列表 | Playwright 启动 dev-tool + 截图验证 |
| dev-tool 能创建 ProductTemplate（含 name + platform） | E2E |
| dev-tool 编辑器支持新增/删除 Preview Flow / Production Flow | E2E + 手动验收 |
| dev-tool → server 请求带 `X-PRISM-SECRET` header | 抓包验证 |
| server 不再有 `/api/auth/*` 路由 | `routes/` 目录扫描 |
| dev-tool 不再有 LoginPage / RegisterPage | `pages/` 目录扫描 |
| `published.ts` / `publishRepository.ts` / `published-executor.ts` 已删 | `git status` + 目录扫描 |
| `pnpm typecheck` 全量通过 | CI |
| `pnpm test` 全量通过 | CI |
| `pnpm build` 全量通过 | CI |

---

## Risks

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| `published-executor.ts` 删除后导致 `packages/workflow-core` 测试失败 | 高 | 中 | tasks 显式删除 `published-executor.e2e.test.ts`（41735 bytes）；apply 前 grep `import { PublishedWorkflow }` 全量清理 |
| dev-tool 重写后端 API 调用时遗漏 `ApiStorageAdapter` 内部 method | 中 | 高 | tasks T2.3 显式列 method 清单；保持 `StorageAdapter` interface 稳定 |
| 现有 IndexedDB 缓存与新 server-first 模式冲突 | 中 | 中 | 保留 IndexedDB 作为 autosave 缓存（不冲突），server 优先 |
| E2E 重写覆盖不完整 | 中 | 中 | E2E 任务 `task_type: e2e`，lane 走 `e2e-runner` |
| `render.ts` 接口形态重写破坏 mall 集成假设 | 低 | 高 | mall 集成在 Phase 4，本 Phase mall 不存在消费方；接口向后兼容延后 |
| Prisma composite index migration 在 SQLite 与 PostgreSQL 表现差异 | 低 | 中 | dev 用 SQLite 验证；prod PostgreSQL 在 Phase 4 部署时验证 |
| Zod schema 与 Prisma 生成的类型不一致 | 中 | 中 | Zod schema 显式 import Prisma 类型，单向收敛（Prisma → Zod） |
| dev-tool 不设 `VITE_PRISM_SECRET` 时静默失败 | 中 | 低 | adapter 启动时 console.warn，**不阻断开发**（PRD §6.3 mall 信任模式） |

---

## Quality Standards Compliance

本需求遵循 [`项目全局质量与交付规范`](../../specs/QUALITY_STANDARDS.md)。

### 执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否（不修改 workflow-core executor） | — |
| 节点级错误隔离 | 是（render API 调用 executor） | `render.ts` try/catch + 错误响应测试 |
| Cancellation 完整性 | 是（render 支持 `signal`） | render API 取消测试 |
| Canvas 状态一致性 | 否（dev-tool 编辑器部分） | 手动验收 |
| Node Registry 不变量 | 否（不新增节点类型） | — |
| API 契约稳定性 | 是（5+3+1 = 9 个新/改端点） | Zod schema + 集成测试 |
| Node Package 安全 | 否（节点市场已删） | — |
| 交互完整性 | 是（Flows 标签页 UI） | 手动验收 |

### 验收要求

- [ ] 所有涉及维度已勾选对应验证方式
- [ ] render API 路径已包含 try/catch 包裹
- [ ] 取消/状态机相关逻辑已测试（如有）

---

## 相关决策文档

- [`openspec/specs/PHASE2_DECISIONS.md`](../../specs/PHASE2_DECISIONS.md) —— Q1-Q5 + Q-E1 决策
- [`docs/prd/Prism Composer Platform 产品基线 PRD v1.0.md`](../../../docs/prd/Prism%20Composer%20Platform%20产品基线%20PRD%20v1.0.md) §8 Phase 2 / §6.5 ProductTemplate 模型 / §11 瘦身体系

---

## 子 change 拆分

**不需要拆分**。本次 change 内聚性高（5 tasks + 隐藏断点修复），跨层修改高度耦合（schema → API → repository → UI 一条链），拆分反而引入协调成本。判断依据：

- 预期子 change 数：1（不满足"3 个以上"条件）
- 变更间依赖：N/A（单一 change 内）
- 专家规划文档：已存在（`PHASE2_DECISIONS.md`）