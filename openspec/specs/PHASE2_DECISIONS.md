# Phase 2 Decisions: ProductTemplate 多流化

> **来源**：2026-07-08 `/opsx-explore` 阶段用户对 Q1-Q5 的确认
> **状态**：已拍板，作为 Phase 2 提案（`/opsx-propose phase2-product-template-multi-flow`）的输入
> **生效范围**：仅 Phase 2；不替代 PRD §13 已记录的决策

---

## 决策摘要

| ID | 决策 | 反向决策 | 影响范围 |
|---|---|---|---|
| Q1 | `shared-types/published.ts` + `publishRepository` **彻底删除** | 改写为 ProductTemplate 发布态枚举 | shared-types / dev-tool repositories |
| Q2 | dev-tool 删除 `LoginPage` / `RegisterPage`，改用 `VITE_PRISM_SECRET` env 注水 | 保留登录页做 internal-only token 入口 | dev-tool App.tsx / pages / store / storage |
| Q3 | Phase 2 多 Flow 管理 UI 做"**列表 + 选择 + 简单编辑**"；深度编辑留 Phase 3 | Phase 2 一次性做完整 Flow 编辑器 | dev-tool ProductTemplate 编辑器 |
| Q4 | Prisma `Workflow` 表**保留外键一对多** | 改扁平 content JSON 存全部 | server/prisma/schema.prisma |
| Q5 | Phase 2 **重写 E2E 为 ProductTemplate 视角** | 改 login.spec.ts 适配新 auth | tests/e2e/ |
| Q-E1 | active change `e2e-verify-canvas-synthesis-pipeline` **已归档** | 续做至 T7 完成 | openspec/changes/ |

---

## 决策详细说明

### Q1 — `published.ts` 与 `publishRepository` 命运

**决策**：彻底删除。

**理由**：
- PRD §13.4「保留决策」列表中**未列入** `PublishedWorkflow` 相关类型
- Phase 0 任务 T0.2.7 的注释说明 `published.ts` 是临时恢复（`PublishedWorkflowExecutor` 仍依赖），属历史债务
- PRD §6.5「ProductTemplate 数据模型」已用 `preview.flow / production.flow` 取代「发布」概念
- `Workflow.platform` 字段已在 Prisma + shared-types 中落地，"发布"语义被「ProductTemplate 中带 platform 标记的 Flow」吸收

**落地动作**：
- 删除 `packages/shared-types/src/published.ts`
- 删除 `apps/dev-tool/src/modules/repositories/publishRepository.ts`
- 删除 `packages/workflow-core/src/published-executor.ts`（如果其职责可被 `executor.ts` + ProductTemplate content 解析覆盖）
- 检查并删除 dev-tool 中所有 `import { PublishedWorkflow }` 引用

**风险**：
- `published-executor.e2e.test.ts`（41735 bytes，2026-05-26）会失败 — 需在 Phase 2 task 中显式迁移或删除

---

### Q2 — dev-tool 登录页命运

**决策**：删除 `LoginPage` / `RegisterPage` / `useAuthStore` / `AuthGuard`，改用 `VITE_PRISM_SECRET` env 在应用启动时注水到 `ApiStorageAdapter`。

**理由**：
- PRD §6.3 已明确「Prism 对 mall 内部完全信任」，认证用 `X-PRISM-SECRET` header
- PRD §13.3 已确认「JWT Auth + User 模型 → 删除」
- Phase 0 任务 T0.2.1 已删除 server 端 auth route（`/api/auth/login` 等），但 dev-tool 端未跟进（残留 R3）
- dev-tool 是 mall 内部工具，不暴露给终端用户，登录页是"形式大于实质"

**落地动作**：
- 删除 `apps/dev-tool/src/pages/LoginPage.tsx`
- 删除 `apps/dev-tool/src/pages/RegisterPage.tsx`
- 删除 `apps/dev-tool/src/store/authStore.ts`
- 删除或简化 `apps/dev-tool/src/components/AuthGuard.tsx`（保留文件但去除登录重定向逻辑）
- 删除 `apps/dev-tool/src/pages/AuthPage.css`
- 修改 `apps/dev-tool/src/App.tsx`：移除 `/login` / `/register` 路由
- 修改 `apps/dev-tool/src/storage/ApiStorageAdapter.ts`：
  - 删除 `accessToken` / `refreshToken` / `setTokens` / `clearTokens` 字段
  - 删除 `/auth/refresh` 调用逻辑
  - 新增：构造时读取 `import.meta.env.VITE_PRISM_SECRET`，所有 `/api/*` 请求注入 `X-PRISM-SECRET` header
