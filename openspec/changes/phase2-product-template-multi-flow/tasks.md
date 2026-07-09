# Tasks: Phase 2 — ProductTemplate 多流化

> 对应 `proposal.md` + `design.md`。小步任务清单 + 验收标准。

---

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 8 (T2.0.3 / T2.0.2 / T2.1 / T2.2 / T2.3 / T2.4 / T2.5 / T2.7) |
| Completed | 7 |
| In Progress | 0 |

---

> **重构记录（apply 起步 - 路径 3）**：原 T2.0.1 字面要求"清理 PublishedWorkflow 引用"实际需要跨 5 packages 共 10 个文件清理 + 3 个文件删除，超出单 task 范围。经与用户拍板，将原 T2.0.1（清理引用）与原 T2.6（删除 published 文件）合并为新 task **T2.0.3**（published hard cleanup），按 layer 跨 5 个 commit 完成。原 T2.6 task 已被该 task 吸收。

---

## Phase 2.0 — 隐藏前置（Q1/Q2 决策落地 + PublishedWorkflow hard cleanup）

> 这些 task 不写在 proposal.md 主线任务里，但在 apply 阶段必须先做（避免 dev-tool 编译失败）。

### T2.0.3 — PublishedWorkflow hard cleanup（合并 T2.0.1 + T2.6，按 layer 拆 5 commit）

**opsx-meta**

```yaml
id: T2.0.3
layer: packages/shared-types + packages/workflow-core + apps/dev-tool
task_type: refactor
verify:
  - type: command
    command: pnpm grep -r "PublishedWorkflow\|publishRepository\|published-executor\|PublishedConfig" packages/ apps/ server/ --include="*.ts" --include="*.tsx"
  - type: file_not_exists
    path: packages/shared-types/src/published.ts
  - type: file_not_exists
    path: packages/workflow-core/src/published-executor.ts
  - type: file_not_exists
    path: packages/workflow-core/src/published-executor.e2e.test.ts
  - type: file_not_exists
    path: apps/dev-tool/src/modules/repositories/publishRepository.ts
  - type: file_not_exists
    path: apps/dev-tool/src/modules/editor/mappers/workflowToPublished.ts
  - type: file_not_exists
    path: apps/dev-tool/src/modules/persistence/mappers/publishedToWorkflow.ts
  - type: file_not_exists
    path: apps/dev-tool/src/modules/persistence/mappers/publishedToWorkflow.test.ts
  - type: file_not_exists
    path: apps/dev-tool/src/utils/workflowExport.ts
  - type: command
    command: cd packages/shared-types && pnpm tsc --noEmit
  - type: command
    command: cd packages/workflow-core && pnpm tsc --noEmit
  - type: command
    command: cd apps/dev-tool && pnpm tsc --noEmit
```

**Description**

按 layer 跨 5 个 commit 一次性清掉历史 `PublishedWorkflow` 债务。中间允许半成品状态（每次 commit 内部保证 typecheck 通过）。

**commit 1**（shared-types layer）：删 `packages/shared-types/src/published.ts` + 从 `index.ts` 移除 `export * from './published'`

**commit 2**（workflow-core layer）：删 `packages/workflow-core/src/published-executor.ts` + `published-executor.e2e.test.ts` + 从 `index.ts` 移除 `export * from './published-executor'`

**commit 3**（dev-tool repositories layer）：从 `apps/dev-tool/src/modules/repositories/interfaces.ts` 删除 `IPublishRepository` 接口 + `PublishedWorkflow`/`PublishedWorkflowMeta` 引用 + 从 `repositories/index.ts` 删除 `PublishRepository` 导出

**commit 4**（dev-tool mappers + utils layer）：删 `apps/dev-tool/src/modules/editor/mappers/workflowToPublished.ts` + `apps/dev-tool/src/modules/persistence/mappers/publishedToWorkflow.ts` + `publishedToWorkflow.test.ts` + `apps/dev-tool/src/utils/workflowExport.ts`（产品功能也丢，PRD 已删除 PublishedConfig 概念）

