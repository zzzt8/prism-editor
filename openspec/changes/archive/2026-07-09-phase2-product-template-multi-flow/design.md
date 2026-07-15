# Design: Phase 2 — ProductTemplate 多流化

> 对应 `proposal.md`。本设计文档聚焦技术方案、数据流、文件影响。

---

## Goals

1. **建立 ProductTemplate 数据链路**：server CRUD API + Prisma 索引 + dev-tool Repository 完整闭环
2. **实现多 Flow 关联**：一个 ProductTemplate ↔ N 条 Workflow 记录，platform 区分 Preview/Production
3. **server-side Production Render**：接受 `{ templateId, userParams, inputs }` → 按 platform 选 Flow → executor 执行 → 返回 PNG/JPEG
4. **完成历史债务清理**：删除 published/auth 残留，与 Phase 0 瘦身基线对齐
5. **建立 dev-tool 与 server 的认证契约**：dev-tool 启动读 `VITE_PRISM_SECRET`，所有 `/api/*` 请求注入 `X-PRISM-SECRET` header

---

## Non-Goals

- ~~可视化 Flow 编辑器~~（Phase 3）
- ~~bindings 可视化配置~~（PRD §9 Q5：v1.0 用 JSON 表单）
- ~~Composer SDK~~（Phase 3）
- ~~mall 集成接入~~（Phase 4）
- ~~PDF / 多页 Output Spec~~（PRD §9 Q4：v1.0 只做 PNG/JPEG）
- ~~批量生产 / 任务队列~~（PRD §10.1）
- ~~WorkflowVersion 独立表~~（由 `ProductTemplate.version` 字段 + `updatedAt` 替代）
- ~~Runtime 沙箱~~（PRD §10.1 / Q7）

---

## Decisions

### D1: 删除 `published.ts` 与 `publishRepository`

**决策**: 彻底删除 `packages/shared-types/src/published.ts`、`apps/dev-tool/src/modules/repositories/publishRepository.ts`、`packages/workflow-core/src/published-executor.ts`、`published-executor.e2e.test.ts`。

**理由**:
- PRD §13.4 「保留决策」列表中未列入 `PublishedWorkflow`
- PRD §6.5 ProductTemplate 数据模型已用 `preview.flow` / `production.flow` 取代「发布」概念
- Phase 0 已删 server 端 `/api/published/*` route，dev-tool 端 `publishRepository` 是断链的孤儿

### D2: dev-tool 删除登录页，改 env 注水

**决策**: 删除 `LoginPage` / `RegisterPage` / `authStore`；`ApiStorageAdapter` 构造时读 `import.meta.env.VITE_PRISM_SECRET`，所有 `/api/*` 请求注入 `X-PRISM-SECRET` header。

**理由**:
- PRD §6.3 已明确 Prism 对 mall 内部完全信任
- PRD §13.3 已确认 JWT + User 模型删除决策
- Phase 0 T0.2.1 已删 server 端 auth route，dev-tool 端残留是债务
- dev-tool 是 mall 内部工具，登录页形式大于实质

### D3: 多 Flow UI 范围限定为列表 + 选择 + 简单编辑

**决策**: Phase 2 Flows 标签页 = 列表（按 platform 分组）+ 新增/删除/重命名 + 选择已有 Workflow 关联。bindings 编辑 = JSON 表单。

**理由**:
- 阶段切分：Phase 2 打通数据链，Phase 3 优化交互
- PRD §9 Q5 决策：v1.0 bindings 用 JSON 表单，可视化编辑器后做
- 深度编辑涉及可视化交互，工作量与多 Flow 数据层不成比例

### D4: Prisma 保留外键一对多

**决策**: `Workflow.templateId` → `ProductTemplate.id` 外键关联保持；`Workflow` 表新增复合索引 `@@index([templateId, platform])`。

**理由**:
- 现有 schema 已是 3 表外键关联，重构成本高
- 外键关联天然支持 N 条 Flow；按 platform 过滤查询需要复合索引
- 应用层校验「至少 1 Preview + 1 Production」比 DB constraint 更灵活

### D5: E2E 重写为 ProductTemplate 视角

