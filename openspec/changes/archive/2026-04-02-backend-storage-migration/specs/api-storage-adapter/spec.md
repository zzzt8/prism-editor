## ADDED Requirements

### Requirement: ApiStorageAdapter Interface
The ApiStorageAdapter class SHALL implement the StorageAdapter interface from `@prism/shared-types`, providing an HTTP-based implementation that replaces localStorage for production use.

#### Scenario: save() calls API
- **WHEN** `save(workflow)` is called
- **THEN** adapter sends `PUT /api/workflows/:id` with workflow JSON
- **AND** returns `Promise<void>`
- **AND** throws on network failure

#### Scenario: load() fetches from API
- **WHEN** `load(id)` is called
- **THEN** adapter sends `GET /api/workflows/:id`
- **AND** parses response JSON as `Workflow`
- **AND** returns `Promise<Workflow>`

#### Scenario: list() fetches from API
- **WHEN** `list()` is called
- **THEN** adapter sends `GET /api/workflows`
- **AND** parses response as `WorkflowMeta[]`
- **AND** returns `Promise<WorkflowMeta[]>`

#### Scenario: delete() calls API
- **WHEN** `delete(id)` is called
- **THEN** adapter sends `DELETE /api/workflows/:id`
- **AND** returns `Promise<void>`

#### Scenario: createWorkflow() calls API
- **WHEN** `createWorkflow(name, description?, category?)` is called
- **THEN** adapter sends `POST /api/workflows` with the parameters
- **AND** returns `{ meta, content }`

#### Scenario: updateWorkflowMeta() calls API
- **WHEN** `updateWorkflowMeta(id, patch)` is called
- **THEN** adapter sends `PATCH /api/workflows/:id/meta` with patch
- **AND** returns `Promise<void>`

#### Scenario: exportToJson() calls API
- **WHEN** `exportToJson(workflow)` is called
- **THEN** adapter sends `GET /api/workflows/:id/export`
- **AND** returns workflow JSON string

#### Scenario: importFromJson() calls API
- **WHEN** `importFromJson(json)` is called
- **THEN** adapter sends `POST /api/workflows/import` with JSON
- **AND** returns imported `Workflow`

---

### Requirement: Environment-Based Adapter Selection
The application SHALL select between ApiStorageAdapter and LocalStorageAdapter based on environment configuration.

#### Scenario: Production uses API adapter
- **WHEN** `VITE_API_BASE_URL` environment variable is set
- **THEN** `src/storage/index.ts` exports `ApiStorageAdapter`
- **AND** all storage operations go through the API

#### Scenario: Development uses local adapter
- **WHEN** `VITE_API_BASE_URL` environment variable is not set
- **THEN** `src/storage/index.ts` exports `LocalStorageAdapter`
- **AND** all storage operations use browser localStorage

#### Scenario: Adapter configuration via environment
- **WHEN** `VITE_API_BASE_URL=https://api.example.com` is set
- **THEN** ApiStorageAdapter sends all requests to `https://api.example.com/api/*`
- **AND** all requests include appropriate headers

---

### Requirement: HTTP Error Handling
The ApiStorageAdapter SHALL handle HTTP errors gracefully and convert them to appropriate JavaScript errors.

#### Scenario: Handle 404 Not Found
- **WHEN** API returns `404` for `load(id)`
- **THEN** adapter throws `Error("Workflow not found")`

#### Scenario: Handle network failure
- **WHEN** network request fails (offline, timeout, CORS)
- **THEN** adapter throws `Error("Network request failed")` with original error as cause

#### Scenario: Handle server error
- **WHEN** API returns `500 Internal Server Error`
- **THEN** adapter throws `Error("Server error")`

---

### Requirement: Adapter Factory Pattern
The system SHALL provide a factory function for creating storage adapters with consistent configuration.

#### Scenario: Create API adapter with base URL
- **WHEN** `createApiStorageAdapter("https://api.example.com")` is called
- **THEN** returns an adapter instance configured with the base URL
- **AND** all adapter methods use the configured base URL

#### Scenario: Adapter is singleton per base URL
- **WHEN** `createApiStorageAdapter("https://api.example.com")` is called multiple times
- **THEN** returns the same instance (memoized by base URL)
- **AND** subsequent calls with same URL return cached instance