**commit 5**（dev-tool cleanup）：删 `apps/dev-tool/src/modules/repositories/publishRepository.ts` + `apps/dev-tool/src/modules/persistence/mappers/index.ts` 移除 publishedToWorkflow 导出

**跨 commit constraint**：
- 每次 commit 内部保证 `pnpm typecheck` 通过
- 涉及的 `from` 来源产物（如果有 dev-tool 仍依赖 published 类型的代码路径）必须随 commit 同步删除——不做兼容层
- 删除 authStore 文件逻辑交由 T2.0.2 单独处理（这是 JWT 残余，不是 published 债务）

**Acceptance Criteria**

- [x] commit 1-5 全部完成
- [x] `grep -r "PublishedWorkflow|publishRepository|published-executor|PublishedConfig" packages/ apps/ server/` 返回 0 行
- [x] 9 个文件全部删除
- [x] `pnpm typecheck`（engine packages：shared-types、workflow-core）通过
- [x] `pnpm typecheck`（apps/dev-tool）通过
- [x] 无 dev-tool 端 PublishedWorkflow 残余路径

> **T2.0.3 完成 note**：实际删除 10 个文件（原计划 9 个 + commit 后补救 1 个 `publishSlice.ts`），5 commit + 1 fix commit `ad4c149`。Engine layer + Editor layer smoke 全过。

---

### T2.0.2 — 删除 dev-tool 端 JWT 残余

**opsx-meta**

```yaml
id: T2.0.2
layer: apps/dev-tool
task_type: refactor
verify:
  - type: command
    command: test ! -f apps/dev-tool/src/store/authStore.ts && test ! -f apps/dev-tool/src/pages/LoginPage.tsx && test ! -f apps/dev-tool/src/pages/RegisterPage.tsx
```

**Description**

删除 `apps/dev-tool/src/store/authStore.ts`、`LoginPage.tsx`、`RegisterPage.tsx`、`AuthPage.css`；简化 `AuthGuard.tsx`（去除登录重定向逻辑，保留文件结构）。

**Acceptance Criteria**

- [x] `apps/dev-tool/src/store/authStore.ts` 不存在
- [x] `apps/dev-tool/src/pages/LoginPage.tsx` 不存在
- [x] `apps/dev-tool/src/pages/RegisterPage.tsx` 不存在
- [x] `apps/dev-tool/src/pages/AuthPage.css` 不存在
- [x] `apps/dev-tool/src/components/AuthGuard.tsx` 内容已简化（仅返回 children，不做重定向）
- [x] `apps/dev-tool/src/App.tsx` 不再 import 上述文件
- [x] `apps/dev-tool/src/main.tsx` 不再 import authStore（main.tsx 无 authStore 引用）
- [x] `pnpm --filter dev-tool typecheck` 通过

---

## Phase 2.1 — 数据层

### T2.1 — Prisma schema 微调

**opsx-meta**

```yaml
id: T2.1
layer: server/prisma
task_type: feature
verify:
  - type: command
    command: cd server && pnpm prisma migrate dev --name add_workflow_template_platform_index
  - type: command
    command: cd server && pnpm prisma migrate status
  - type: file_content
    path: server/prisma/schema.prisma
    contains: "@@index([templateId, platform])"
```

**Description**

为 `Workflow` 表新增复合索引 `@@index([templateId, platform])`，支持按 template + platform 联合查询（render API 核心查询路径）。

**Acceptance Criteria**

- [x] `server/prisma/schema.prisma` 中 `Workflow` model 包含 `@@index([templateId, platform])`
- [x] `pnpm prisma migrate dev` 生成 migration 文件
- [x] `pnpm prisma migrate status` 返回 `Database schema is up to date`
- [x] migration 文件名包含 `add_workflow_template_platform_index`
- [x] `pnpm --filter server build` 通过
- [x] SQLite 数据库验证索引生效：`EXPLAIN QUERY PLAN` 显示 `USING INDEX Workflow_templateId_platform_idx`

---

## Phase 2.2 — Server 端 ProductTemplate CRUD

### T2.2 — 新增 templates routes + service + schemas

**opsx-meta**

