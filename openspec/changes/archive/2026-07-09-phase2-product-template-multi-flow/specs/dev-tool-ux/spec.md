# Spec: Dev-Tool 认证与 UI

> OpenSpec ADDED + REMOVED delta — Phase 2 删除 JWT auth + 新增 API Key 注水模式

---

## ADDED Requirements

### Requirement: Dev-Tool 通过 API Key 注水鉴权

The system SHALL inject `X-PRISM-SECRET` header from `VITE_PRISM_SECRET` env var into all dev-tool `/api/*` requests. Missing env var SHALL emit `console.warn` but SHALL NOT block dev-tool startup.

#### Scenario: 正常注水

- **WHEN** dev-tool 启动
- **AND** `VITE_PRISM_SECRET` 环境变量已设置
- **THEN** `ApiStorageAdapter` 构造时静默保存 secret
- **AND** 所有 `/api/*` 请求自动注入 `X-PRISM-SECRET: <secret>` header

#### Scenario: Secret 缺失警告

- **WHEN** dev-tool 启动
- **AND** `VITE_PRISM_SECRET` 环境变量未设置
- **THEN** `ApiStorageAdapter` 构造时 `console.warn('VITE_PRISM_SECRET not set; X-PRISM-SECRET will be empty')`
- **AND** dev-tool 仍可正常启动（不阻断）
- **AND** 所有 `/api/*` 请求带空 `X-PRISM-SECRET` header
- **AND** server 返回 `401 Unauthorized`
- **AND** dev-tool console.error 提示「请检查 VITE_PRISM_SECRET 配置」

---

### Requirement: Dev-Tool 列出 ProductTemplate

The system SHALL display a ProductTemplate list on dev-tool home page (`/` route) with each template showing name, description, platform coverage, and flow count.

#### Scenario: HomePage 显示列表

- **WHEN** dev-tool 启动后进入 `/` 路由
- **THEN** HomePage 显示 ProductTemplate 列表
- **AND** 每个 ProductTemplate 显示 name、description、platforms、flow count
- **AND** 「New ProductTemplate」按钮可见

#### Scenario: 列表为空

- **WHEN** 数据库无 ProductTemplate
- **THEN** HomePage 显示空状态文案「No templates yet, click New to create one」

---

### Requirement: Dev-Tool 创建 ProductTemplate

The system SHALL allow creating a new ProductTemplate via a modal on the home page. The modal SHALL validate required fields (name) and SHALL navigate to the template editor on successful creation.

#### Scenario: 打开 New Modal

- **WHEN** user 点击 HomePage 上的「New ProductTemplate」按钮
- **THEN** NewProductTemplateModal 弹出
- **AND** 含 name / description / platform 三个表单字段

#### Scenario: 提交创建

- **WHEN** user 在 Modal 中填写 name（必填）+ description（可选）+ 选择 platform
- **AND** 点击「Create」
- **THEN** dev-tool 调用 `POST /api/templates`
- **AND** 成功后跳转到 `/templates/:id` 路由
- **AND** ProductTemplateEditor 显示新创建的 template（flows 为空）

#### Scenario: 校验失败

- **WHEN** user 提交 name 为空
- **THEN** Modal 显示错误提示「Name is required」
- **AND** 不调用 API

---

### Requirement: Dev-Tool ProductTemplate 编辑器（Flows 标签）

The system SHALL provide a Flows tab in the ProductTemplate editor that lists flows grouped by platform and SHALL allow adding, editing, and deleting flows via modal/JSON-form interactions.

#### Scenario: 显示所有 flows

- **WHEN** dev-tool 进入 `/templates/:id` 路由并切换到「Flows」标签
- **THEN** 显示该 ProductTemplate 关联的所有 flows
- **AND** flows 按 platform 分组（Preview browser 在上 / Production nodejs 在下）
- **AND** 每条 flow 显示 name、platform、「Edit」「Delete」按钮

#### Scenario: 新增 Flow

- **WHEN** user 点击「Add Flow」按钮
- **THEN** AddFlowModal 弹出
- **AND** 包含 platform 单选（browser/nodejs）+ workflow 选择器
- **WHEN** user 选择 platform + 已有 Workflow ID + 提交
- **THEN** dev-tool 调用 `POST /api/templates/:id/flows`
- **AND** 成功后刷新 flows 列表

