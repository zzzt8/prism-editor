# product-template Specification

## Purpose
TBD - created by archiving change phase2-product-template-multi-flow. Update Purpose after archive.
## Requirements
### Requirement: ProductTemplate 列表查询

The system SHALL return all ProductTemplate records via `GET /api/templates`, with each record including its associated flows.

#### Scenario: 列出所有 ProductTemplate

- **WHEN** client 调用 `GET /api/templates` 带 `X-PRISM-SECRET` header
- **AND** server 验证 header 有效
- **THEN** server 返回 `200 OK` 与 `ProductTemplate[]` JSON
- **AND** 每个 ProductTemplate 包含 `id`, `name`, `description`, `flows[]`, `version`, `createdAt`, `updatedAt`

#### Scenario: 列表为空

- **WHEN** 数据库无 ProductTemplate
- **AND** client 调用 `GET /api/templates`
- **THEN** server 返回 `200 OK` 与空数组 `[]`

#### Scenario: 鉴权失败

- **WHEN** client 调用 `GET /api/templates` 但缺失或错误的 `X-PRISM-SECRET`
- **THEN** server 返回 `401 Unauthorized`

---

### Requirement: ProductTemplate 创建

The system SHALL accept new ProductTemplate creation via `POST /api/templates`. Created ProductTemplate SHALL have empty flows list and version 1.

#### Scenario: 成功创建

- **WHEN** client 调用 `POST /api/templates` 带 `{ name, description, inputs, designParams }`
- **AND** 输入符合 Zod schema（name 1-64 字符）
- **THEN** server 返回 `201 Created` 与新建 ProductTemplate
- **AND** 初始 `flows: []`
- **AND** 初始 `version: 1`
- **AND** `createdAt` 与 `updatedAt` 一致

#### Scenario: 输入无效

- **WHEN** client 调用 `POST /api/templates` 但 `name` 缺失或 > 64 字符
- **THEN** server 返回 `400 Bad Request` 与 `{ code: "TEMPLATE_INVALID", details: <zod-issues> }`

---

### Requirement: ProductTemplate 单个查询

The system SHALL return a single ProductTemplate by ID with full associated flows via `GET /api/templates/:id`.

#### Scenario: 通过 ID 查找

- **WHEN** client 调用 `GET /api/templates/:id` 带有效 ID
- **THEN** server 返回 `200 OK` 与 ProductTemplate（含 flows）

#### Scenario: ID 不存在

- **WHEN** client 调用 `GET /api/templates/:id` 但 ID 不在数据库
- **THEN** server 返回 `404 Not Found` 与 `{ code: "TEMPLATE_NOT_FOUND" }`

---

### Requirement: ProductTemplate 更新

The system SHALL accept partial updates to a ProductTemplate via `PUT /api/templates/:id` and SHALL update the `updatedAt` timestamp.

#### Scenario: 部分更新

- **WHEN** client 调用 `PUT /api/templates/:id` 带 `{ name }`
- **THEN** server 返回 `200 OK` 与更新后 ProductTemplate
- **AND** `updatedAt` 时间戳更新
- **AND** 其他字段保持不变

---

### Requirement: ProductTemplate 删除

The system SHALL delete a ProductTemplate via `DELETE /api/templates/:id` and SHALL cascade-delete all associated flows.

#### Scenario: 级联删除 flows

- **WHEN** client 调用 `DELETE /api/templates/:id` 带有效 ID
- **THEN** server 返回 `204 No Content`
- **AND** 数据库中该 ProductTemplate 与所有关联 flows 均删除
- **AND** 后续 `GET /api/templates/:id` 返回 `404`

---

### Requirement: Flow 关联到 ProductTemplate

The system SHALL allow associating Workflow records with a ProductTemplate via `POST /api/templates/:id/flows`. Each Flow SHALL have a `platform` field set to `'browser'` (Preview) or `'nodejs'` (Production).

#### Scenario: 新增 Flow

- **WHEN** client 调用 `POST /api/templates/:id/flows` 带 `{ platform: 'browser' | 'nodejs', name, content }`
- **AND** template 存在
- **THEN** server 返回 `201 Created` 与新建 Workflow
- **AND** Workflow 包含 `templateId` 字段指向父 ProductTemplate

#### Scenario: platform 取值校验

- **WHEN** client 调用 `POST /api/templates/:id/flows` 带 `platform: 'invalid'`
- **THEN** server 返回 `400 Bad Request` 与 `{ code: "FLOW_INVALID_PLATFORM" }`

---

### Requirement: Flow 查询与编辑

The system SHALL support listing, updating, and deleting flows under a ProductTemplate via `GET / PUT / DELETE /api/templates/:id/flows[/:flowId]`.

#### Scenario: 列出 flows

- **WHEN** client 调用 `GET /api/templates/:id/flows`
- **THEN** server 返回 `200 OK` 与 `Workflow[]` 按 platform 排序

#### Scenario: 更新 Flow content

- **WHEN** client 调用 `PUT /api/templates/:id/flows/:flowId` 带 `{ content }`
- **THEN** server 返回 `200 OK` 与更新后 Workflow

#### Scenario: 删除 Flow

- **WHEN** client 调用 `DELETE /api/templates/:id/flows/:flowId`
- **THEN** server 返回 `204 No Content`
- **AND** 数据库中该 Workflow 删除

---

### Requirement: 平台一致性校验

The system SHALL enforce that every ProductTemplate has at least one Flow with `platform === 'browser'` AND at least one Flow with `platform === 'nodejs'`. This check SHALL apply to all `PUT /api/templates/:id` operations.

#### Scenario: 至少 1 Preview + 1 Production Flow 校验

- **WHEN** client 调用 `PUT /api/templates/:id` 修改 ProductTemplate
- **AND** 更新后 ProductTemplate 关联的 flows 中没有 `platform === 'browser'` 的 Flow
- **OR** 没有 `platform === 'nodejs'` 的 Flow
- **THEN** server 返回 `422 Unprocessable Entity` 与 `{ code: "TEMPLATE_PLATFORM_INCOMPLETE", message: "ProductTemplate must have at least 1 browser and 1 nodejs Flow" }`

---

