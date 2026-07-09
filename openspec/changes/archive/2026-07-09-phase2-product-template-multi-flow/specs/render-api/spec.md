# Spec: Render API

> OpenSpec ADDED + REMOVED delta — Phase 2 引入新接口、移除旧接口

---

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: 旧 Workflow-based Render 接口

**Reason**: Phase 2 引入 ProductTemplate-centric 数据模型后，旧 `POST /api/render`（接受 Workflow ID）已与多 Flow 架构不兼容。mall 集成（Phase 4）将消费新接口，不存在向下兼容需求。

**Migration**:
- 旧调用方（user-app）已在 Phase 0 删除，无需迁移
- mall 集成代码尚未存在（Phase 4），直接采用新接口

---

## Edge Cases

| 场景 | 预期行为 |
|------|----------|
| 用户传 `inputs` 但 ProductTemplate 不接受该 input | server 忽略未声明的 inputs，渲染使用 template 默认值 |
| template 中只有 1 个 Flow 且为 browser | 返回 422 `RENDER_PLATFORM_NOT_FOUND` |
| template 同时有 1 browser + 1 nodejs Flow | server 取 nodejs Flow 执行 |
| template 同时有 2 nodejs Flow | server 取第一条（按 `createdAt` 升序） |
| 用户传 `userParams` 但 Flow 不引用 | server 忽略，渲染不变 |

---

## Test Mapping

| Scenario | 测试文件 | 测试用例 |
|----------|----------|----------|
| 成功渲染 PNG | `server/src/routes/render.test.ts` | `should render PNG and return image/png` |
| 成功渲染 JPEG | `server/src/routes/render.test.ts` | `should render JPEG with format=jpeg` |
| Template 不存在 | `server/src/routes/render.test.ts` | `should return 404 for unknown templateId` |
| 无 Production Flow | `server/src/routes/render.test.ts` | `should return 422 when no nodejs flow` |
| 渲染超时 | `server/src/routes/render.test.ts` | `should return 504 when executor times out` |
| 渲染失败 | `server/src/routes/render.test.ts` | `should return 500 when executor throws` |
| 请求体非法 | `server/src/routes/render.test.ts` | `should return 400 for invalid body` |
| 取消请求 | `server/src/routes/render.test.ts` | `should abort executor on client disconnect` |
| PNG 默认格式 | `server/src/routes/render.test.ts` | `should default to PNG when format missing` |
| format 取值校验 | `server/src/routes/render.test.ts` | `should reject unsupported format` |
| E2E: 完整链路 | `tests/e2e/render-template.spec.ts` | `should render template via API and verify binary` |

---

## Dependencies

| 依赖 | 说明 |
|------|------|
| `product-template` capability | `selectProductionFlow` 取 nodejs Flow |
| Phase 1 image-ops/nodejs/* | sharp 渲染实现（已存在） |
| Phase 1 RenderExecutor | 支持 AbortSignal（已存在） |

---

## Future Considerations

- ~~批量 render endpoint~~（Phase 4 mall 集成）
- ~~任务队列异步 render~~（PRD §10.1 不做）
- ~~多页 / PDF 输出~~（PRD §9 Q4：v1.0 仅 PNG/JPEG）
- ~~WebSocket 推送进度~~（PRD §9 Q6：v1.0 同步即可）