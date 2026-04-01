## ADDED Requirements

### Requirement: Dynamic Extra Inputs Data Structure
The system SHALL support adding extra input ports to individual node instances.

#### Scenario: Extra inputs stored in node data
- **WHEN** extra inputs are added to a node
- **THEN** they are stored in `data.extraInputs` as an array
- **AND** each entry has shape `{ id: string, name: string, type: 'image', dataType: 'IMAGE' }`

#### Scenario: Extra inputs are instance-specific
- **WHEN** extra inputs are added to a node
- **THEN** they exist only on that node instance
- **AND** other nodes of the same type are unaffected

---

### Requirement: Add Extra Input Operation
The system SHALL provide an operation to add an extra input port to a node.

#### Scenario: Add extra input creates port
- **WHEN** `addExtraInput(nodeId, { id: 'overlay3', name: 'overlay3', type: 'image', dataType: 'IMAGE' })` is called
- **THEN** the node's `data.extraInputs` includes the new port
- **AND** node re-renders showing the new port

#### Scenario: Auto-generated port naming
- **WHEN** user adds an extra input via UI
- **THEN** the system auto-generates the next available `overlayN` name (e.g., overlay3, overlay4)

#### Scenario: Port appears immediately
- **WHEN** extra input is added
- **THEN** the port appears in the node's left port column immediately

---

### Requirement: Remove Extra Input Operation
The system SHALL provide an operation to remove an extra input port from a node.

#### Scenario: Remove extra input deletes port
- **WHEN** `removeExtraInput(nodeId, portId)` is called
- **THEN** the port is removed from `data.extraInputs`
- **AND** any connected edges to that port are also removed
- **AND** node re-renders without the port

---

### Requirement: Extra Inputs Rendered in Node
The system SHALL render extra input ports alongside definition ports.

#### Scenario: Extra inputs merge with definition inputs
- **WHEN** node renders with both `definition.inputs` and `data.extraInputs`
- **THEN** all ports are rendered in the left port column
- **AND** definition ports appear first, followed by extra inputs

#### Scenario: Extra inputs use type colors
- **WHEN** extra input port renders
- **THEN** it uses the appropriate type color (image ports are blue)

---

### Requirement: Extra Inputs in Settings Panel
The system SHALL provide UI for managing extra inputs in the Settings panel.

#### Scenario: Extra inputs list shown
- **WHEN** "设置" tab is active for a node with extra inputs
- **THEN** it lists all extra inputs with delete buttons

#### Scenario: Add button shown for supported nodes
- **WHEN** "设置" tab is active for Composite node
- **THEN** it shows a "+ 添加输入" button

#### Scenario: Delete button removes extra input
- **WHEN** user clicks delete on an extra input in Settings
- **THEN** `removeExtraInput` is called
- **AND** port is removed from the node

---

### Requirement: Extra Inputs Available in Executor
The system SHALL make extra input data available to node executors.

#### Scenario: Executor receives extra inputs
- **WHEN** executor is called for a node with extra inputs
- **AND** those inputs are connected
- **THEN** `inputs` contains values for extra input keys (e.g., `inputs.overlay3`)

#### Scenario: Extra input keys match port IDs
- **WHEN** extra input port has `id: 'overlay3'`
- **THEN** the edge connecting to it has `targetHandleId: 'overlay3'`
- **AND** `inputs['overlay3']` is populated when connected