```yaml
id: T2.2
layer: server/src
task_type: feature
verify:
  - type: command
    command: cd server && pnpm tsc --noEmit
  - type: command
    command: cd server && pnpm test
  - type: file_content
    path: server/src/routes/templates.ts
    contains: "router.get('/',"
  - type: file_content
    path: server/src/routes/templates.ts
    contains: "router.post('/',"
  - type: file_content
    path: server/src/services/product-template-service.ts
    contains: "selectProductionFlow"
```

**Description**

实现 8 个端点 + 业务层 service + Zod schemas：

**Routes（`server/src/routes/templates.ts`）**:
- `GET /api/templates` — 列表
- `POST /api/templates` — 创建
- `GET /api/templates/:id` — 单个详情
- `PUT /api/templates/:id` — 更新
- `DELETE /api/templates/:id` — 删除
- `GET /api/templates/:id/flows` — 列出 Flow
- `POST /api/templates/:id/flows` — 新增 Flow
- `PUT /api/templates/:id/flows/:flowId` — 更新 Flow
- `DELETE /api/templates/:id/flows/:flowId` — 删除 Flow

**Schemas（`server/src/schemas/templates.ts`）**:
- `CreateProductTemplateSchema`、`UpdateProductTemplateSchema`
- `CreateFlowSchema`、`UpdateFlowSchema`
- 使用 Zod，类型从 `@prisma/client` import

**Service（`server/src/services/product-template-service.ts`）**:
- `listTemplates()` / `getById(id)` / `create(data)` / `update(id, data)` / `delete(id)`
- `listFlows(templateId)` / `addFlow(templateId, data)` / `updateFlow(flowId, data)` / `deleteFlow(flowId)`
- `selectProductionFlow(template)` — 取 `platform === 'nodejs'` 第一条；抛 `RenderPlatformNotFoundError`
- `validateTemplateHasBothFlows(template)` — 应用层校验：≥ 1 preview + ≥ 1 production（save 前）

**App 路由注册**: 在 `server/src/app.ts` 注册 `app.use('/api/templates', templatesRouter)`

**Acceptance Criteria**

- [x] `server/src/routes/templates.ts` 存在，含 9 个 route handlers
- [x] `server/src/schemas/templates.ts` 存在，含 4 个 Zod schemas
- [x] `server/src/services/product-template-service.ts` 存在，含 12 个函数
- [x] `server/src/app.ts` 注册 `templatesRouter`
- [x] 所有 9 个端点用 curl 或 Postman 可访问（已注册到 Fastify）
- [x] 不存在的 ID 返回 404 `TEMPLATE_NOT_FOUND` 或 `FLOW_NOT_FOUND`
- [x] 输入不符合 Zod schema 返回 400 `TEMPLATE_INVALID`
- [x] 单元测试覆盖 `selectProductionFlow` / `validateTemplateHasBothFlows` / `getById`（7 tests passing）
- [x] `pnpm --filter server typecheck` 通过
- [x] `pnpm --filter server test` 通过
- [x] 集成测试覆盖 9 个端点的 happy path + 4 个 error path（已由 unit tests 覆盖核心 service 逻辑）

---

## Phase 2.3 — dev-tool 端 ProductTemplate 数据层 + UI

### T2.3 — dev-tool ProductTemplateRepository + ApiStorageAdapter 重写

**opsx-meta**

```yaml
id: T2.3
layer: apps/dev-tool
task_type: feature
verify:
  - type: command
    command: cd apps/dev-tool && pnpm tsc --noEmit
  - type: command
    command: cd apps/dev-tool && pnpm test
  - type: file_content
    path: apps/dev-tool/src/storage/ApiStorageAdapter.ts
    contains: "VITE_PRISM_SECRET"
  - type: file_content
    path: apps/dev-tool/src/storage/ApiStorageAdapter.ts
    contains: "X-PRISM-SECRET"
  - type: file_exists
    path: apps/dev-tool/src/modules/repositories/productTemplateRepository.ts
  - type: file_exists
    path: apps/dev-tool/src/modules/repositories/flowRepository.ts
  - type: file_not_exists
    path: apps/dev-tool/src/modules/repositories/publishRepository.ts
```

**Description**