**决策**: 删 `login.spec.ts` / `create-workflow.spec.ts` / `open-workflow.spec.ts`；新建 `template-list` / `template-create` / `flow-manage` / `render-template` 4 个 spec。

**理由**:
- E2E 是验证 dev-tool 主链路，必须随 dev-tool 形态一起重写
- 4 个 spec 覆盖完整路径：列出 → 创建 → 多 Flow 管理 → server-side render

### D6: render API 接口形态

**决策**: `POST /api/render/template`

**请求**:
```typescript
interface RenderRequest {
  templateId: string;
  userParams: Record<string, unknown>;  // 用户在 mall 端传入的动态参数（如文字/图片URL）
  inputs?: Record<string, unknown>;     // 模板定义的 input schema 实例
}
```

**响应** (Success):
- Content-Type: `image/png` | `image/jpeg`
- Content-Disposition: `inline; filename="<templateId>-<timestamp>.{png|jpg}"`
- Body: 二进制

**响应** (Error):
```typescript
interface RenderError {
  code: 'TEMPLATE_NOT_FOUND' | 'PLATFORM_NOT_FOUND' | 'RENDER_TIMEOUT' | 'RENDER_FAILED';
  message: string;
  details?: unknown;
}
```

**理由**:
- mall backend 作为 client，不消费 JSON 业务响应，直接消费 binary
- 透传 template 完整 content 给 executor 是 RenderExecutor 职责（已有）

---

## Architecture Review

### A1: 当前结构（Phase 1 结束状态）

```text
┌─────────────────────────────────────────────────────────────┐
│ dev-tool (React + Vite, port 5173)                         │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ authStore (JWT)  │  │ PublishRepository│ ← 调 /api/...  │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────────────────────────────┐              │
│  │ ApiStorageAdapter (调 /api/workflows/...)│ ← R1 断点     │
│  └──────────────────────────────────────────┘              │
└─────────────────────┬───────────────────────────────────────┘
                      │ /api/workflows/...  /api/auth/...  /api/published/...
                      │ X-Access-Token header
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ server (Express + Prisma, port 3001)                       │
│  routes/:                                                   │
│    workflows.ts        ✓ 存在                               │
│    auth.ts             ✗ 已删 (Phase 0)                    │
│    published.ts        ✗ 已删 (Phase 0)                    │
│    render.ts           △ 形态不对                           │
│    templates.ts        ✗ R4 缺失                          │
│  prisma/schema.prisma:                                      │
│    ProductTemplate / Workflow (FK) / Asset                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ /api/workflows 调 execute
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ workflow-core / image-ops (Phase 1 三层拆分完成)           │
└─────────────────────────────────────────────────────────────┘
```

**问题**:
1. dev-tool 调不通任何 ProductTemplate 相关后端 (R1, R2, R3)
2. server 缺 templates 路由 (R4)
3. render API 形态不对（接受 Workflow ID 而非 ProductTemplate ID）
4. JWT 残余未清
5. dev-tool 无 ProductTemplate 编辑器

### A2: 目标结构（Phase 2 结束状态）

```text
┌─────────────────────────────────────────────────────────────┐
│ dev-tool (React + Vite, port 5173)                         │
│  ┌──────────────────┐  ┌──────────────────────┐            │
│  │ ProductTemplate  │  │ ProductTemplateEditor│            │
│  │ Repository (NEW) │  │ - Flows Tab (NEW)    │            │
│  └──────────────────┘  └──────────────────────┘            │
│  ┌──────────────────────────────────────────┐              │
│  │ ApiStorageAdapter (重写)                  │              │
│  │   - 读 VITE_PRISM_SECRET                  │              │
│  │   - 注入 X-PRISM-SECRET header            │              │
│  └──────────────────────────────────────────┘              │
│  ❶ authStore / LoginPage / RegisterPage 删除               │
│  ❷ PublishRepository 删除                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ /api/templates /api/render/template
                      │ X-PRISM-SECRET header
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ server (Express + Prisma, port 3001)                       │
│  routes/:                                                   │
│    templates.ts (NEW)   ✓ 5+3 端点                         │
│    render.ts (重写)     ✓ /api/render/template              │
│  schemas/:                                                  │
│    templates.ts (NEW)   ✓ Zod                              │
│  services/:                                                 │
│    product-template-service.ts (NEW)                        │
│  prisma/schema.prisma:                                      │
│    + @@index([templateId, platform]) on Workflow            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ workflow-core / image-ops (Phase 1 不变)                   │
│   - RenderExecutor 接 ProductTemplate content               │
│   - 按 platform 选 browser/nodejs executor                  │
└─────────────────────────────────────────────────────────────┘
```

