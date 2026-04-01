## ADDED Requirements

### Requirement: Context Menu Trigger
The system SHALL show a context menu when user right-clicks on a node.

#### Scenario: Right-click shows menu at cursor
- **WHEN** user right-clicks on a node
- **THEN** context menu appears at cursor position
- **AND** menu contains options for that node

#### Scenario: Click outside closes menu
- **WHEN** user clicks outside the context menu
- **THEN** the menu is closed

#### Scenario: Menu closes on action
- **WHEN** user selects a menu action
- **THEN** the menu is closed after the action executes

---

### Requirement: Context Menu Actions
The system SHALL provide standard actions in the node context menu.

#### Scenario: Rename action
- **WHEN** user clicks "重命名" (Rename)
- **THEN** node alias becomes editable
- **AND** menu closes

#### Scenario: Duplicate action
- **WHEN** user clicks "复制" (Duplicate)
- **THEN** a clone of the node is added to the canvas at an offset position
- **AND** menu closes

#### Scenario: Cut action
- **WHEN** user clicks "剪切" (Cut)
- **THEN** node is copied to clipboard
- **AND** original node is deleted
- **AND** menu closes

#### Scenario: Paste action
- **WHEN** user clicks "粘贴" (Paste) with clipboard content
- **THEN** clipboard content is cloned at mouse position
- **AND** menu closes

#### Scenario: Pin action
- **WHEN** user clicks "固定" (Pin)
- **THEN** node's `pinned` flag is set to true
- **AND** node cannot be moved by dragging
- **AND** menu closes

#### Scenario: Bypass action
- **WHEN** user clicks "Bypass"
- **THEN** node's `bypassed` flag is set to true
- **AND** executor skips processing and passes inputs through to outputs
- **AND** menu closes

#### Scenario: Minimize action
- **WHEN** user clicks "最小化" (Minimize)
- **THEN** node's `minimized` flag is set to true
- **AND** node renders as title-only
- **AND** menu closes

#### Scenario: Delete action
- **WHEN** user clicks "删除" (Delete)
- **THEN** the node is removed
- **AND** all connected edges are also removed
- **AND** menu closes

#### Scenario: Node Info action
- **WHEN** user clicks "节点信息" (Node Info)
- **THEN** the node is selected
- **AND** Inspector switches to "Info" tab
- **AND** menu closes