#### Scenario: 删除 Flow

- **WHEN** user 点击某 flow 的「Delete」按钮
- **AND** 确认删除
- **THEN** dev-tool 调用 `DELETE /api/templates/:id/flows/:flowId`
- **AND** 成功后刷新 flows 列表

#### Scenario: 编辑 Flow bindings

- **WHEN** user 点击某 flow 的「Edit」按钮
- **THEN** 进入 BindingsEditor（JSON 表单）
- **AND** user 可编辑 bindings JSON
- **WHEN** user 提交
- **THEN** dev-tool 调用 `PUT /api/templates/:id/flows/:flowId`

---

## REMOVED Requirements

### Requirement: Dev-Tool 登录页（JWT）

**Reason**: PRD §6.3 + §13.3 已确认 Prism 对 mall 内部完全信任，使用 API Key 鉴权。Phase 0 已删除 server 端 `/api/auth/*` 路由，dev-tool 端登录页残留是历史债务。

**Migration**:
- 不需保留向下兼容（Phase 0 后 server 已拒绝 JWT 登录）
- 改用环境变量 `VITE_PRISM_SECRET` 注水方式
- `.env.example` 文档更新

### Requirement: Dev-Tool 注册页（User 注册）

**Reason**: PRD §13.3 已确认 User 模型删除，dev-tool 注册页无意义。

**Migration**: 同上。

### Requirement: Dev-Tool AuthGuard（登录重定向）

**Reason**: 登录页删除后，重定向逻辑无意义。AuthGuard 文件保留（不删除），去除重定向逻辑，仅透传 children。

**Migration**: 调用方无外部消费，仅内部 dev-tool 路由切换。

---

## Edge Cases

| 场景 | 预期行为 |
|------|----------|
| API 返回 401 | dev-tool 路由仍可访问（不在中间件强制 logout）；具体调用方显示 toast「Authentication failed, please check VITE_PRISM_SECRET」 |
| 网络断开 | 调用方按钮 disabled + spinner，错误 toast 提示 |
| dev-tool 同时打开多个 tab | 共享同一 ApiStorageAdapter 单例实例，行为一致 |

---

## Test Mapping

| Scenario | 测试文件 | 测试用例 |
|----------|----------|----------|
| 正常注水 | `apps/dev-tool/src/storage/ApiStorageAdapter.test.ts` | `should inject X-PRISM-SECRET header` |
| Secret 缺失警告 | `apps/dev-tool/src/storage/ApiStorageAdapter.test.ts` | `should warn when VITE_PRISM_SECRET missing` |
| HomePage 显示列表 | `tests/e2e/template-list.spec.ts` | `should list templates on home page` |
| 列表为空 | `tests/e2e/template-list.spec.ts` | `should show empty state when no templates` |
| 打开 New Modal | `tests/e2e/template-create.spec.ts` | `should open New ProductTemplate modal` |
| 提交创建 | `tests/e2e/template-create.spec.ts` | `should create template and navigate to editor` |
| 校验失败 | `apps/dev-tool/src/components/NewProductTemplateModal.test.tsx` | `should show validation error when name empty` |
| 显示所有 flows | `tests/e2e/flow-manage.spec.ts` | `should list flows grouped by platform` |
| 新增 Flow | `tests/e2e/flow-manage.spec.ts` | `should add new flow via modal` |
| 删除 Flow | `tests/e2e/flow-manage.spec.ts` | `should delete flow with confirmation` |
| 编辑 Flow bindings | `tests/e2e/flow-manage.spec.ts` | `should edit flow bindings JSON` |

---

## Dependencies

| 依赖 | 说明 |
|------|------|
| `product-template` capability | API endpoint 已存在 |
| `render-api` capability | render template endpoint 已存在 |
| `.env.example` | 包含 `VITE_PRISM_SECRET` |

---

## Future Considerations

- ~~可视化 Flow 编辑器~~（Phase 3）
- ~~bindings 可视化拖拽~~（Phase 3，PRD §9 Q5）
- ~~Dev-Tool 用户偏好（暗色主题等）~~（Phase 3）