### A3: 方案对比

#### 渲染接口形态

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| **A**: `POST /api/render/template` 接 `{templateId, userParams, inputs}` → binary | mall 直接消费；接口语义清晰；Phase 4 mall 集成零摩擦 | server 需按 template 选 Flow | ✅ |
| **B**: `POST /api/render` 接 `{flowId, userParams, inputs}` | server 简单 | mall 需先查 ProductTemplate 拿到 flowId，绕一道；语义不清晰 | ❌ |
| **C**: `POST /api/render/template/:platform` 拆两个端点 | 显式 | 过度拆分；一个 product 可能 runtime 选 platform | ❌ |

#### dev-tool 认证模式

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| **A**: env 注水 `VITE_PRISM_SECRET` → server `X-PRISM-SECRET` | 与 PRD §6.3 mall 信任模式一致；零登录 UI；Phase 4 mall 集成复用 | dev-tool 启动需 env；不设时 console.warn | ✅ |
| **B**: dev-tool 内置简易 token 缓存 | dev-tool 自洽 | 与 PRD 决策冲突；增加代码量 | ❌ |
| **C**: dev-tool 直接调 server 不带 auth | 启动最简 | server 中间件会拒绝 | ❌ |

#### 多 Flow UI 编辑器深度

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| **A**: Phase 2 = 列表 + 选择 + JSON 表单 | Phase 2 数据链落地；交互简洁 | 体验不如可视化 | ✅ |
| **B**: Phase 2 = 完整可视化 | 体验最好 | 工作量大；与 Phase 3 重复 | ❌ |

---

## Data Flow

### D-Flow 1: 创建 ProductTemplate + 关联 Flow

```text
mall admin-web / dev-tool user
    ↓
[NewProductTemplateModal]
    ↓ form submit: { name, description, platform }
[ProductTemplateRepository.create()]
    ↓ POST /api/templates + X-PRISM-SECRET
[server/routes/templates.ts]
    ↓
[Zod validate] → [product-template-service.create()]
    ↓
[prisma.productTemplate.create({ include: { workflows: true } })]
    ↓
DB: ProductTemplate(id, name, ..., workflows: [])
    ↓
返回 JSON: { id, name, ..., flows: [] }
    ↓
[dev-tool] 跳转 /templates/:id → ProductTemplateEditor
```

### D-Flow 2: 关联 Workflow 到 ProductTemplate

```text
user in Flows Tab → 点击 [Add Flow]
    ↓
[AddFlowModal] 选择 platform (browser/nodejs) + 已有 Workflow ID
    ↓ submit
[FlowRepository.create({ templateId, workflowId, platform })]
    ↓ POST /api/templates/:id/flows
[server/routes/templates.ts]
    ↓
[product-template-service.addFlow()]
    ↓
[prisma.workflow.create({ data: { templateId, ...workflowContent, platform } })]
    ↓
DB: Workflow(id, templateId, platform, ...)
    ↓
返回 JSON: Workflow
    ↓
[dev-tool] 重新加载 flows list，UI 更新
```

### D-Flow 3: Production Render

```text
mall backend 调用 POST /api/render/template
    body: { templateId, userParams: {...}, inputs: {...} }
    header: X-PRISM-SECRET: <secret>
    ↓
[server/routes/render.ts]
    ↓
[product-template-service.getById(templateId)] → ProductTemplate
    ↓
[selectProductionFlow(productTemplate)]
    ↓ 取 platform === 'nodejs' 的第一条 Workflow
[RenderExecutor.execute(workflowContent, { userParams, inputs, signal })]
    ↓
[image-ops/nodejs/*] sharp 渲染
    ↓
buffer (PNG/JPEG) + Content-Disposition
    ↓
HTTP 200 binary response
    ↓
[mall] 拿到 PNG/JPEG 保存到 mall 存储
```

