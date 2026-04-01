## ADDED Requirements

### Requirement: Node Package Import from JSON File
The system SHALL allow users to import custom node packages from JSON files.

#### Scenario: Import valid node package JSON
- **WHEN** user selects a `.json` file via file picker
- **AND** the file contains a valid `NodePackageManifest`
- **THEN** system validates the JSON structure against schema
- **AND** registers the node definition via `globalRegistry.registerNode()`
- **AND** node appears in NodePanel under "custom" category
- **AND** success toast is shown

#### Scenario: Import invalid JSON file
- **WHEN** user selects a file that is not valid JSON
- **THEN** system shows error toast: "无效的 JSON 文件"
- **AND** no node is registered

#### Scenario: Import invalid node package structure
- **WHEN** user selects a valid JSON but missing required fields (e.g., no `definition.type`)
- **THEN** system validates against JSON Schema
- **AND** shows error toast: "节点包格式错误：缺少必需字段"
- **AND** no node is registered

#### Scenario: Import duplicate node type
- **WHEN** user imports a node package with `type` that already exists
- **THEN** system shows error toast: "节点类型已存在：{type}"
- **AND** no duplicate registration occurs

---

### Requirement: Node Package Manager Panel
The system SHALL provide a panel for managing imported node packages.

#### Scenario: Open node package manager
- **WHEN** user clicks "节点包管理" button in NodePanel
- **THEN** modal/panel opens showing list of imported packages
- **AND** each package shows name, version, type, loaded timestamp

#### Scenario: Remove imported node package
- **WHEN** user clicks "删除" on a custom node package
- **THEN** node is removed from globalRegistry
- **AND** node no longer appears in NodePanel
- **AND** cached data is cleared
- **AND** success toast is shown

#### Scenario: Refresh node package
- **WHEN** user clicks "刷新" on a custom node package
- **THEN** system re-downloads the package (if from URL)
- **AND** re-registers the node definition and executor
- **AND** shows success toast

#### Scenario: View node package details
- **WHEN** user clicks "详情" on a custom node package
- **THEN** modal shows full manifest (name, version, author, description)
- **AND** shows node definition (ports, params, category)
- **AND** shows executor source (URL or inline preview)

---

### Requirement: Node Package JSON Schema Validation
The system SHALL validate imported node packages against a JSON Schema before registration.

#### Scenario: Validate required fields
- **WHEN** node package is imported
- **THEN** system validates required fields: `name`, `version`, `definition.type`, `definition.category`, `definition.label`
- **AND** validation errors show specific field name

#### Scenario: Validate definition structure
- **WHEN** node package definition is validated
- **THEN** `inputs` must be array of PortDefinition
- **AND** `outputs` must be array of PortDefinition
- **AND** `params` must be array of ParamDefinition

#### Scenario: Validate executor source
- **WHEN** executor source is validated
- **THEN** if `type === "inline"`, `code` must be a non-empty string
- **AND** if `type === "url"`, `url` must be a valid URL string
- **AND** otherwise validation fails

---

### Requirement: Inline Executor Parsing
The system SHALL parse and register inline executor code from node packages.

#### Scenario: Register inline executor
- **WHEN** node package has `executor.type === "inline"`
- **THEN** system creates a NodeExecutor function from the inline code
- **AND** registers it via `globalRegistry.registerExecutor(definition.type, fn)`
- **AND** executor is immediately available for execution

#### Scenario: Invalid inline executor code
- **WHEN** inline executor code contains syntax errors
- **THEN** system catches the error
- **AND** shows error toast: "Executor 代码语法错误"
- **AND** node is NOT registered

#### Scenario: Inline executor receives runtime context
- **WHEN** inline executor function is called during workflow execution
- **THEN** it receives `(inputs, params, ctx)` exactly like built-in executors
- **AND** it can use `ctx.requireInput()`, `ctx.imageRefs`, etc.
