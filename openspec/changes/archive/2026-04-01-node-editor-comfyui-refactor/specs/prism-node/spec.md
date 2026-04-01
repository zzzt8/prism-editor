## ADDED Requirements

### Requirement: Dense Control Node Layout
The PrismNode component SHALL render nodes using a four-zone Dense Control Node layout: Header / Left Ports / Body / Right Ports.

#### Scenario: Node renders four zones
- **WHEN** PrismNode renders a node
- **THEN** it displays Header (title + status + menu), Left Ports (inputs), Body (content/preview), Right Ports (outputs)

#### Scenario: Header displays status indicator
- **WHEN** node is in idle state
- **THEN** header shows gray status dot
- **WHEN** node is running
- **THEN** header shows pulsing blue dot
- **WHEN** node has error
- **THEN** header shows red dot with error icon

#### Scenario: Header displays editable title
- **WHEN** node header renders
- **THEN** it shows node alias (from `data.alias`) or node type label
- **AND** double-click allows editing the alias

#### Scenario: Header displays menu button
- **WHEN** node header renders
- **THEN** it shows a menu button (three dots) that triggers context menu on click

---

### Requirement: Port Rendering with Type Colors
The system SHALL render input and output ports with type-specific colors.

#### Scenario: Left ports render inputs
- **WHEN** node has input ports defined
- **THEN** left side renders each port with: handle circle (colored by type), port name label, required indicator

#### Scenario: Right ports render outputs
- **WHEN** node has output ports defined
- **THEN** right side renders each port with: handle circle (colored by type), port name label

#### Scenario: Extra inputs render dynamically
- **WHEN** node has `data.extraInputs`
- **THEN** those ports render alongside `definition.inputs` in the left port column

#### Scenario: Extra outputs render dynamically
- **WHEN** node has `data.extraOutputs`
- **THEN** those ports render alongside `definition.outputs` in the right port column

---

### Requirement: Node Body Content
The system SHALL render node body content based on node type.

#### Scenario: Image node body shows preview
- **WHEN** node type is an image node (LoadImage, Transform, ApplyMask, Composite, PreviewImage)
- **THEN** body displays image preview area with resolution label

#### Scenario: Non-image node body shows content
- **WHEN** node type is not an image node
- **THEN** body displays appropriate content (parameters, status, etc.)

#### Scenario: Node body shows execution state
- **WHEN** node has execution error
- **THEN** body displays error message in red text
- **WHEN** node is running
- **THEN** body may display progress indicator

---

### Requirement: Node State Styling
The system SHALL apply correct CSS classes based on node state.

#### Scenario: Selected node styling
- **WHEN** node's id is in `selectedNodeIds`
- **THEN** node applies `.dcn-node--selected` CSS class

#### Scenario: Hover styling
- **WHEN** node is hovered
- **THEN** node applies `.dcn-node--hover` CSS class

#### Scenario: Error state styling
- **WHEN** node has `data.error`
- **THEN** node applies `.dcn-node--error` CSS class

#### Scenario: Running state styling
- **WHEN** node has `data.status === 'running'`
- **THEN** node applies `.dcn-node--running` CSS class

#### Scenario: Bypassed state styling
- **WHEN** node has `data.bypassed === true`
- **THEN** node applies `.dcn-node--bypassed` CSS class with reduced opacity

#### Scenario: Minimized state styling
- **WHEN** node has `data.minimized === true`
- **THEN** node renders as title-only (body hidden)