### D-Flow 4: dev-tool → server 认证链路

```text
[dev-tool 启动]
    ↓
[ApiStorageAdapter 构造] → 读 import.meta.env.VITE_PRISM_SECRET
    ↓ undefined → console.warn("VITE_PRISM_SECRET not set; X-PRISM-SECRET will be empty")
    ↓ defined → 存 this._secret
    ↓
[user action 触发 HTTP request]
    ↓
[ApiStorageAdapter._fetch()]
    ↓
fetch(url, { headers: { 'X-PRISM-SECRET': this._secret, 'Content-Type': 'application/json' } })
    ↓
[server middleware: apiKeyAuth] → 比对 header vs env.PRISM_SECRET
    ↓
✓ → next() / ✗ → 401 Unauthorized
```

---

## File Changes

### 新增文件

| 文件 | 用途 |
|------|------|
| `server/src/routes/templates.ts` | ProductTemplate CRUD + Flow 子资源 8 个端点 |
| `server/src/schemas/templates.ts` | Zod schemas（Create/Update ProductTemplate, Create/Update Flow） |
| `server/src/services/product-template-service.ts` | 业务层：template ↔ flow 关联、platform 校验、至少 1P + 1Prod 校验 |
| `apps/dev-tool/src/modules/repositories/productTemplateRepository.ts` | dev-tool 端 ProductTemplate 数据访问 |
| `apps/dev-tool/src/modules/repositories/flowRepository.ts` | dev-tool 端 Flow 数据访问 |
| `apps/dev-tool/src/components/ProductTemplateEditor/index.tsx` | ProductTemplate 编辑器主组件 |
| `apps/dev-tool/src/components/ProductTemplateEditor/FlowsTab.tsx` | Flows 标签页 |
| `apps/dev-tool/src/components/ProductTemplateEditor/AddFlowModal.tsx` | 新增 Flow 弹窗 |
| `apps/dev-tool/src/components/ProductTemplateEditor/BindingsEditor.tsx` | bindings JSON 表单编辑器 |
| `tests/e2e/template-list.spec.ts` | E2E: 启动 dev-tool → 列表 |
| `tests/e2e/template-create.spec.ts` | E2E: 创建 ProductTemplate |
| `tests/e2e/flow-manage.spec.ts` | E2E: Flows Tab 操作 |
| `tests/e2e/render-template.spec.ts` | E2E: render API（Playwright request） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `server/prisma/schema.prisma` | `Workflow` 新增复合索引 `@@index([templateId, platform])` |
| `server/src/routes/render.ts` | 重写：接 `{templateId, userParams, inputs}`，返回 binary |
| `server/src/app.ts` | 注册 `templates.ts` routes |
| `apps/dev-tool/src/storage/ApiStorageAdapter.ts` | 重写：删 JWT 字段，注入 `X-PRISM-SECRET` |
| `apps/dev-tool/src/storage/index.ts` | 删除 token sync 相关导出 |
| `apps/dev-tool/src/App.tsx` | 移除 `/login` `/register` 路由 |
| `apps/dev-tool/src/components/NewWorkflowModal.tsx` | 与 ProductTemplate 视角对齐（重命名或重构） |
| `apps/dev-tool/src/pages/HomePage.tsx` | ProductTemplate 列表视图 |
| `packages/shared-types/src/template.ts` | 收敛为 PRD §6.5 模型（删除 platform 字段误用等） |
| `packages/shared-types/src/index.ts` | 删除 `published` 导出 |
| `.env.example` | 新增 `VITE_PRISM_SECRET` 与注释 |
| `package.json` | 新增 dev-tool 端启动脚本说明（如需要） |

### 删除文件

