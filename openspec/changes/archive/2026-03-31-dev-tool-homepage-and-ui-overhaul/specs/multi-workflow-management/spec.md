## ADDED Requirements

### Requirement: Homepage displays all saved workflows

The system SHALL display a homepage listing all saved workflows as a vertically scrollable list. Each entry SHALL show: workflow icon, workflow name, workflow description (truncated to one line), status badge (Draft or Published), last updated time, and a context menu trigger button. The homepage SHALL be the app's entry point when the user opens dev-tool.

#### Scenario: Homepage loads with existing workflows
- **WHEN** user opens dev-tool and the homepage is shown
- **THEN** the system displays a list of all workflows stored in localStorage, sorted by `updatedAt` descending

#### Scenario: Homepage shows empty state when no workflows exist
- **WHEN** user opens dev-tool and no workflows exist in localStorage
- **THEN** the system displays an empty state with a prompt to create the first workflow

#### Scenario: Clicking a workflow navigates to the editor
- **WHEN** user clicks on a workflow row
- **THEN** the app transitions to the editor view with that workflow's content loaded

---

### Requirement: New workflow modal for creating workflows

The system SHALL provide a modal dialog triggered by the "New Workflow" button. The modal SHALL include: a "New Blank Workflow" option (pre-selected), a workflow name input field (required), a category dropdown, and a description textarea. The modal SHALL appear centered over the homepage with a backdrop blur.

#### Scenario: New workflow modal opens
- **WHEN** user clicks "New Workflow" button on the homepage
- **THEN** the modal appears with "New Blank Workflow" pre-selected and the cursor focused on the name input

#### Scenario: Creating a new workflow
- **WHEN** user enters a workflow name and clicks "Create Workflow"
- **THEN** the system creates a new `WorkflowMeta` entry with status `draft`, a new empty `Workflow` content, navigates to the editor, and closes the modal

#### Scenario: Closing the modal without creating
- **WHEN** user clicks the X button or the backdrop or presses Escape
- **THEN** the modal closes and no workflow is created

---

### Requirement: Workflow can be deleted from homepage

The system SHALL allow deleting a workflow from the homepage. The delete action SHALL be accessible via the context menu (`...` button) on each workflow row.

#### Scenario: Delete workflow confirmation
- **WHEN** user clicks "Delete" in a workflow's context menu
- **THEN** the system shows a confirmation dialog "确定要删除此工作流吗？此操作不可撤销。"
- **WHEN** user confirms deletion
- **THEN** the system removes the workflow from `workflow-index` and deletes `workflow:{id}` from localStorage, and the row disappears from the list
- **WHEN** user cancels deletion
- **THEN** the workflow remains unchanged

---

### Requirement: Workflow context menu actions

The system SHALL provide a context menu accessible via the `...` button on each workflow row. The menu SHALL include: Open (navigates to editor), Delete, and optionally Rename (future).

#### Scenario: Context menu opens
- **WHEN** user clicks the `...` button on a workflow row
- **THEN** a dropdown menu appears with action options aligned to the right edge of the button

#### Scenario: Context menu closes on outside click
- **WHEN** user clicks outside the open context menu
- **THEN** the menu closes

---

### Requirement: Homepage toolbar with search and filter

The system SHALL provide a toolbar above the workflow list containing: a text search input that filters workflows by name, a Status dropdown (All / Draft / Published), a Sort dropdown (Recent / Name / Status), and view toggle buttons (list/grid view). The toolbar SHALL use the same visual style as the prototype (dark background, rounded container).

#### Scenario: Search filters workflow list
- **WHEN** user types in the search input
- **THEN** the list updates to show only workflows whose name contains the search text (case-insensitive)

#### Scenario: Status filter shows only matching workflows
- **WHEN** user selects "Draft" from the Status dropdown
- **THEN** only workflows with `status === 'draft'` are displayed

#### Scenario: Sort changes list order
- **WHEN** user selects "Name" from the Sort dropdown
- **THEN** workflows are sorted alphabetically by name ascending

---

### Requirement: Navigation to homepage from editor

The system SHALL provide a "Home" button in the editor's top bar. Clicking it SHALL navigate back to the homepage. If the current workflow has unsaved changes (`isDirty === true`), the system SHALL show a confirmation dialog before navigating.

#### Scenario: Navigate home from editor with clean workflow
- **WHEN** user clicks "Home" and `isDirty === false`
- **THEN** the app transitions to the homepage view

#### Scenario: Navigate home from editor with dirty workflow
- **WHEN** user clicks "Home" and `isDirty === true`
- **THEN** the system shows a confirmation dialog "当前工作流有未保存的更改，是否离开？"
- **WHEN** user confirms
- **THEN** the app transitions to the homepage and discards unsaved changes
- **WHEN** user cancels
- **THEN** the app stays in the editor

---

### Requirement: Workflow status display

Each workflow on the homepage SHALL display a status badge. Draft workflows SHALL show an amber "Draft" badge. Published workflows SHALL show an emerald "Published" badge. The status SHALL be stored in `WorkflowMeta.status`.

#### Scenario: Status badge reflects workflow state
- **WHEN** a workflow with `status === 'draft'` is listed on the homepage
- **THEN** an amber badge labeled "Draft" is shown
- **WHEN** a workflow with `status === 'published'` is listed on the homepage
- **THEN** a green badge labeled "Published" is shown
