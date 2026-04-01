## ADDED Requirements

### Requirement: Canvas shows overlay when dragging a node from panel

When the user is dragging a node card from the NodePanel over the canvas area, the canvas SHALL display a visual overlay indicating that a node can be dropped to create it.

#### Scenario: Overlay appears on drag over canvas
- **WHEN** user starts dragging a node card from the NodePanel
- **AND** moves the mouse over the canvas area
- **THEN** the canvas background color changes to a darker shade (`#131316`)
- **AND** a dashed border overlay appears around the canvas area
- **AND** a "Drop to create node" label is displayed centered on the canvas

#### Scenario: Overlay disappears when drag leaves canvas
- **WHEN** the user moves the mouse outside the canvas area while dragging
- **THEN** the overlay disappears and the canvas background returns to normal

#### Scenario: Overlay disappears on drop
- **WHEN** the user drops the node on the canvas
- **THEN** the overlay disappears and a new node is created at the drop position

---

### Requirement: Drag overlay is non-interactive

The canvas drag overlay SHALL NOT block mouse events from reaching the canvas or React Flow. The overlay SHALL have `pointer-events: none` so that the canvas can still detect the drop position.

#### Scenario: Drop position is detected through overlay
- **WHEN** the drag overlay is visible
- **AND** user drops the node on the canvas
- **THEN** the exact mouse position within the canvas is used as the new node's position
- **AND** the node is placed at the correct canvas coordinates

---

### Requirement: Overlay matches prototype visual style

The drag overlay SHALL use the prototype's visual style: semi-transparent dark background (`bg-[#131316]/80` or `bg-[#8b80d1]/5`), dashed border in the accent color (`border-2 border-dashed border-[#8b80d1]/40`), centered label with the prototype font and color.

#### Scenario: Overlay styling matches prototype
- **WHEN** the drag overlay is rendered
- **THEN** it has the exact background color, dashed border style, border color, and centered label matching the prototype design