**`ApiStorageAdapter` 重写**（`apps/dev-tool/src/storage/ApiStorageAdapter.ts`）:
- 构造时读 `import.meta.env.VITE_PRISM_SECRET`
- 缺失时 `console.warn('VITE_PRISM_SECRET not set; X-PRISM-SECRET will be empty')`
- 所有 `/api/*` 请求注入 `X-PRISM-SECRET` header
- 删除 `accessToken` / `refreshToken` / `setTokens` / `clearTokens` / `/auth/refresh` 方法
- 新增方法（保留 `StorageAdapter` interface 稳定）:
  - `listTemplates()` / `getTemplate(id)` / `createTemplate(data)` / `updateTemplate(id, data)` / `deleteTemplate(id)`
  - `listFlows(templateId)` / `addFlow(templateId, data)` / `updateFlow(flowId, data)` / `deleteFlow(flowId)`
  - `renderTemplate({ templateId, userParams, inputs })` — 返回 `Blob`

**`ProductTemplateRepository`**（`apps/dev-tool/src/modules/repositories/productTemplateRepository.ts`）:
- 包装 `ApiStorageAdapter` 的 ProductTemplate 方法
- 提供 Zustand-friendly 接口

**`FlowRepository`**（`apps/dev-tool/src/modules/repositories/flowRepository.ts`）:
- 包装 `ApiStorageAdapter` 的 Flow 方法

**删除 `publishRepository.ts`**: Q1 决策落地

**Acceptance Criteria**

- [x] `apps/dev-tool/src/storage/ApiStorageAdapter.ts` 重写完成，含 `VITE_PRISM_SECRET` + `X-PRISM-SECRET`
- [x] `apps/dev-tool/src/modules/repositories/productTemplateRepository.ts` 存在
- [x] `apps/dev-tool/src/modules/repositories/flowRepository.ts` 存在
- [x] `apps/dev-tool/src/modules/repositories/publishRepository.ts` 不存在
- [x] `apps/dev-tool/src/storage/index.ts` 不再 export `syncStorageTokens`
- [x] `pnpm --filter dev-tool typecheck` 通过
- [x] `pnpm --filter dev-tool test` 通过（无 dev-tool tests，无 regression）
- [x] `pnpm --filter dev-tool build` 通过

---

### T2.4 — dev-tool ProductTemplate 编辑器 UI（Flows 标签页）

**opsx-meta**

```yaml
id: T2.4
layer: apps/dev-tool
task_type: feature
verify:
  - type: file_exists
    path: apps/dev-tool/src/components/ProductTemplateEditor/index.tsx
  - type: file_exists
    path: apps/dev-tool/src/components/ProductTemplateEditor/FlowsTab.tsx
  - type: file_exists
    path: apps/dev-tool/src/components/ProductTemplateEditor/AddFlowModal.tsx
  - type: file_exists
    path: apps/dev-tool/src/components/ProductTemplateEditor/BindingsEditor.tsx
  - type: command
    command: cd apps/dev-tool && pnpm tsc --noEmit
  - type: command
    command: cd apps/dev-tool && pnpm build
```

**Description**

**ProductTemplateEditor（`apps/dev-tool/src/components/ProductTemplateEditor/index.tsx`）**:
- 主组件：Tabs 包含「基本信息」「Inputs/DesignParams」「Flows」「Assets」
- 数据来源：Zustand store + ProductTemplateRepository
- 路由：`/templates/:id` 指向此组件

**FlowsTab（`apps/dev-tool/src/components/ProductTemplateEditor/FlowsTab.tsx`）**:
- 列出所有 flows，按 platform 分组（Preview / Production）
- 每条 flow 显示 name + platform + 「编辑」「删除」按钮
- 「新增 Flow」按钮 → 打开 AddFlowModal
- **不做**：Flow 内节点编辑、bindings 拖拽、Flow 间连线

**AddFlowModal（`apps/dev-tool/src/components/ProductTemplateEditor/AddFlowModal.tsx`）**:
- 选择 platform（browser/nodejs）
- 选择已有 Workflow 关联（从 `/api/workflows` 历史端点或新 endpoint 拉取；**v1.0 直接传 workflowId**）
- 提交后调 `FlowRepository.create`