| 文件 | 删除原因 |
|------|----------|
| `apps/dev-tool/src/pages/LoginPage.tsx` | Q2 决策：删除登录页 |
| `apps/dev-tool/src/pages/RegisterPage.tsx` | Q2 决策 |
| `apps/dev-tool/src/pages/AuthPage.css` | Q2 决策 |
| `apps/dev-tool/src/store/authStore.ts` | Q2 决策 |
| `apps/dev-tool/src/components/AuthGuard.tsx`（内容清空，保留文件） | Q2 决策 |
| `apps/dev-tool/src/modules/repositories/publishRepository.ts` | Q1 决策 |
| `packages/shared-types/src/published.ts` | Q1 决策 |
| `packages/workflow-core/src/published-executor.ts` | Q1 决策 |
| `packages/workflow-core/src/published-executor.e2e.test.ts` | Q1 决策（user-app 已删） |
| `tests/e2e/login.spec.ts` | Q5 决策 |
| `tests/e2e/create-workflow.spec.ts` | Q5 决策（被 `template-create.spec.ts` 替代） |
| `tests/e2e/open-workflow.spec.ts` | Q5 决策（合并入 `template-list.spec.ts` 或改名为 `template-open.spec.ts`） |

---

## API Design

### 新增 API

#### ProductTemplate CRUD

```typescript
// GET /api/templates
// 响应: ProductTemplate[] (含关联 flows)
interface ProductTemplate {
  id: string;
  name: string;
  description: string;
  inputs: Record<string, unknown>;
  designParams: Record<string, unknown>;
  assets: Asset[];
  flows: Workflow[];  // 含 platform 标记
  version: number;
  createdAt: string;
  updatedAt: string;
}

// POST /api/templates
interface CreateProductTemplateRequest {
  name: string;        // min 1, max 64
  description?: string;
  inputs?: Record<string, unknown>;
  designParams?: Record<string, unknown>;
}
// 响应: ProductTemplate (创建后 flows: [])

// GET /api/templates/:id
// 响应: ProductTemplate

// PUT /api/templates/:id
interface UpdateProductTemplateRequest {
  name?: string;
  description?: string;
  inputs?: Record<string, unknown>;
  designParams?: Record<string, unknown>;
}
// 响应: ProductTemplate (更新后)

// DELETE /api/templates/:id
// 响应: { deleted: true } 或 204
```

#### Flow 子资源

```typescript
// GET /api/templates/:id/flows
// 响应: Workflow[] (按 platform 排序)

// POST /api/templates/:id/flows
interface CreateFlowRequest {
  workflowId?: string;  // 关联已有 Workflow；与 content 二选一
  platform: 'browser' | 'nodejs';
  name: string;
  content?: WorkflowContent;  // workflowId 不传时必填
}
// 响应: Workflow (含 templateId)

// PUT /api/templates/:id/flows/:flowId
interface UpdateFlowRequest {
  name?: string;
  content?: WorkflowContent;
  bindings?: Record<string, unknown>;
}
// 响应: Workflow

// DELETE /api/templates/:id/flows/:flowId
// 响应: { deleted: true } 或 204
```

#### Render API

```typescript
// POST /api/render/template
// header: X-PRISM-SECRET
// body: JSON
interface RenderTemplateRequest {
  templateId: string;
  userParams: Record<string, unknown>;
  inputs?: Record<string, unknown>;
}
// success: 200 + image/png 或 image/jpeg binary
// error: 400 / 404 / 500 + JSON { code, message, details? }
```

### 修改 API

| 端点 | 修改内容 |
|------|----------|
| `POST /api/render` (旧) | **删除**（被 `/api/render/template` 替代） |
| `GET /api/workflows` (旧) | **删除**（被 `/api/templates` + `/api/templates/:id/flows` 替代） |

---

## Error Handling

### 错误码

| 错误码 | HTTP | 含义 | 用户提示（dev-tool） |
|--------|------|------|---------------------|
| `TEMPLATE_NOT_FOUND` | 404 | ProductTemplate 不存在 | "找不到指定的 ProductTemplate" |
| `FLOW_NOT_FOUND` | 404 | Flow 不存在 | "找不到指定的 Flow" |
| `TEMPLATE_INVALID` | 400 | 输入不符合 Zod schema | "请检查表单输入格式" |
| `FLOW_INVALID_PLATFORM` | 400 | platform 不在合法值 | "platform 必须为 browser 或 nodejs" |
| `RENDER_PLATFORM_NOT_FOUND` | 422 | ProductTemplate 没有 production Flow | "该模板没有生产端 Flow，请先添加" |
| `RENDER_TIMEOUT` | 504 | server-side executor 超时 | "渲染超时，请稍后重试" |
| `RENDER_FAILED` | 500 | executor 抛错 | "渲染失败：<error.message>" |
| `UNAUTHORIZED` | 401 | X-PRISM-SECRET 不匹配 | dev-tool console.error "请检查 VITE_PRISM_SECRET 配置" |