- 修改 `apps/dev-tool/src/storage/index.ts`：删除 `syncStorageTokens()`
- 更新 `.env.example`（项目根）添加 `VITE_PRISM_SECRET`

**风险**：
- 任何依赖 `useAuthStore` 的组件会编译失败 — 需在 Phase 2 task 中显式列出调用点
- dev-tool 启动时若未设 `VITE_PRISM_SECRET` 应有明确警告（不阻断开发）

---

### Q3 — 多 Flow 管理 UI 范围

**决策**：Phase 2 做 **列表 + 选择 + 简单编辑**；深度编辑（Flow 可视化编辑、bindings 配置 UI）留 Phase 3。

**理由**：
- Phase 2 的 MVP 目标（PRD §8 完成标准）：「同一 ProductTemplate 可关联至少 1 Preview + 1 Production Flow；Production API 接受 ProductTemplate + 用户参数返回生产文件」
- 多 Flow **结构** 是 Phase 2 必须的（数据层 + API）；多 Flow **编辑体验** 涉及可视化交互，工作量大
- PRD §9 Q5：「dev-tool 编辑器是否需要可视化编辑 Flow 间的 bindings」明确"v1.0 用 JSON 表单，可视化编辑器后做"
- 阶段切分：Phase 2 打通数据链，Phase 3 优化交互

**落地动作（Phase 2 范围）**：
- ProductTemplate 编辑器新增 "Flows" 标签页：列出所有 flow（按 platform 分组）、可新增/删除/重命名 Flow
- 新增 Flow 弹窗：选择 platform（browser / nodejs）+ 选择已有 Workflow 关联
- bindings 编辑：JSON 表单（不做可视化）
- **不做**：Flow 内节点编辑、bindings 拖拽、Flow 间的可视化连线

**Phase 3 衔接**：
- bindings 可视化编辑器
- Flow 间共享 inputs / designParams / assets 的统一入口

---

### Q4 — Prisma `Workflow` 表结构

**决策**：保留外键一对多（`Workflow.templateId` → `ProductTemplate.id`），**不**改扁平 content JSON。

**理由**：
- 现有 `server/prisma/schema.prisma` 已经是 3 表（ProductTemplate / Workflow / Asset）外键关联
- 外键一对多天然支持多 Flow 关联（一个 ProductTemplate → N 条 Workflow 记录）
- 关系查询（按 templateId 找所有 Flow）比 content JSON 解析更高效
- `@@index([templateId])` 已存在

**Schema 微调建议**（T2.1 实际内容）：
- `Workflow.platform` 字段保留（已有）
- 新增复合索引 `@@index([templateId, platform])` 支持按 platform 过滤 Flow 查询
- 考虑为 `Workflow.name` 加唯一约束（同一 ProductTemplate 下 Flow name 唯一）— 视实际需要决定

**约束**：
- 一个 ProductTemplate 下同一 platform 允许几条 Flow？v1.0 建议**不约束**（N 条均可），约束由应用层校验
- 至少需要 1 Preview（platform='browser'）+ 1 Production（platform='nodejs'）— 由应用层在 save 前校验

---

### Q5 — E2E 套件重写

**决策**：Phase 2 内重写 E2E 为 ProductTemplate 视角。

**理由**：
- 现有 E2E（`login.spec.ts` / `create-workflow.spec.ts` / `open-workflow.spec.ts`）的前置是 JWT 登录 — Q2 已删除登录页
- E2E 既然是验证 dev-tool 主链路，必须随 dev-tool 形态一起重写
- `tests/e2e/README.md` 中描述的 3 条核心用户路径（登录 / 创建工作流 / 打开工作流）需要重新定义

**Phase 2 E2E 范围**（建议 4 个 spec）：
1. `template-list.spec.ts` — 启动 dev-tool → 验证 ProductTemplate 列表加载
2. `template-create.spec.ts` — 点击 New → 填写 name + description + platform → 验证跳转编辑器
3. `flow-manage.spec.ts` — 在 ProductTemplate 编辑器 → 切换 Flows 标签 → 新增 Preview Flow / Production Flow
4. `render-template.spec.ts` — 调用 `/api/render/template` API（使用 Playwright 的 `request` 上下文）→ 验证返回 PNG/JPEG

**删除**：
- `tests/e2e/login.spec.ts`（Q2 删除登录页后无意义）

**修改**：
- `tests/e2e/create-workflow.spec.ts` → 改名为 `template-create.spec.ts`，移除登录前置，校验路径改为 `/api/templates`
- `tests/e2e/open-workflow.spec.ts` → 改名为 `template-open.spec.ts`，校验路径改为 `/api/templates/:id`

