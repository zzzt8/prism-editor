## ADDED Requirements

### Requirement: Version Comparison API
The system SHALL provide an API to compare two versions of a workflow.

#### Scenario: Compare two versions
- **WHEN** user requests `GET /api/workflows/:id/diff?from=versionId1&to=versionId2`
- **THEN** system returns structured diff result
- **AND** diff shows nodes that were added, removed, or modified
- **AND** diff shows connections that were added, removed, or modified

#### Scenario: Diff result structure
- **WHEN** diff is requested
- **THEN** response follows structure:
  ```json
  {
    "from": { "id": "v1", "version": "1.0.0", "createdAt": "..." },
    "to": { "id": "v2", "version": "1.1.0", "createdAt": "..." },
    "nodes": {
      "added": [{ "id": "node-1", "type": "load-image", "position": {...}, "data": {...} }],
      "removed": [{ "id": "node-2", "type": "transform", ... }],
      "modified": [{ "id": "node-3", "before": {...}, "after": {...} }]
    },
    "connections": {
      "added": [...],
      "removed": [...],
      "modified": [...]
    }
  }
  ```

#### Scenario: Compare identical versions
- **WHEN** user requests diff between same version
- **THEN** response shows no changes (`added`, `removed`, `modified` all empty)

#### Scenario: Missing version parameters
- **WHEN** user requests diff without `from` or `to` parameter
- **THEN** system returns `400 Bad Request` with validation error