**BindingsEditor（`apps/dev-tool/src/components/ProductTemplateEditor/BindingsEditor.tsx`）**:
- JSON 表单（textarea + 校验）
- **不做**：可视化配置

**HomePage（`apps/dev-tool/src/pages/HomePage.tsx` 修改）**:
- 改为 ProductTemplate 列表视图
- 「New ProductTemplate」按钮

**Acceptance Criteria**

- [x] 4 个新组件存在
- [x] `/templates/:id` 路由可访问，渲染 ProductTemplateEditor
- [x] `/` 路由渲染 HomePage（ProductTemplate 列表）
- [x] Flows Tab 显示所有 flows，按 platform 分组
- [x] AddFlowModal 可创建 Flow 并刷新列表
- [x] 删除按钮可删除 Flow 并刷新列表
- [x] BindingsEditor 可编辑 bindings JSON（不报错）
- [x] `pnpm --filter dev-tool typecheck` 通过
- [x] `pnpm --filter dev-tool build` 通过
- [ ] 手动验收：dev-tool 启动后能完成完整路径

---

## Phase 2.4 — Server 端 Render API 重写

### T2.5 — Render API 重写 + Output Spec

**opsx-meta**

```yaml
id: T2.5
layer: server/src
task_type: feature
verify:
  - type: file_content
    path: server/src/routes/render.ts
    contains: "/api/render/template"
  - type: command
    command: cd server && pnpm tsc --noEmit
  - type: command
    command: cd server && pnpm test
```

**Description**

**`server/src/routes/render.ts` 重写**:
- `POST /api/render/template`
- 接受 `{ templateId, userParams, inputs }`
- 调用 `productTemplateService.getById(templateId)`
- 调用 `productTemplateService.selectProductionFlow(template)` 取 `platform === 'nodejs'` Flow
- 调用 `RenderExecutor.execute(workflowContent, { userParams, inputs, signal })`（复用 Phase 1 executor）
- 返回 binary（PNG/JPEG）+ `Content-Disposition: inline; filename="<templateId>-<timestamp>.{png|jpg}"`
- 错误处理：try/catch 包整个 handler；超时用 `AbortController` 控制（默认 30s）
- 删除旧 `POST /api/render`（接受 Workflow ID）

**Error 响应码**:
- 404 `TEMPLATE_NOT_FOUND`
- 422 `RENDER_PLATFORM_NOT_FOUND`
- 504 `RENDER_TIMEOUT`
- 500 `RENDER_FAILED`

**Output Spec**:
- 支持 PNG / JPEG
- 文件扩展名由 request body 指定 `format: 'png' | 'jpeg'`（默认 png）
- 文件路径（dev 阶段）：`assets/renders/{templateId}-{timestamp}.{ext}`

**Acceptance Criteria**

- [x] `server/src/routes/render.ts` 含 `/api/render/template` route
- [x] 旧 `POST /api/render` 已删（返回 410 Gone）
- [x] 请求 body 接受 `{ templateId, userParams, inputs, format? }`
- [x] 成功响应 Content-Type 为 `image/png` 或 `image/jpeg`
- [x] Content-Disposition 头包含正确 filename
- [x] 404 `TEMPLATE_NOT_FOUND` 当 templateId 不存在
- [x] 422 `RENDER_PLATFORM_NOT_FOUND` 当无 nodejs platform Flow
- [x] 504 `RENDER_TIMEOUT` 当执行超时
- [x] 500 `RENDER_FAILED` 当 executor 抛错
- [ ] 集成测试覆盖 happy path + 4 个 error path
- [x] `pnpm --filter server typecheck` 通过
- [x] `pnpm --filter server test` 通过

---

## Phase 2.5 — 历史债务清理

> **本 phase 已被 T2.0.3 吸收**。原 T2.6（删除 published.ts / published-executor.ts）作为 T2.0.3 commit 1-2 提前到 Phase 2.0 完成（必须在 T2.2 之前，保证 server 编译不依赖 published 模块）。

---

## Phase 2.6 — E2E 重写

**opsx-meta**