**风险**：
- E2E 重写与 dev-tool 重构紧耦合，需在 Phase 2 tasks 中显式列为 `task_type: e2e`，lane 走 `e2e-runner`
- dev-tool 启动方式：仍用 `pnpm dev`（Vite 5173 端口 + Vite proxy `/api` → server 3001），不引入新启动编排

---

### Q-E1 — active change 归档（已执行 ✅）

**决策**：归档 `e2e-verify-canvas-synthesis-pipeline`。

**执行结果**：
- 归档位置：`openspec/changes/archive/2026-07-08-e2e-verify-canvas-synthesis-pipeline/`
- 归档 CLI 输出警告：
  - ⚠ Proposal 缺少 delta（无 `specs/` 子目录 + `## ADDED Requirements` 等）— 因为该 change 是验证 + 修复类，无新 spec 需求
  - ⚠ Tasks 仅 1/7 完成 — 用户已确认归档，不补做
- `openspec list --json` 现在返回 `{"changes": []}`

**遗留**：
- 6 个未完成 task（`T1` 验证工作流创建 / `T2` 发布 API / `T3` user-app 加载 / `T4` 图片上传 / `T5` 端到端执行 / `T7` 完整测试）涉及 **user-app**——Phase 0 已删 user-app → 这些 task 在新基线下已无意义
- 不补做、不迁移

---

## 决策间的依赖关系

```
Q1 (删 published) ──→ T2.2 (templates API) 不需要 PublishedConfig 兼容层
Q2 (删登录页) ────→ T2.3 (dev-tool UI) 不需要 AuthGuard 包裹
Q3 (Flow UI 范围) ──→ T2.3 tasks 拆分（结构 vs 编辑）
Q4 (Prisma 结构) ──→ T2.1 (schema 微调) 范围确定
Q5 (E2E 重写) ────→ T2.2/T2.3/T2.4 完成时同步重写 E2E
Q-E1 (归档) ──────→ openspec 当前 active 列表为空，Phase 2 提案为唯一 change
```

**关键路径**：Q1+Q2 是 Phase 2 启动的前置（必须先做）；Q3+Q4+Q5 在 proposal.md 中作为约束写入。

---

## 给 `/opsx-propose` 的输入

**建议 change 名**：`phase2-product-template-multi-flow`

**change_class**：high（跨 backend + editor + engine + ui-skin 四层，触发 Prisma + API + dev-tool 同步重构）

**核心 scope（基于以上决策）**：

```text
T2.1  Prisma schema 微调
      - Workflow 新增 @@index([templateId, platform])
      - 应用层校验：ProductTemplate 至少 1 Preview + 1 Production Flow
      - Q4 决策落地

T2.2  server/src/routes/templates.ts (NEW)
      - 5 个 CRUD 端点：GET/POST /api/templates, GET/PUT/DELETE /api/templates/:id
      - 子资源：GET/POST /api/templates/:id/flows, GET/PUT/DELETE /api/templates/:id/flows/:flowId
      - Zod schemas in server/src/schemas/templates.ts
      - 业务层 service in server/src/services/product-template-service.ts

T2.3  dev-tool ProductTemplate 编辑器
      - 新增 ProductTemplateRepository (REPLACE publishRepository, Q1)
      - 删除 LoginPage/RegisterPage/authStore/AuthGuard (Q2)
      - ApiStorageAdapter 重写：注水 VITE_PRISM_SECRET (Q2)
      - NewWorkflowModal + ProductTemplate 编辑器：Flows 标签页 (Q3 范围)
      - 删除 published.ts 引用 (Q1)

T2.4  server/api/render 重写
      - 新接口：POST /api/render/template
      - 入参：{ templateId, userParams, inputs }
      - 流程：按 template.production.platform 选 Flow → server-side executor → sharp 渲染
      - 返回：PNG/JPEG 二进制

T2.5  Output Spec
      - PNG / JPEG 格式支持
      - Content-Disposition 头
      - 文件路径：assets/renders/{templateId}-{timestamp}.{ext}

E2E   tests/e2e/ 重写 (Q5)
      - 4 个 spec：template-list / template-create / flow-manage / render-template
      - 删除 login.spec.ts
```

**Out of Scope**：
- 节点市场（已删，PRD §10.1）
- Runtime 沙箱（PRD §10.1 / Q7）
- 多租户 SaaS（PRD §10.1）
- 批量生产（PRD §10.1）
- Composer SDK（Phase 3）
- mall 集成（Phase 4）
- bindings 可视化编辑（Phase 3，Q3 决策）

---

## 变更历史

| 日期 | 变更 |
|---|---|
| 2026-07-08 | 初版，Q1-Q5 + Q-E1 决策记录 |
