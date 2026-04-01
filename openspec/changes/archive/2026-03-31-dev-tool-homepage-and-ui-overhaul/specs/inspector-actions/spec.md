## ADDED Requirements

### Requirement: Inspector footer with Reset and Apply buttons

The Inspector panel SHALL have a fixed footer section (height ~48px) containing two buttons: "Reset" (left half) and "Apply Changes" (right half). This footer SHALL be visible only when exactly one node is selected.

#### Scenario: Footer not shown when no node is selected
- **WHEN** no node is selected on the canvas
- **THEN** the Reset/Apply footer is NOT rendered

#### Scenario: Footer not shown when multiple nodes are selected
- **WHEN** more than one node is selected on the canvas
- **THEN** the Reset/Apply footer is NOT rendered

#### Scenario: Footer shown when exactly one node is selected
- **WHEN** exactly one node is selected on the canvas
- **THEN** the Reset/Apply footer IS rendered at the bottom of the Inspector panel

---

### Requirement: Reset button reverts parameter values

The Reset button SHALL revert all parameter values of the selected node to their `definition.params` defaults. It SHALL NOT revert the node's position, connections, or label.

#### Scenario: Reset restores parameter defaults
- **WHEN** user has changed one or more parameter values of the selected node
- **AND** user clicks "Reset"
- **THEN** all parameter values are restored to their `definition.params[].default` values
- **AND** `canvasStore.isDirty` is set to `true`

---

### Requirement: Apply Changes button provides commit affordance

The Apply Changes button SHALL provide visual feedback when clicked. Since parameters are auto-applied on every change in the current system, this button's primary function in v1 is to provide a commit gesture UX. It SHALL show a brief success toast "已应用更改" when clicked.

#### Scenario: Apply Changes shows success toast
- **WHEN** user clicks "Apply Changes"
- **THEN** a success toast appears with the message "已应用更改"
- **AND** the toast auto-dismisses after 2 seconds

---

### Requirement: Footer visually matches prototype

The footer SHALL use the same visual style as the prototype: `bg-[#18181b]` background, `border-t border-[#27272a]` top border. The Reset button SHALL have a ghost style (transparent background, text color `#a1a1aa`, hover brightens to `#e4e4e7`). The Apply Changes button SHALL have a subtle purple tint (`bg-[#8b80d1]/15`, text `#b4a9f5`, border `border-[#8b80d1]/20`).

#### Scenario: Footer styling matches prototype
- **WHEN** the inspector footer is rendered
- **THEN** it has the correct background color, border, button styles, and spacing matching the prototype design
