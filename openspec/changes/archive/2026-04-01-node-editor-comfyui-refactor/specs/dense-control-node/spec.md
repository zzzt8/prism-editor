## ADDED Requirements

### Requirement: CSS Variable System
The system SHALL provide a comprehensive CSS variable system for the Dense Control Node design language.

#### Scenario: Color variables are defined
- **WHEN** styles are loaded
- **THEN** CSS variables for all design tokens are available: `--dcn-bg-node`, `--dcn-bg-header`, `--dcn-bg-body`, `--dcn-bg-inspector`, `--dcn-text-primary`, `--dcn-text-secondary`, `--dcn-border`, `--dcn-shadow`

#### Scenario: Spacing variables are defined
- **WHEN** styles are loaded
- **THEN** spacing variables are available: `--dcn-padding-xs`, `--dcn-padding-sm`, `--dcn-padding-md`, `--dcn-padding-lg`

#### Scenario: Border radius variables are defined
- **WHEN** styles are loaded
- **THEN** border radius variables are available: `--dcn-radius-sm`, `--dcn-radius-md`, `--dcn-radius-lg`

---

### Requirement: Dense Control Node Structure Classes
The system SHALL provide CSS classes for the four-zone Dense Control Node layout.

#### Scenario: Node container class
- **WHEN** node is rendered
- **THEN** it uses `.dcn-node` class with correct background, border, shadow, and border-radius

#### Scenario: Header zone class
- **WHEN** node header is rendered
- **THEN** it uses `.dcn-header` class with correct padding and border-bottom

#### Scenario: Body zone class
- **WHEN** node body is rendered
- **THEN** it uses `.dcn-body` class with correct padding

#### Scenario: Port columns classes
- **WHEN** left/right port columns are rendered
- **THEN** they use `.dcn-ports-left` and `.dcn-ports-right` classes respectively

---

### Requirement: Node State Styles
The system SHALL provide CSS classes for all node states.

#### Scenario: Selected state
- **WHEN** node is selected
- **THEN** it uses `.dcn-node--selected` class with accent border and shadow

#### Scenario: Hover state
- **WHEN** node is hovered
- **THEN** it uses `.dcn-node--hover` class with subtle highlight

#### Scenario: Error state
- **WHEN** node has execution error
- **THEN** it uses `.dcn-node--error` class with red border and error icon

#### Scenario: Running state
- **WHEN** node is executing
- **THEN** it uses `.dcn-node--running` class with pulsing animation

---

### Requirement: Port Type Color Variables
The system SHALL define CSS variables for port type colors.

#### Scenario: Image port color
- **WHEN** image-type port is rendered
- **THEN** it uses `--port-image` color (blue `#3B82F6`)

#### Scenario: Mask port color
- **WHEN** mask-type port is rendered
- **THEN** it uses `--port-mask` color (green `#22C55E`)

#### Scenario: Number port color
- **WHEN** number-type port is rendered
- **THEN** it uses `--port-number` color (orange `#F97316`)

#### Scenario: Boolean port color
- **WHEN** boolean-type port is rendered
- **THEN** it uses `--port-boolean` color (purple `#A855F7`)

#### Scenario: String port color
- **WHEN** string-type port is rendered
- **THEN** it uses `--port-string` color (gray-blue `#6B7280`)

#### Scenario: File port color
- **WHEN** file-type port is rendered
- **THEN** it uses `--port-file` color (pink `#EC4899`)

---

### Requirement: Group Node Styles
The system SHALL provide CSS classes for the node grouping feature.

#### Scenario: Group container
- **WHEN** group is rendered
- **THEN** it uses `.dcn-group` class with rounded rectangle background and dashed border

#### Scenario: Group header
- **WHEN** group header is rendered
- **THEN** it uses `.dcn-group-header` class with editable label and collapse toggle

#### Scenario: Group body
- **WHEN** group body is rendered
- **THEN** it uses `.dcn-group-body` class containing grouped nodes

---

### Requirement: Context Menu Styles
The system SHALL provide CSS classes for the node context menu.

#### Scenario: Context menu container
- **WHEN** context menu is rendered
- **THEN** it uses `.dcn-context-menu` class with correct positioning, background, shadow, and border-radius

#### Scenario: Context menu item
- **WHEN** context menu item is rendered
- **THEN** it uses `.dcn-context-menu-item` class with correct padding and hover state
