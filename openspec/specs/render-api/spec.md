# render-api Specification

## Purpose
TBD - created by archiving change phase2-product-template-multi-flow. Update Purpose after archive.
## Requirements
### Requirement: Production Render 接口

The system SHALL provide a server-side production render endpoint `POST /api/render/template` that accepts a ProductTemplate ID with user parameters and SHALL return binary image data (PNG or JPEG).

#### Scenario: 成功渲染 PNG

- **WHEN** client 调用 `POST /api/render/template` 带 `{ templateId, userParams, inputs }`
- **AND** templateId 对应 ProductTemplate 存在
- **AND** 该 ProductTemplate 包含至少 1 个 `platform === 'nodejs'` 的 Flow
- **AND** Flow executor 在 30 秒内完成
- **THEN** server 返回 `200 OK`
- **AND** Content-Type 为 `image/png`
- **AND** Content-Disposition 为 `inline; filename="<templateId>-<timestamp>.png"`
- **AND** Body 为 PNG 二进制数据

#### Scenario: 成功渲染 JPEG

- **WHEN** client 调用 `POST /api/render/template` 带 `{ templateId, userParams, inputs, format: 'jpeg' }`
- **THEN** server 返回 `200 OK`
- **AND** Content-Type 为 `image/jpeg`
- **AND** Content-Disposition 为 `inline; filename="<templateId>-<timestamp>.jpg"`

#### Scenario: Template 不存在

- **WHEN** client 调用 `POST /api/render/template` 带无效 `templateId`
- **THEN** server 返回 `404 Not Found` 与 `{ code: "TEMPLATE_NOT_FOUND" }`

#### Scenario: 无 Production Flow

- **WHEN** client 调用 `POST /api/render/template` 带 templateId
- **AND** 该 ProductTemplate 没有 `platform === 'nodejs'` 的 Flow
- **THEN** server 返回 `422 Unprocessable Entity` 与 `{ code: "RENDER_PLATFORM_NOT_FOUND", message: "Template has no production (nodejs) Flow" }`

#### Scenario: 渲染超时

- **WHEN** client 调用 `POST /api/render/template`
- **AND** Flow executor 执行超过 30 秒
- **THEN** server 返回 `504 Gateway Timeout` 与 `{ code: "RENDER_TIMEOUT" }`
- **AND** executor 的 AbortSignal 被触发

#### Scenario: 渲染失败

- **WHEN** client 调用 `POST /api/render/template`
- **AND** Flow executor 抛错（节点级错误隔离后整体失败）
- **THEN** server 返回 `500 Internal Server Error` 与 `{ code: "RENDER_FAILED", message: <error.message>, details: <error.stack> }`

#### Scenario: 请求体非法

- **WHEN** client 调用 `POST /api/render/template` 带 `templateId` 缺失
- **THEN** server 返回 `400 Bad Request` 与 `{ code: "RENDER_INVALID_REQUEST", details: <zod-issues> }`

#### Scenario: 取消请求

- **WHEN** client 调用 `POST /api/render/template`
- **AND** client 在 executor 执行中关闭连接（AbortSignal 触发）
- **THEN** server 立即终止 executor
- **AND** 不返回任何 HTTP 响应（或返回 499 Client Closed Request）

---

### Requirement: Output 格式规范

The system SHALL default to PNG output when the request body lacks a `format` field. The system SHALL accept only `'png'` and `'jpeg'` as valid format values; other values SHALL return 400 `RENDER_INVALID_FORMAT`.

#### Scenario: PNG 默认格式

- **WHEN** request body 不含 `format` 字段
- **THEN** server 默认输出 PNG

#### Scenario: format 取值校验

- **WHEN** request body 含 `format: 'pdf'`
- **THEN** server 返回 `400 Bad Request` 与 `{ code: "RENDER_INVALID_FORMAT" }`

---

