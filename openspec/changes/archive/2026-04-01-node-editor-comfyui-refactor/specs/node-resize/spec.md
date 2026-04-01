## ADDED Requirements

### Requirement: Node Resize via Drag Handle
The system SHALL allow users to resize image nodes by dragging a resize handle.

#### Scenario: Resize handle appears on selection
- **WHEN** an image node (LoadImage, Transform, ApplyMask, Composite, PreviewImage) is selected
- **THEN** a resize handle appears in the bottom-right corner

#### Scenario: Resize handle disappears on deselection
- **WHEN** the selected image node is deselected
- **THEN** the resize handle disappears

#### Scenario: Dragging resize handle changes node size
- **WHEN** user drags the resize handle
- **THEN** node width and height change in real-time
- **AND** node position remains fixed

#### Scenario: Resize respects minimum size
- **WHEN** user attempts to resize below minimum
- **THEN** resize is clamped to minimum size (width: 200px, height: 120px)

#### Scenario: Resize respects maximum size
- **WHEN** user attempts to resize above maximum
- **THEN** resize is clamped to maximum size (width: 480px, height: 360px)

---

### Requirement: Image Preview Responsive to Node Size
The system SHALL make image preview area respond to node size changes.

#### Scenario: Preview uses object-fit contain
- **WHEN** image node body contains an image preview
- **THEN** the image uses `object-fit: contain` CSS property
- **AND** image maintains aspect ratio while fitting in container

#### Scenario: Preview area matches node body
- **WHEN** node is resized
- **THEN** the image preview area inside the body matches the new dimensions

---

### Requirement: Resizing Visual Feedback
The system SHALL provide visual feedback during resize operations.

#### Scenario: Resizing state styling
- **WHEN** user is actively dragging the resize handle
- **THEN** node applies `.dcn-node--resizing` CSS class
- **AND** node border highlights during resize

#### Scenario: Resize handle cursor
- **WHEN** user hovers over resize handle
- **THEN** cursor changes to `nwse-resize`
