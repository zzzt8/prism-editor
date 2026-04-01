## ADDED Requirements

### Requirement: WorkflowMeta includes all metadata fields

The system SHALL store `WorkflowMeta` with the following fields: `id` (string, UUID), `name` (string), `version` (string), `status` (`'draft' | 'published'`), `createdAt` (ISO date string), `updatedAt` (ISO date string), `description` (optional string), `category` (optional string), and `icon` (optional lucide icon name string).

#### Scenario: WorkflowMeta has correct shape
- **WHEN** `localStorageAdapter.list()` is called
- **THEN** each item in the returned array is a valid `WorkflowMeta` object with all required fields

#### Scenario: Creating a new workflow generates complete metadata
- **WHEN** a new workflow is created via `NewWorkflowModal`
- **THEN** a `WorkflowMeta` is generated with a new UUID, `status: 'draft'`, current ISO timestamp for both `createdAt` and `updatedAt`, and the user-provided name, description, and category

---

### Requirement: Workflow content stored separately from metadata

The system SHALL store workflow canvas content (nodes, edges, groups, inputs, outputs) at key `prism:workflow:{id}` in localStorage, and store workflow metadata at key `prism:meta:{id}`. The `workflows` index key `prism:workflows` SHALL store an array of all workflow IDs.

#### Scenario: Index stores only IDs
- **WHEN** `localStorageAdapter.list()` is called
- **THEN** it returns metadata objects, not full workflow content
- **WHEN** `localStorageAdapter.load(id)` is called
- **THEN** it returns the full `Workflow` object (canvas content) from `prism:workflow:{id}`

---

### Requirement: CRUD operations on workflow index and content

The storage adapter SHALL provide: `createWorkflow(name, description?, category?)` (creates both meta and empty content), `saveWorkflow(id, Workflow)` (updates content + updates `updatedAt` in meta), `loadWorkflow(id)` (returns full Workflow), `listWorkflows()` (returns all WorkflowMeta sorted by updatedAt desc), `deleteWorkflow(id)` (removes both meta and content).

#### Scenario: List workflows for homepage
- **WHEN** the homepage loads
- **THEN** `listWorkflows()` returns all `WorkflowMeta` objects sorted by `updatedAt` descending

#### Scenario: Save updates metadata timestamp
- **WHEN** `saveWorkflow(id, content)` is called
- **THEN** `meta.updatedAt` is updated to the current ISO timestamp in `prism:meta:{id}`

#### Scenario: Delete removes both meta and content
- **WHEN** `deleteWorkflow(id)` is called
- **THEN** both `prism:workflow:{id}` and `prism:meta:{id}` are removed, and `id` is removed from the `prism:workflows` index

---

### Requirement: Automatic migration of existing workflows

On first launch, the system SHALL detect if legacy flat storage exists (workflows stored without extended `WorkflowMeta`). If so, it SHALL automatically create the extended `WorkflowMeta` records for each existing workflow and write them to `prism:meta:{id}`. The migration SHALL be idempotent and marked as complete via a `prism:migration:1` flag in localStorage.

#### Scenario: Migration runs once on first launch
- **WHEN** the app starts and `prism:migration:1` does not exist in localStorage, but `prism:workflows` or old-style workflow keys exist
- **THEN** the system creates extended `WorkflowMeta` for each existing workflow and sets `prism:migration:1 = 'done'`

#### Scenario: Migration is skipped on subsequent launches
- **WHEN** the app starts and `prism:migration:1` already exists
- **THEN** no migration runs

#### Scenario: Migration is safe to re-run
- **WHEN** the migration function is called twice with the same data
- **THEN** the result is the same; no duplicate entries are created

---

### Requirement: Dirty flag reflects unsaved changes

The `canvasStore.isDirty` flag SHALL be `true` whenever the canvas has changes not yet persisted to localStorage, and `false` after a save operation.

#### Scenario: Dirty flag set on node change
- **WHEN** user adds, moves, or edits a node on the canvas
- **THEN** `canvasStore.isDirty` becomes `true`

#### Scenario: Dirty flag cleared after save
- **WHEN** `saveWorkflow(id, content)` completes successfully
- **THEN** `canvasStore.isDirty` becomes `false`
