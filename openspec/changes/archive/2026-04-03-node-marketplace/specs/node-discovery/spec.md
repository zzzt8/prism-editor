## ADDED Requirements

### Requirement: Node Package Listing
The system SHALL provide an API to list all public node packages.

#### Scenario: List all packages
- **WHEN** user requests `GET /api/nodes`
- **THEN** system returns paginated list of packages
- **AND** each package includes: `id`, `name`, `description`, `category`, `latestVersion`, `authorId`

#### Scenario: Filter by category
- **WHEN** user requests `GET /api/nodes?category=animation`
- **THEN** system returns only packages with `category === "animation"`

#### Scenario: Search packages
- **WHEN** user requests `GET /api/nodes?search=gsap`
- **THEN** system returns packages where `name` or `description` contains "gsap"

#### Scenario: Sort packages
- **WHEN** user requests `GET /api/nodes?sort=newest`
- **THEN** packages are ordered by `createdAt` descending
- **WHEN** user requests `GET /api/nodes?sort=name`
- **THEN** packages are ordered alphabetically by name

#### Scenario: Paginated results
- **WHEN** user requests `GET /api/nodes?page=1&limit=10`
- **THEN** response includes `{ data: [...], total, page, limit }`
- **AND** returns at most 10 packages

---

### Requirement: Node Package Details
The system SHALL provide an API to get full details of a node package.

#### Scenario: Get package details
- **WHEN** user requests `GET /api/nodes/:id`
- **THEN** system returns full package details
- **AND** includes `latestManifest` with full node definition
- **AND** includes `latestVersion`

#### Scenario: Package not found
- **WHEN** user requests `GET /api/nodes/invalid-id`
- **THEN** system returns `404 Not Found`

---

### Requirement: Node Package Download
The system SHALL provide an API to download a node package as JSON.

#### Scenario: Download package
- **WHEN** user requests `GET /api/nodes/:id/download`
- **THEN** system returns the full NodePackageManifest as JSON
- **AND** response has `Content-Type: application/json`
- **AND** response has `Content-Disposition: attachment; filename="{name}.json"`

---

### Requirement: Node Package Version History
The system SHALL provide an API to list all versions of a package.

#### Scenario: List versions
- **WHEN** user requests `GET /api/nodes/:id/versions`
- **THEN** system returns array of versions ordered by `createdAt` descending
- **AND** each version includes: `id`, `version`, `createdAt`
- **AND** does NOT include full manifest for performance
