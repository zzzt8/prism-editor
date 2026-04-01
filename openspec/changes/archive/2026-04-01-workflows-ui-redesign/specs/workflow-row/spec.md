# Spec: workflow-row

## ADDED Requirements

### Requirement: Row displays three-tier visual hierarchy

The workflow row SHALL display information in three tiers:
- **L1 (Name)**: font-size 13px, font-weight 600, color `#f4f4f5`
- **L2 (Status)**: font-size 11px, font-weight 600, uppercase, color set by status (green/yellow/gray), no background fill
- **L3 (Time + Description)**: font-size 12px, font-weight 400, color `#71717a`

#### Scenario: Row shows three-tier hierarchy with all information

- **WHEN** a workflow has a name, description, and status
- **THEN** the row displays name (L1, prominent), status (L2, colored), description (L3, muted), and timestamp (L3, muted)

#### Scenario: Row shows two-tier hierarchy when description is absent

- **WHEN** a workflow has no description
- **THEN** the row displays only name (L1) and status (L2); no L3 line appears

### Requirement: Row name changes color on hover

When the user hovers over a workflow row, the workflow name SHALL change from `#f4f4f5` to `#a855f7` (brand purple accent) with a transition duration of 120ms.

#### Scenario: Name turns brand purple on row hover

- **WHEN** the user's pointer enters the workflow row area
- **THEN** the workflow name color transitions to `#a855f7`

#### Scenario: Name returns to default when hover ends

- **WHEN** the user's pointer leaves the workflow row area
- **THEN** the workflow name color transitions back to `#f4f4f5`

### Requirement: Status badge has no background fill

The status badge SHALL display as plain text with a status color and NO background fill or border. The badge text is uppercase, 11px, weight 600.

#### Scenario: Draft status renders without background

- **WHEN** a workflow has status "draft"
- **THEN** the badge displays the text "Draft" in amber/yellow color with no background

#### Scenario: Published status renders without background

- **WHEN** a workflow has status "published"
- **THEN** the badge displays the text "Published" in green color with no background

### Requirement: More button has progressive opacity reveal

The "More" button (⋮) SHALL default to `opacity: 0.4`. When the user's pointer enters the workflow row, the More button SHALL transition to `opacity: 1.0`. When the pointer leaves, it SHALL transition back to `opacity: 0.4`. The transition duration SHALL be 120ms.

#### Scenario: More button is dim by default

- **WHEN** the row renders without user interaction
- **THEN** the More button has `opacity: 0.4`

#### Scenario: More button becomes visible on row hover

- **WHEN** the user's pointer enters the workflow row
- **THEN** the More button transitions to `opacity: 1.0`

### Requirement: Row opens workflow on click

Clicking anywhere on the row except the More button SHALL open the workflow in the editor.

#### Scenario: Row click opens workflow

- **WHEN** the user clicks on the workflow row (not on the More button or name edit input)
- **THEN** the system navigates to the editor with that workflow loaded

#### Scenario: More button click does not open workflow

- **WHEN** the user clicks the More button
- **THEN** the context menu opens and the workflow is NOT opened
