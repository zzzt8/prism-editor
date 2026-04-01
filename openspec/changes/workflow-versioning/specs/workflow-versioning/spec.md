## ADDED Requirements

### Requirement: Version Creation on Save
The system SHALL automatically create a new version snapshot every time a workflow is saved.

#### Scenario: Save creates new version
- **WHEN** user saves a workflow via `PUT /api/workflows/:id`
- **THEN** a new `WorkflowVersion` record is created with the current content
- **AND** the record includes timestamp and author information
- **AND** previous versions remain unchanged

#### Scenario: Version includes full content
- **WHEN** a new version is created
- **THEN** the full workflow JSON is stored (nodes, connections, metadata)
- **AND** the version can be fully restored from this content

#### Scenario: Version is associated with workflow
- **WHEN** a version is created
- **THEN** it is linked to the parent workflow via `workflowId`
- **AND** it can be queried by workflow ID

---

### Requirement: Version List Query
The system SHALL provide an API to list all versions of a workflow.

#### Scenario: List versions
- **WHEN** user requests `GET /api/workflows/:id/versions`
- **THEN** system returns array of versions ordered by `createdAt` descending
- **AND** each version includes: `id`, `version`, `createdAt`, `createdBy`
- **AND** each version does NOT include full content (for performance)

#### Scenario: List with pagination
- **WHEN** user requests `GET /api/workflows/:id/versions?page=1&limit=20`
- **THEN** system returns at most 20 versions
- **AND** response includes `{ data: [...], total, page, limit }`

#### Scenario: Version not found
- **WHEN** user requests `GET /api/workflows/:id/versions/invalid-id`
- **THEN** system returns `404 Not Found`

---

### Requirement: Get Specific Version Content
The system SHALL provide an API to retrieve the full content of a specific version.

#### Scenario: Get version content
- **WHEN** user requests `GET /api/workflows/:id/versions/:versionId`
- **THEN** system returns the full workflow JSON for that version
- **AND** response includes: `id`, `version`, `content`, `createdAt`, `createdBy`

---

### Requirement: Rollback to Version
The system SHALL support rolling back a workflow to a previous version.

#### Scenario: Rollback creates new version
- **WHEN** user requests `POST /api/workflows/:id/rollback` with `{ versionId: "v2" }`
- **THEN** system creates a new version with content from version "v2"
- **AND** the workflow's current content is updated to match version "v2"
- **AND** original versions are preserved

#### Scenario: Rollback with custom version name
- **WHEN** user requests `POST /api/workflows/:id/rollback` with `{ versionId: "v2", newVersion: "1.1.0" }`
- **THEN** new version is named "1.1.0"
- **AND** content matches version "v2"

#### Scenario: Rollback preserves history
- **WHEN** user rolls back from version 5 to version 2
- **THEN** versions 1-5 still exist
- **AND** a new version 6 is created with content from version 2