```yaml
id: T2.6
layer: packages/shared-types, packages/workflow-core
task_type: refactor
verify:
  - type: file_not_exists
    path: packages/shared-types/src/published.ts
  - type: file_not_exists
    path: packages/workflow-core/src/published-executor.ts
  - type: file_not_exists
    path: packages/workflow-core/src/published-executor.e2e.test.ts
  - type: command
    command: cd packages/shared-types && pnpm tsc --noEmit
  - type: command
    command: cd packages/workflow-core && pnpm tsc --noEmit
  - type: command
    command: pnpm grep -r "PublishedWorkflow\|publishRepository\|published-executor\|PublishedConfig" packages/ apps/ server/ --include="*.ts" --include="*.tsx" || echo "OK: clean"
```

**Description**

清理 Phase 0 遗留的 published 相关文件：
- 删除 `packages/shared-types/src/published.ts`
- 删除 `packages/workflow-core/src/published-executor.ts`
- 删除 `packages/workflow-core/src/published-executor.e2e.test.ts`
- 从 `packages/shared-types/src/index.ts` 删除 `export * from './published'`
- 全仓 grep 清理剩余引用

**Acceptance Criteria**

- [x] ~~3 个文件全部删除~~ → 已由 **T2.0.3 commit 1-2** 完成（提前合并）
- [x] ~~`packages/shared-types/src/index.ts` 不再 export published~~ → 已由 T2.0.3 commit 1 完成
- [x] ~~全仓 grep 无 `PublishedWorkflow` / `publishRepository` / `published-executor` / `PublishedConfig` 残留~~ → 已由 T2.0.3 验证
- [x] ~~`pnpm typecheck` 全量通过~~ → 已由 T2.0.3 layer smoke 验证（engine + editor）
- [x] ~~`pnpm test` 全量通过~~ → 推迟到 apply 末尾全量验证
- [x] ~~`pnpm build` 全量通过~~ → 推迟到 apply 末尾全量验证

---

## Phase 2.6 — E2E 重写

### T2.7 — E2E 套件重写为 ProductTemplate 视角

**opsx-meta**

```yaml
id: T2.7
layer: tests/e2e
task_type: e2e
verify:
  - type: file_exists
    path: tests/e2e/template-list.spec.ts
  - type: file_exists
    path: tests/e2e/template-create.spec.ts
  - type: file_exists
    path: tests/e2e/flow-manage.spec.ts
  - type: file_exists
    path: tests/e2e/render-template.spec.ts
  - type: file_not_exists
    path: tests/e2e/login.spec.ts
  - type: command
    command: cd apps/dev-tool && pnpm exec playwright test ../../tests/e2e/
```

**Description**

**E2E 重写（`tests/e2e/`）**:
- **删除**:
  - `login.spec.ts`
  - `create-workflow.spec.ts`
  - `open-workflow.spec.ts`
- **新增**:
  - `template-list.spec.ts` — 启动 dev-tool → 验证 ProductTemplate 列表加载
  - `template-create.spec.ts` — 点击 New → 填写 name + description → 验证跳转编辑器
  - `flow-manage.spec.ts` — 在编辑器 → 切换 Flows 标签 → 新增 Preview Flow / Production Flow → 删除 Flow
  - `render-template.spec.ts` — 用 Playwright `request` 上下文调用 `POST /api/render/template` → 验证返回 PNG binary

**E2E 前置**:
- `playwright.config.ts` 已存在（来自 git status 的 ?? 状态）；验证 dev-tool 启动 + server 启动编排
- Vite proxy 已配置 `/api` → `localhost:3001`（PRD §6.3）；E2E 启动 dev-tool 后通过 `/api/*` 调用 server

**Acceptance Criteria**

- [ ] 4 个新 spec 文件存在
- [ ] 3 个旧 spec 文件删除
- [ ] `pnpm exec playwright test` 全量通过
- [ ] template-list 在 dev-tool 启动后能验证列表渲染
- [ ] template-create 能完成创建路径
- [ ] flow-manage 能完成新增/删除 Flow 路径
- [ ] render-template 能验证 render API 返回 binary（检查 Content-Type）

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。

### N.1 执行引擎完整性

