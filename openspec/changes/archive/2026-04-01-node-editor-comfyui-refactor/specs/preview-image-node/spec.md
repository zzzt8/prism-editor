## ADDED Requirements

### Requirement: PreviewImage Node Registration
The system SHALL register the PreviewImage node definition and executor.

#### Scenario: Node definition registered
- **WHEN** node definitions are loaded
- **THEN** `preview-image` node is registered with: type `preview-image`, category `io`, label "Preview Image"

#### Scenario: Node definition has image input and output
- **WHEN** `previewImageDefinition` is defined
- **THEN** it has one image input port (id: `image`)
- **AND** it has one image output port (id: `image`, passes through input)

#### Scenario: Executor registered
- **WHEN** executors are registered
- **THEN** `preview-image` executor is registered

---

### Requirement: PreviewImage Executor Behavior
The PreviewImage executor SHALL pass through the image input and generate a preview URL.

#### Scenario: Executor reads image input
- **WHEN** `previewImageExecutor` is called with `inputs: { image: ImageRuntimeObject }`
- **THEN** it reads `inputs.image`

#### Scenario: Executor generates previewUrl
- **WHEN** executor processes the image
- **THEN** it generates a `previewUrl` from the image data
- **AND** it passes the image through to output

#### Scenario: Executor output structure
- **WHEN** executor completes
- **THEN** output is `{ image: ImageRuntimeObject, previewUrl: string }`
- **AND** output `image` matches input `image` (same data, width, height)

---

### Requirement: PreviewImage Node UI
The PreviewImage node SHALL display a large image preview with resolution label.

#### Scenario: Node body is large preview area
- **WHEN** PreviewImage node renders
- **THEN** body consists of a large image preview area
- **AND** resolution label below the preview

#### Scenario: Preview shows input image
- **WHEN** PreviewImage has input connection with image data
- **THEN** preview area displays the image

#### Scenario: Preview resizes with node
- **WHEN** user resizes the PreviewImage node
- **THEN** preview area scales to fit the new node size
- **AND** image uses `object-fit: contain` to maintain aspect ratio

#### Scenario: PreviewImage ports
- **WHEN** PreviewImage node renders
- **THEN** it has image input port (left, blue)
- **AND** it has image output port (right, blue)

---

### Requirement: PreviewImage Node in NodePanel
The system SHALL make the PreviewImage node available in the NodePanel.

#### Scenario: Node appears in panel
- **WHEN** NodePanel renders
- **THEN** PreviewImage node appears in the "io" category
- **AND** it can be dragged onto the canvas
