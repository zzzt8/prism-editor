## ADDED Requirements

### Requirement: Remote Node Package Loading
The system SHALL support loading node packages from remote URLs.

#### Scenario: Load node package from URL
- **WHEN** `loadNodePackage("https://cdn.example.com/nodes/gsap.json")` is called
- **THEN** system fetches the JSON from the URL
- **AND** validates the structure
- **AND** registers the node definition and executor
- **AND** returns `LoadedNodePackage` object

#### Scenario: URL node package with remote executor
- **WHEN** node package has `executor.type === "url"`
- **THEN** system fetches the executor bundle from `executor.url`
- **AND** loads it into a Web Worker using `importScripts()`
- **AND** registers the executor from the Worker

#### Scenario: Load from URL fails (network error)
- **WHEN** fetch to remote URL fails (offline, 404, etc.)
- **THEN** system throws `Error("Failed to load node package from {url}")`
- **AND** includes original error as cause

#### Scenario: Load from URL returns invalid JSON
- **WHEN** remote URL returns non-JSON response
- **THEN** system throws `Error("Invalid JSON from {url}")`
- **AND** includes parse error details

---

### Requirement: Node Package Caching
The system SHALL cache loaded node packages to avoid repeated network requests.

#### Scenario: Memory cache hit
- **WHEN** `loadNodePackage(url)` is called twice in same session
- **THEN** second call returns from memory cache
- **AND** no network request is made
- **AND** `loadedAt` timestamp is preserved

#### Scenario: localStorage cache hit
- **WHEN** memory cache misses but package was previously loaded
- **THEN** system reads from localStorage at key `prism:node-pkg:${url}`
- **AND** parses and registers without network request
- **AND** updates memory cache

#### Scenario: Cache miss triggers network load
- **WHEN** package is not in memory or localStorage cache
- **THEN** system fetches from network
- **AND** stores in localStorage cache on success
- **AND** stores in memory cache

#### Scenario: Cache includes package content
- **WHEN** package is cached to localStorage
- **THEN** stored value includes full `manifest` JSON
- **AND** `loadedAt` timestamp
- **AND** `source` is `"localStorage"`

---

### Requirement: Cache Management
The system SHALL provide APIs for managing the node package cache.

#### Scenario: Clear all cached packages
- **WHEN** `clearNodePackageCache()` is called
- **THEN** memory cache is cleared
- **AND** localStorage keys `prism:node-pkg:*` are removed
- **AND** registered nodes remain (until page refresh)

#### Scenario: Refresh specific cached package
- **WHEN** `refreshNodePackage(url)` is called
- **THEN** localStorage cache is bypassed
- **AND** fresh copy is loaded from network
- **AND** memory cache is updated
- **AND** localStorage cache is updated

#### Scenario: Cache respects TTL
- **WHEN** cached package has `loadedAt` older than 7 days
- **THEN** cache is considered stale
- **AND** `loadNodePackage(url)` fetches fresh copy
- **AND** updates cache

---

### Requirement: Web Worker Executor Loading
The system SHALL load remote executor bundles into Web Workers for isolated execution.

#### Scenario: Load executor into worker
- **WHEN** executor URL is loaded
- **THEN** system creates a dedicated Web Worker
- **AND** uses `importScripts(url)` to load the bundle
- **AND** registers the executor from the Worker's global scope

#### Scenario: Worker executor isolation
- **WHEN** custom executor runs in Web Worker
- **THEN** it cannot access DOM APIs
- **AND** it cannot access main thread variables
- **AND** errors in executor do not crash main thread

#### Scenario: Worker executor communicates via Comlink
- **WHEN** executor is loaded from URL
- **THEN** it is expected to expose functions via Comlink
- **AND** system uses Comlink to call executor functions
- **AND** input/output are serialized via Comlink transfer

#### Scenario: Worker executor timeout
- **WHEN** executor takes longer than 30 seconds
- **THEN** system aborts the execution
- **AND** throws `Error("Executor timeout for node type: {type}")`
- **AND** worker is terminated

---

### Requirement: Error Recovery for Dynamic Loading
The system SHALL provide clear error messages and recovery options for loading failures.

#### Scenario: Show clear error on load failure
- **WHEN** `loadNodePackage(url)` fails
- **THEN** error message clearly states what failed
- **AND** includes the URL that failed
- **AND** suggests recovery actions (retry, check URL)

#### Scenario: Retry loading after failure
- **WHEN** loading failed but user clicks "重试"
- **THEN** system clears cache for that URL
- **AND** retries the network request
- **AND** on success, registers the node

#### Scenario: Partial load failure (definition OK, executor fails)
- **WHEN** node definition is valid but executor loading fails
- **THEN** node definition IS registered
- **AND** node appears in NodePanel (grayed out or with warning icon)
- **AND** executor shows error when node is executed
- **AND** user can retry executor loading separately

---

### Requirement: User App Dynamic Node Loading
The User App SHALL dynamically load required node packages before executing workflows.

#### Scenario: Load required nodes for published workflow
- **WHEN** user opens a PublishedWorkflow with `requiredNodes`
- **THEN** system loads all required node packages via `loadNodePackage()`
- **AND** registers them to globalRegistry
- **AND** THEN executes the workflow
- **AND** if any required node fails to load, execution is aborted with clear error

#### Scenario: Cached nodes speed up workflow execution
- **WHEN** user runs a workflow they ran before
- **THEN** required node packages are loaded from cache
- **AND** workflow starts faster (no network latency)

#### Scenario: Missing required node shows helpful error
- **WHEN** PublishedWorkflow references a node type not in registry
- **THEN** system shows error: "缺少必需的节点类型：{type}"
- **AND** suggests finding the node package at a marketplace URL
