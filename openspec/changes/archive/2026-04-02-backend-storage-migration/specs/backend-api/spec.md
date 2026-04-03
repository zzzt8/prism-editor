## ADDED Requirements

### Requirement: Backend API Server
The backend server SHALL be built using Fastify with TypeScript, supporting workflow CRUD operations via RESTful API endpoints. The server MUST run on a configurable port (default 3001) and support CORS for cross-origin requests from development frontend.

#### Scenario: Server startup
- **WHEN** developer runs `pnpm server:dev`
- **THEN** Fastify server starts on port 3001 with CORS enabled
- **AND** Prisma connects to SQLite database at `server/prisma/dev.db`
- **AND** server logs "Server listening on http://localhost:3001"

#### Scenario: CORS headers on API requests
- **WHEN** frontend makes a fetch request to `/api/*`
- **THEN** response includes `Access-Control-Allow-Origin: *` header
- **AND** `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS` header

---

### Requirement: Workflow CRUD Endpoints
The server SHALL provide RESTful endpoints for all workflow operations defined in the StorageAdapter interface.

#### Scenario: Create workflow
- **WHEN** client sends `POST /api/workflows` with `{ name, description?, category? }`
- **THEN** server creates a new workflow record in the database
- **AND** returns `201 Created` with `{ id, name, version: "1.0.0", status: "DRAFT", ... }`

#### Scenario: List workflows
- **WHEN** client sends `GET /api/workflows`
- **THEN** server returns `200 OK` with array of workflow metadata (without full content)
- **AND** results are sorted by `updatedAt` descending

#### Scenario: List workflows with pagination
- **WHEN** client sends `GET /api/workflows?page=1&limit=10`
- **THEN** server returns at most 10 workflows
- **AND** response includes `{ data: [...], total: 42, page: 1, limit: 10 }`

#### Scenario: List workflows with search
- **WHEN** client sends `GET /api/workflows?search=product`
- **THEN** server returns workflows where `name` or `description` contains "product"

#### Scenario: Get workflow by ID
- **WHEN** client sends `GET /api/workflows/:id`
- **THEN** server returns `200 OK` with full workflow content (nodes, connections, etc.)
- **AND** includes metadata (name, version, status, updatedAt)

#### Scenario: Get workflow not found
- **WHEN** client sends `GET /api/workflows/nonexistent-id`
- **THEN** server returns `404 Not Found` with `{ error: "Workflow not found" }`

#### Scenario: Update workflow
- **WHEN** client sends `PUT /api/workflows/:id` with full workflow JSON
- **THEN** server updates the workflow content in database
- **AND** updates `updatedAt` timestamp
- **AND** returns `200 OK` with updated workflow

#### Scenario: Delete workflow
- **WHEN** client sends `DELETE /api/workflows/:id`
- **THEN** server deletes the workflow record
- **AND** returns `204 No Content`

#### Scenario: Update workflow metadata
- **WHEN** client sends `PATCH /api/workflows/:id/meta` with `{ name?, status?, category? }`
- **THEN** server updates only the specified fields
- **AND** returns `200 OK` with updated metadata

#### Scenario: Import workflow from JSON
- **WHEN** client sends `POST /api/workflows/import` with valid workflow JSON
- **THEN** server creates a new workflow with the imported data
- **AND** returns `201 Created` with new workflow ID

#### Scenario: Export workflow to JSON
- **WHEN** client sends `GET /api/workflows/:id/export`
- **THEN** server returns the workflow as downloadable JSON file
- **AND** response includes `Content-Disposition: attachment; filename="<name>.json"`

---

### Requirement: Published Workflow Endpoints
The server SHALL provide RESTful endpoints for published workflow operations.

#### Scenario: List published workflows
- **WHEN** client sends `GET /api/published`
- **THEN** server returns all workflows with `status: PUBLISHED`
- **AND** includes metadata and publish timestamp

#### Scenario: Publish a workflow
- **WHEN** client sends `POST /api/published` with `{ workflowId, content }`
- **THEN** server creates a PublishedWorkflow record
- **AND** updates Workflow status to `PUBLISHED`
- **AND** returns `201 Created` with published workflow

#### Scenario: Get published workflow
- **WHEN** client sends `GET /api/published/:id`
- **THEN** server returns the full PublishedWorkflow with content
- **AND** returns `404` if not found

#### Scenario: Unpublish a workflow
- **WHEN** client sends `DELETE /api/published/:id`
- **THEN** server deletes the PublishedWorkflow record
- **AND** updates Workflow status to `DRAFT`

---

### Requirement: API Validation
All API endpoints SHALL validate request bodies using Zod schemas and return appropriate error responses.

#### Scenario: Invalid request body
- **WHEN** client sends `POST /api/workflows` with missing required field `name`
- **THEN** server returns `400 Bad Request` with `{ errors: [{ path: "name", message: "Required" }] }`

#### Scenario: Invalid workflow ID format
- **WHEN** client sends `GET /api/workflows/invalid-id`
- **THEN** server returns `400 Bad Request` with validation error