### 错误边界

- **server 入口**：`apiKeyAuth` middleware 统一处理 401
- **routes 层**：try/catch 包每个 handler；catch (e) → 解析 Zod error / Prisma error / Generic error → 统一响应
- **service 层**：抛业务错误（`class TemplateNotFoundError`），路由层 catch 后转 HTTP 响应
- **executor 层**：`RenderExecutor.execute` 已支持 `AbortSignal`（Phase 1 实现）；超时由 service 层用 `AbortController` 控制

---

## State Management

### dev-tool 状态

```typescript
// ProductTemplate 编辑器 (Zustand)
interface ProductTemplateEditorState {
  template: ProductTemplate | null;
  flows: Workflow[];
  selectedFlowId: string | null;
  isLoading: boolean;
  error: string | null;
  // actions
  loadTemplate(id: string): Promise<void>;
  updateTemplateContent(content: Partial<ProductTemplate>): Promise<void>;
  addFlow(workflowId: string, platform: 'browser' | 'nodejs'): Promise<void>;
  deleteFlow(flowId: string): Promise<void>;
  selectFlow(flowId: string): void;
}

// ApiStorageAdapter (单例, 不是 store)
class ApiStorageAdapter {
  private _secret: string;
  constructor() {
    this._secret = import.meta.env.VITE_PRISM_SECRET ?? '';
    if (!this._secret) console.warn('VITE_PRISM_SECRET not set; X-PRISM-SECRET will be empty');
  }
  private async _fetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`/api${path}`, {
      ...init,
      headers: {
        'X-PRISM-SECRET': this._secret,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  }
  // ... methods for templates / flows / render
}
```

### 状态转换（ProductTemplateEditor）

```text
[empty] → loadTemplate → [loading] → success → [ready]
                                          → error → [error]
[ready] → addFlow → [loading] → success → [ready (flows += 1)]
                                   → error → [error]
[ready] → deleteFlow → [loading] → success → [ready (flows -= 1)]
                                      → error → [error]
```

---

## Verification Checklist

