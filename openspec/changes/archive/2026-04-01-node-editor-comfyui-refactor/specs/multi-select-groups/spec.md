## ADDED Requirements

### Requirement: Multi-Select with Ctrl
The system SHALL allow selecting multiple nodes using Ctrl + click.

#### Scenario: Ctrl+click adds to selection
- **WHEN** user Ctrl+clicks on a node that is not selected
- **THEN** that node is added to `selectedNodeIds`

#### Scenario: Ctrl+click removes from selection
- **WHEN** user Ctrl+clicks on a node that is already selected
- **THEN** that node is removed from `selectedNodeIds`

#### Scenario: Multi-selection shows visual highlight
- **WHEN** multiple nodes are selected
- **THEN** each selected node applies `.dcn-node--selected` styling

#### Scenario: Drag on multi-selection moves all nodes
- **WHEN** user drags on any selected node in a multi-selection
- **THEN** all selected nodes move together maintaining relative positions

---

### Requirement: Group Creation via Keyboard
The system SHALL allow creating a group from selected nodes using the G key.

#### Scenario: G key creates group
- **WHEN** user presses G while multiple nodes are selected
- **THEN** `addGroup(label, nodeIds)` is called in canvasStore
- **AND** a new group is created containing those nodes

#### Scenario: G key does nothing with single selection
- **WHEN** user presses G while only one node is selected
- **THEN** no group is created

#### Scenario: G key does nothing without selection
- **WHEN** user presses G with no nodes selected
- **THEN** no group is created

---

### Requirement: Group Node Rendering
The system SHALL render groups as rectangular containers around their member nodes.

#### Scenario: Group renders as container
- **WHEN** group is rendered
- **THEN** it appears as a rounded rectangle background behind its member nodes

#### Scenario: Group has editable header
- **WHEN** group header is rendered
- **THEN** it displays the group label
- **AND** label can be edited by double-clicking

#### Scenario: Group header drag moves all members
- **WHEN** user drags the group header
- **THEN** all member nodes translate by the same delta
- **AND** group position updates accordingly

---

### Requirement: Group Operations
The system SHALL provide CRUD operations for groups.

#### Scenario: Remove group
- **WHEN** `removeGroup(groupId)` is called
- **THEN** the group is removed from `groups`
- **AND** member nodes are not deleted

#### Scenario: Update group label
- **WHEN** `updateGroup(groupId, { label: 'new label' })` is called
- **THEN** the group's label is updated

#### Scenario: Add nodes to existing group
- **WHEN** user moves a node into a group area
- **THEN** the node's groupId is updated in the node's data

#### Scenario: Remove node from group
- **WHEN** user moves a node out of a group area
- **THEN** the node's groupId is cleared
