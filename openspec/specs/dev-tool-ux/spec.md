# dev-tool-ux Specification

## Purpose
TBD - created by archiving change phase2-product-template-multi-flow. Update Purpose after archive.
## Requirements
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