| 类别 | 检查项 | 验证方式 |
|------|--------|----------|
| Schema | `Workflow @@index([templateId, platform])` | `prisma migrate dev` + `prisma migrate status` |
| Schema | 删除 `PublishedWorkflow` 类型引用 | `grep -r "PublishedWorkflow" packages/ apps/` |
| Core | render API 按 platform 选 Flow 逻辑 | 单元测试 `product-template-service.selectProductionFlow` |
| Core | at least 1P + 1Prod 校验 | 单元测试 `product-template-service.validateTemplateHasBothFlows` |
| Build | server build 成功 | `pnpm --filter server build` |
| Build | dev-tool build 成功 | `pnpm --filter dev-tool build` |
| Build | workflow-core build 成功（删 published-executor 后） | `pnpm --filter workflow-core build` |
| Test | server 集成测试通过 | `pnpm --filter server test` |
| Test | dev-tool unit tests 通过 | `pnpm --filter dev-tool test` |
| Test | workflow-core 单元测试通过（无 published 相关） | `pnpm --filter workflow-core test` |
| Dev-tool | 启动后能列出/创建/编辑/删除 ProductTemplate | 手动验收 + E2E |
| Dev-tool | 不再有 LoginPage / RegisterPage | `pages/` 目录扫描 + 手动验证 |
| Dev-tool | `VITE_PRISM_SECRET` 缺失时 console.warn | 手动验证（不设 env 启动） |
| E2E | template-list 通过 | `pnpm test:e2e -- template-list` |
| E2E | template-create 通过 | `pnpm test:e2e -- template-create` |
| E2E | flow-manage 通过 | `pnpm test:e2e -- flow-manage` |
| E2E | render-template 通过 | `pnpm test:e2e -- render-template` |

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| `published-executor` 删除后导致 workflow-core 测试失败 | 高 | 中 | T2.3 tasks 显式删除 `published-executor.e2e.test.ts`；apply 前 grep 清理 `PublishedWorkflow` 引用 |
| `ApiStorageAdapter` 重写遗漏 method 调用点 | 中 | 高 | T2.3 tasks 显式列 method 清单；保持 `StorageAdapter` interface 不变；编译报错兜底 |
| dev-tool IndexedDB 缓存与 server-first 模式冲突 | 中 | 中 | IndexedDB 保留作为 autosave 缓存（不参与 server 同步路径）；server 优先策略 |
| E2E 重写覆盖不完整 | 中 | 中 | E2E 任务显式标 `task_type: e2e`；lane 走 e2e-runner；与 dev-tool 任务同步落地 |
| render API 重写与未来 mall 集成假设冲突 | 低 | 高 | mall 在 Phase 4 集成；本 Phase mall 不消费；接口语义清晰（`/api/render/template`） |
| Prisma 复合索引在 SQLite 与 PostgreSQL 表现差异 | 低 | 中 | dev 用 SQLite 验证；Phase 4 部署 PostgreSQL 时再验证 |
| Zod schema 与 Prisma 生成类型不一致 | 中 | 中 | Zod schema 显式 import Prisma 类型；单向收敛（Prisma → Zod） |
| dev-tool 不设 `VITE_PRISM_SECRET` 静默失败 | 中 | 低 | adapter 启动 console.warn；调用时如未设 secret 在 server 返回 401 时 dev-tool console.error 给出明确提示 |
| Workflow.content 字段与 `WorkflowContent` 类型不一致 | 中 | 中 | T2.1 任务显式校验 Prisma schema 中的 JSON 字段类型；T2.2 service 层做结构校验 |

---

## Quality Compliance

本设计遵循 [`项目全局质量与交付规范`](../../specs/QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- **拓扑排序**: 不修改 workflow-core executor 拓扑排序逻辑（Phase 1 已稳定）；render API 调用 executor 时复用现有行为
- **节点级错误隔离**: render.ts handler 全程 try/catch；service 层捕获 executor 抛错并转为 5xx + RenderError JSON
- **Cancellation 链路**: render API 支持 `AbortSignal`（来自 client `request.signal`）；executor 已支持（Phase 1）；service 层用 `AbortController` 实现超时

### 不变量检查

- **Node Registry**: 不新增节点类型；NodeDefinition.platforms 字段已存在（Phase 1）
- **API 契约**: 5+3 个新端点；1 个删除端点（`POST /api/render`）；2 个删除端点（`GET /api/workflows` 等）
- **向后兼容**: 本 Phase mall 不存在消费方，不需兼容层；server 内部 caller（如果有）需要在 apply 时同步迁移

### 测试策略

- [x] 单元测试: `product-template-service` 的 `selectProductionFlow` / `validateTemplateHasBothFlows` / `getById`
- [x] 集成测试: server routes 的 8 个端点 + render API 端到端
- [x] 手工验收: dev-tool 启动后能 CRUD ProductTemplate；Flows Tab 操作；render API 调用

---

## 验收顺序（apply 阶段建议）

```
T2.1 (Prisma 索引)  ──┐
                       ├──→ T2.2 (templates routes + service) ──┐
                       │                                        │
                       │                                        ↓
                       │                                  T2.3 (dev-tool repository + UI)
                       │                                        │
                       │                                        ↓
                       │                                  T2.4 (render API 重写)
                       │                                        │
                       │                                        ↓
                       │                                  T2.5 (Output Spec)
                       │                                        │
                       │                                        ↓
                       └──────────────────────────────────→ T2.6 (E2E 重写)
```

T2.1 是 T2.2 的前置（schema 必须先）；T2.2 是 T2.3/T2.4 的前置（API 必须先）；T2.4 是 T2.5 的前置（输出格式依赖 render 接口）；E2E T2.6 必须在所有 tasks 完成后单独跑一次。