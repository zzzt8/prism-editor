## ADDED Requirements

### Requirement: Global Registry Singleton
The system SHALL provide a global singleton Registry that maintains all node definitions and executors across the application.

#### Scenario: Registry initializes with built-in nodes
- **WHEN** `globalRegistry.initialize()` is called
- **THEN** all built-in node definitions are registered
- **AND** all built-in executors are registered
- **AND** `_initialized` flag is set to `true`

#### Scenario: Registry prevents duplicate node types
- **WHEN** `registerNode(definition)` is called with a type that already exists
- **THEN** function throws `Error("Node type already registered: {type}")`

#### Scenario: Registry prevents duplicate executors
- **WHEN** `registerExecutor(type, fn)` is called for a type that already has an executor
- **THEN** function throws `Error("Executor already registered for type: {type}")`

#### Scenario: Registry returns undefined for unknown types
- **WHEN** `getNode("unknown-type")` or `getExecutor("unknown-type")` is called
- **THEN** function returns `undefined` (no throw)

#### Scenario: Registry lists all registered nodes
- **WHEN** `listNodes()` is called
- **THEN** returns array of all registered NodeDefinition objects
- **AND** includes both built-in and custom nodes

#### Scenario: Registry returns all executors as record
- **WHEN** `getExecutors()` is called
- **THEN** returns `Record<string, NodeExecutor>` of all registered executors
- **AND** can be directly passed to `WorkflowExecutor` constructor

---

### Requirement: Built-in Node Initialization
The global Registry SHALL automatically initialize with all built-in nodes and executors.

#### Scenario: Built-in nodes are registered on init
- **WHEN** `globalRegistry.initialize()` is called
- **THEN** `load-image`, `load-mask`, `apply-mask`, `composite`, `transform`, `export`, `preview-image` are all registered
- **AND** each node has a corresponding executor registered

#### Scenario: Built-in initialization happens only once
- **WHEN** `initialize()` is called multiple times
- **THEN** subsequent calls are no-ops (idempotent)
- **AND** no duplicate registrations occur

---

### Requirement: Registry Integration with canvasStore
The canvasStore SHALL use the global Registry for node execution and panel rendering.

#### Scenario: executeWorkflow uses global executors
- **WHEN** `canvasStore.executeWorkflow()` is called
- **THEN** `WorkflowExecutor` is created with `globalRegistry.getExecutors()`
- **AND** custom registered executors are available during execution

#### Scenario: NodePanel lists all registry nodes
- **WHEN** `NodePanel` component mounts
- **THEN** it fetches nodes from `globalRegistry.listNodes()`
- **AND** renders both built-in and custom nodes

#### Scenario: Adding custom node appears in panel immediately
- **WHEN** `globalRegistry.registerNode(customDef)` is called
- **THEN** `NodePanel` immediately shows the new node
- **AND** node is categorized under "custom"

---

### Requirement: Executor Registration API
The system SHALL provide a public API for registering custom executors.

#### Scenario: Register custom executor
- **WHEN** `globalRegistry.registerExecutor("my-node", async (inputs, params, ctx) => { ... })` is called
- **THEN** executor is stored in the registry
- **AND** subsequent `executeWorkflow()` calls use this executor for `"my-node"` type

#### Scenario: Batch registration
- **WHEN** `globalRegistry.registerAll(definitions, executors)` is called
- **THEN** all definitions are registered
- **AND** all executors are registered
- **AND** all registrations are atomic (all or nothing)

#### Scenario: Executor receives correct inputs and params
- **WHEN** custom executor is called during workflow execution
- **THEN** `inputs` contains outputs from upstream nodes
- **AND** `params` contains user's parameter values
- **AND** `ctx` provides `requireInput()`, `imageRefs`, etc.
