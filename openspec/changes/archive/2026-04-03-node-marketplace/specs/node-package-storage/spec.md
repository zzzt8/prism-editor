## ADDED Requirements

### Requirement: Node Package Upload
The system SHALL allow authenticated users to upload node packages to the platform.

#### Scenario: Upload new node package
- **WHEN** authenticated user sends `POST /api/nodes` with valid NodePackageManifest
- **THEN** system creates a new `NodePackage` record
- **AND** creates a `NodePackageVersion` record
- **AND** returns `201 Created` with package details

#### Scenario: Upload with duplicate name
- **WHEN** user uploads package with `name` that already exists
- **THEN** system returns `409 Conflict` with `{ error: "Package name already taken" }`

#### Scenario: Upload without authentication
- **WHEN** unauthenticated user sends `POST /api/nodes`
- **THEN** system returns `401 Unauthorized`

#### Scenario: Upload with invalid manifest
- **WHEN** user uploads package with invalid manifest structure
- **THEN** system returns `400 Bad Request` with validation errors

---

### Requirement: Node Package Version Management
The system SHALL support uploading new versions of existing packages.

#### Scenario: Upload new version
- **WHEN** author sends `PUT /api/nodes/:id` with new version
- **THEN** system creates a new `NodePackageVersion` record
- **AND** updates `latestVersion` and `latestManifest` on `NodePackage`
- **AND** previous versions remain accessible

#### Scenario: Update by non-author
- **WHEN** user who is not the author sends `PUT /api/nodes/:id`
- **THEN** system returns `403 Forbidden`

#### Scenario: Version must be higher
- **WHEN** user tries to upload version "1.0.0" when "1.0.0" already exists
- **THEN** system returns `400 Bad Request` with `{ error: "Version must be higher than existing versions" }`

---

### Requirement: Node Package Deletion
The system SHALL allow authors to delete their own packages.

#### Scenario: Delete own package
- **WHEN** author sends `DELETE /api/nodes/:id`
- **THEN** system deletes the `NodePackage` record
- **AND** deletes all associated `NodePackageVersion` records
- **AND** returns `204 No Content`

#### Scenario: Delete by non-author
- **WHEN** non-author sends `DELETE /api/nodes/:id`
- **THEN** system returns `403 Forbidden`
