# server-deterministic-render-entry Specification

## Purpose
TBD - created by archiving change m2-c-server-deterministic-render-entry. Update Purpose after archive.
## Requirements
### Requirement: POST /api/render/design-state accepts RenderRequest

The system SHALL provide a `POST /api/render/design-state` endpoint that accepts a `RenderRequest` body and returns a `RenderResult` JSON. The system SHALL validate the request body with `validateRenderRequest` before scheduling execution.

#### Scenario: valid RenderRequest returns RenderResult

- **WHEN** a `POST /api/render/design-state` request is received with a valid `RenderRequest`
- **THEN** the response is a `RenderResult` JSON with HTTP 200
- **AND** `renderResult.outputs` contains slots declared by the resolved `Flow.explicitOutputs`

#### Scenario: invalid RenderRequest returns 400

- **WHEN** a `POST /api/render/design-state` request is received with an invalid `RenderRequest`
- **THEN** the response is HTTP 400 with a `ValidationError` JSON

---

### Requirement: Flow located by exact (templateId, templateVersion, flowKey)

The system SHALL locate a `Workflow` by `(templateId, templateVersion, flowKey)` using Prisma `findUnique` with the composite unique constraint `@@unique([templateId, flowKey])`. The system SHALL NOT use `findFirst` to select a Flow.

#### Scenario: flowKey hit returns Workflow

- **WHEN** `selectFlowByKey('tmpl-001', '1.0.0', 'production.print')` is called
- **AND** the database contains exactly one `Workflow` with `templateId === 'tmpl-001'` and `flowKey === 'production.print'`
- **THEN** the function returns that `Workflow`

#### Scenario: flowKey miss returns 404

- **WHEN** `selectFlowByKey('tmpl-001', '1.0.0', 'nonexistent')` is called
- **AND** no `Workflow` matches
- **THEN** `FlowNotFoundError` is thrown

---

### Requirement: Prisma composite unique constraint on (templateId, flowKey)

The system SHALL enforce a composite unique constraint `@@unique([templateId, flowKey])` on the `Workflow` table. Duplicate `flowKey` values within the same `templateId` SHALL cause a Prisma `UniqueConstraintViolationError` at write time.

#### Scenario: duplicate flowKey write fails

- **WHEN** a `Workflow` with `templateId === 'tmpl-001'` and `flowKey === 'production'` is inserted
- **AND** another `Workflow` with `templateId === 'tmpl-001'` and `flowKey === 'production'` already exists
- **THEN** the insertion fails with a Prisma unique constraint error

---

### Requirement: deprecated /template endpoint forwarded to /design-state

The system SHALL forward calls to the deprecated `POST /api/render/template` endpoint to the new `POST /api/render/design-state` endpoint internally, with a default `flowKey` of `'production'`. The old endpoint SHALL be marked `@deprecated` and scheduled for removal in M4.

#### Scenario: old route forwarded with default production flowKey

- **WHEN** a `POST /api/render/template` request is received
- **THEN** the handler constructs a `RenderRequest` with `flowKey: 'production'`
- **AND** the request is forwarded to the new design-state handler