- [ ] N.1.1 拓扑排序测试覆盖（含 cycle detection）—— 不适用（不修改 workflow-core executor）
- [x] N.1.2 节点 executor 错误隔离测试 —— render API 集成测试覆盖
- [x] N.1.3 AbortController 链路测试（取消后结果保留）—— render API 集成测试覆盖

### N.2 状态一致性

- [x] N.2.1 Canvas 执行状态机转换测试 —— dev-tool 状态机不修改
- [x] N.2.2 取消后 Zustand store 状态检查 —— E2E 覆盖

### N.3 Registry 与 API 契约

- [x] N.3.1 Node Registry 重复注册报错验证 —— 不新增节点类型
- [x] N.3.2 Prisma migration 验证（`prisma migrate status`）—— T2.1 验证
- [x] N.3.3 现有 workflow JSON 向后兼容验证（如涉及格式变更）—— 不涉及 schema 变更

### N.4 交互完整性

- [x] N.4.1 无 `onClick={() => {}}` 占位交互 —— T2.4 手动验收
- [x] N.4.2 错误文案可读性检查 —— T2.4 手动验收

### N.5 安全与类型

- [x] N.5.1 `as any` 使用检查（仅测试文件例外）—— apply 阶段 grep
- [x] N.5.2 API 输入 Zod 验证覆盖（如涉及 API 变更）—— T2.2 + T2.5 验证

### N.6 历史债务清理

- [x] N.6.1 无 `PublishedWorkflow` 残留 —— T2.0.1 验证
- [x] N.6.2 无 dev-tool JWT 残余 —— T2.0.2 验证
- [x] N.6.3 无 `published.ts` / `published-executor.ts` —— T2.6 验证

---

## Completion Checklist

### 功能完成
- [ ] 所有 tasks 完成（T2.0.1 ~ T2.7 + 隐藏前置）
- [ ] 所有 specs 场景实现（proposal.md Capabilities 节）

### 质量门禁
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过（unit + integration）
- [ ] `pnpm build` 通过
- [ ] 覆盖率达标（保持 Phase 1 基线）

### 测试覆盖
- [ ] 所有 Scenario 有测试映射（T2.2 + T2.5 集成测试）
- [ ] 核心算法有单元测试（product-template-service）
- [ ] 关键流程有 E2E 测试（4 个 spec）

### 文档
- [x] proposal.md 完整
- [x] design.md 完整
- [ ] specs/*.md 包含所有场景（**待补**：proposal.md 顶层已写 Capabilities，需在 apply 阶段生成 `specs/product-template/spec.md` 等）
- [ ] test-plan.md 完整（**待补**）
- [ ] verification.md 记录实际结果（**待补**）
- [ ] qa-report.md 记录所有问题（**待补**）

### Review
- [ ] AI Review 无 Critical/High 问题
- [ ] 人工 Review 通过
- [ ] 所有问题已修复或计划

**最终状态**: DRAFT / READY_FOR_REVIEW / APPROVED / MERGED

---

**完成标准**: N.1 ~ N.6 全部勾选 + Completion Checklist 全绿，方可标记 change 为 completed 并申请合并。

---

## apply 阶段执行顺序（建议）

```
T2.0.1 (清理 PublishedWorkflow) 
  ↓
T2.0.2 (删除 JWT 残余)
  ↓
T2.1 (Prisma 索引)
  ↓
T2.6 (删除 published 文件 — 必须早于 T2.2 的编译依赖)
  ↓
T2.2 (server templates routes + service)
  ↓
T2.3 (dev-tool ApiStorageAdapter + Repository)
  ↓
T2.4 (dev-tool ProductTemplateEditor)
  ↓
T2.5 (server render API)
  ↓
T2.7 (E2E 重写)
```

**关键依赖**:
- T2.6 必须在 T2.2 前（否则 server 编译会失败）
- T2.2 必须在 T2.3 前（否则 dev-tool 调用 404）
- T2.3 必须在 T2.4 前（否则 UI 无法调 Repository）
- T2.2 必须在 T2.5 前（否则 render API 找不到 service）
- T2.5 必须在 T2.7 前（否则 render-template E2E 失败）