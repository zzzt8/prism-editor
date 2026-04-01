## ADDED Requirements

### Requirement: Dual-Write Migration Strategy
During Phase 1, the system SHALL write data to both the API and localStorage simultaneously to ensure data safety during the migration period.

#### Scenario: save() writes to both stores
- **WHEN** `save(workflow)` is called in Phase 1
- **THEN** adapter sends `PUT /api/workflows/:id` to API
- **AND** writes to `localStorage` at `prism:workflow:{id}`
- **AND** completes both operations before resolving

#### Scenario: createWorkflow() writes to both stores
- **WHEN** `createWorkflow(...)` is called in Phase 1
- **THEN** adapter sends `POST /api/workflows` to API
- **AND** writes to `localStorage` at `prism:workflow:{id}` and `prism:meta:{id}`
- **AND** returns after both operations succeed

#### Scenario: API write fails but localStorage succeeds
- **WHEN** API write fails during dual-write
- **THEN** adapter continues with localStorage write
- **AND** logs warning but does not throw
- **AND** marks API as unavailable for subsequent reads

#### Scenario: localStorage write fails but API succeeds
- **WHEN** localStorage write fails during dual-write
- **THEN** adapter continues with API write
- **AND** logs warning
- **AND** operation succeeds

---

### Requirement: Read Strategy Fallback
The system SHALL read from the API when available, falling back to localStorage when the API is unavailable.

#### Scenario: API available, reads from API
- **WHEN** `load(id)` is called and API is available
- **THEN** adapter sends `GET /api/workflows/:id`
- **AND** returns API response

#### Scenario: API unavailable, reads from localStorage
- **WHEN** API request fails or times out (5s)
- **THEN** adapter falls back to reading from `localStorage`
- **AND** logs warning about API unavailability
- **AND** returns localStorage data

#### Scenario: API becomes available after fallback
- **WHEN** API was unavailable but becomes available on next request
- **THEN** adapter detects successful API response
- **AND** updates internal API availability flag
- **AND** subsequent reads use API

---

### Requirement: Migration Completion
After Phase 2, the system SHALL support disabling localStorage fallback and operating exclusively through the API.

#### Scenario: Disable localStorage fallback
- **WHEN** `VITE_STRICT_API=true` environment variable is set
- **THEN** adapter does NOT fall back to localStorage on API failure
- **AND** throws error immediately on API failure

#### Scenario: Strict mode API failure
- **WHEN** `VITE_STRICT_API=true` and API returns error
- **THEN** adapter throws `Error("API request failed")`
- **AND** does NOT attempt localStorage fallback

---

### Requirement: Data Migration Tool
The system SHALL provide a migration script to copy existing localStorage data to the API.

#### Scenario: Migrate all workflows
- **WHEN** developer runs `pnpm server:migrate`
- **THEN** script reads all workflows from localStorage
- **AND** sends `POST /api/workflows` for each workflow
- **AND** reports migration progress and results

#### Scenario: Migration with duplicate handling
- **WHEN** localStorage workflow has same ID as existing API workflow
- **THEN** migration skips that workflow
- **AND** logs "Skipped: workflow {id} already exists"
- **AND** continues with remaining workflows

#### Scenario: Migration failure handling
- **WHEN** migration encounters a workflow with invalid data
- **THEN** migration logs error with workflow ID
- **AND** continues with remaining workflows
- **AND** reports final count of succeeded/failed migrations

---

### Requirement: API Availability Detection
The system SHALL automatically detect whether the API is available and configure adapter behavior accordingly.

#### Scenario: Health check on adapter init
- **WHEN** ApiStorageAdapter is initialized
- **THEN** adapter sends `GET /api/workflows` as health check
- **AND** sets internal availability flag based on response
- **AND** if health check fails, logs warning and enables localStorage fallback

#### Scenario: Availability check timeout
- **WHEN** API health check takes longer than 3 seconds
- **THEN** adapter treats it as unavailable
- **AND** enables localStorage fallback
- **AND** logs warning about slow API response

#### Scenario: Periodic availability check
- **WHEN** API was previously unavailable
- **THEN** adapter retries API on every storage operation
- **AND** if successful, marks API as available
- **AND** subsequent reads use API directly
