## ADDED Requirements

### Requirement: Inspector Three-Tab Structure
The system SHALL provide a three-tab Inspector panel for selected nodes.

#### Scenario: Inspector shows three tabs
- **WHEN** a node is selected
- **THEN** Inspector displays three tabs: "参数" (Parameters), "设置" (Settings), "信息" (Info)

#### Scenario: Tab switching is instant
- **WHEN** user clicks a tab
- **THEN** the corresponding panel content renders immediately

#### Scenario: Tab state persists during session
- **WHEN** user switches tabs and selects different nodes
- **THEN** the selected tab state is preserved across node selections

#### Scenario: Inspector hides when no node selected
- **WHEN** no node is selected
- **THEN** Inspector panel is hidden or shows empty state

---

### Requirement: Parameters Panel Tab
The Parameters panel SHALL display editable node parameters.

#### Scenario: Shows parameter fields
- **WHEN** "参数" tab is active for a node with parameters
- **THEN** it displays all node parameters as form fields
- **AND** each field is editable

#### Scenario: Shows input image info
- **WHEN** node has connected input images
- **THEN** panel displays thumbnail and resolution of connected images

#### Scenario: Changes reflect in node
- **WHEN** user edits a parameter value
- **THEN** the change is reflected in the node's data
- **AND** the node re-renders with updated content

---

### Requirement: Settings Panel Tab
The Settings panel SHALL provide node-level configuration options.

#### Scenario: Alias editor
- **WHEN** "设置" tab is active
- **THEN** it displays an alias input field
- **AND** editing alias updates `data.alias` and node header

#### Scenario: Display mode options
- **WHEN** "设置" tab is active
- **THEN** it provides display mode options: Expanded, Collapsed, Title-Only

#### Scenario: Dynamic extra inputs for Composite
- **WHEN** "设置" tab is active for a Composite node
- **THEN** it shows "添加输入" button
- **AND** clicking it adds a new input port to the node

---

### Requirement: Info Panel Tab
The Info panel SHALL display read-only node information.

#### Scenario: Shows node type
- **WHEN** "信息" tab is active
- **THEN** it displays the node type (e.g., "LoadImage")

#### Scenario: Shows node ID
- **WHEN** "信息" tab is active
- **THEN** it displays the node's unique ID

#### Scenario: Shows port connections
- **WHEN** "信息" tab is active
- **THEN** it lists all input and output ports
- **AND** for each port, it shows whether it is connected

#### Scenario: Shows execution status
- **WHEN** node has been executed
- **THEN** "信息" tab shows execution time and status
