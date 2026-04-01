## ADDED Requirements

### Requirement: Collapsible node categories with animation

The NodePanel SHALL display node categories in a collapsible list. Each category header is clickable and toggles the visibility of its child node cards. Categories that are collapsed SHALL animate closed (200ms ease), and expanded categories SHALL animate open.

#### Scenario: Category collapses on click
- **WHEN** user clicks a category header that is currently expanded
- **THEN** the category's node cards animate closed (max-height transition to 0) and the chevron icon rotates to point down

#### Scenario: Category expands on click
- **WHEN** user clicks a category header that is currently collapsed
- **THEN** the category's node cards animate open and the chevron icon rotates to point up

#### Scenario: All categories start expanded
- **WHEN** the NodePanel first renders
- **THEN** all category groups are in the expanded state

---

### Requirement: Custom nodes rendered in dedicated category

Custom user-defined nodes SHALL appear in a separate `custom` category with the label `'自定义'`. If no custom nodes are registered, this category SHALL NOT be rendered.

#### Scenario: Custom category hidden when empty
- **WHEN** no custom nodes have been registered
- **THEN** the "自定义" category is not shown in the NodePanel

---

### Requirement: NodePanel footer section

The NodePanel SHALL have a fixed footer section containing: an "Add Custom Node" button, a "Settings" link, a "Support" link, and the current version number displayed as `VX.X.X`.

#### Scenario: Footer is always visible at bottom of panel
- **WHEN** the NodePanel renders
- **THEN** the footer section is always visible at the bottom of the panel, regardless of scroll position
- **AND** the content above scrolls independently

#### Scenario: Add Custom Node shows placeholder toast in v1
- **WHEN** user clicks "Add Custom Node" button
- **THEN** a toast notification appears with message "自定义节点功能即将推出" (Coming soon)

#### Scenario: Settings and Support links are clickable
- **WHEN** user clicks "Settings" in the footer
- **THEN** the system navigates to or focuses the Settings panel
- **WHEN** user clicks "Support" in the footer
- **THEN** a link to documentation or support is opened

---

### Requirement: Node card drag initiates node creation

Each node card in the NodePanel SHALL be draggable. Dragging a node card from the panel and dropping it on the canvas SHALL create a new node of that type at the drop position.

#### Scenario: Dragging a node card shows grab cursor
- **WHEN** user hovers over a node card
- **THEN** the cursor changes to `grab`

#### Scenario: Dropping a node card creates a node
- **WHEN** user drags a node card from the panel and drops it on the canvas
- **THEN** a new node of the dragged type is created at the drop position and added to `canvasStore.nodes`
