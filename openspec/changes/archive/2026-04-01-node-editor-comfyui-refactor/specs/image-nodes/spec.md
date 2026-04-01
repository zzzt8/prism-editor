## ADDED Requirements

### Requirement: LoadImage Node Display
The LoadImage node SHALL display file selection, preview, and resolution.

#### Scenario: Empty LoadImage shows upload button
- **WHEN** LoadImage node renders with no image loaded
- **THEN** it displays an upload button prompting "选择图片"

#### Scenario: Loaded LoadImage shows preview
- **WHEN** LoadImage node renders with an image loaded
- **THEN** it displays the image preview in the body
- **AND** shows filename label
- **AND** shows resolution label (e.g., "1920 × 1080")

#### Scenario: LoadImage ports
- **WHEN** LoadImage node renders
- **THEN** it has no input ports on the left
- **AND** it has image (blue) and mask (green) output ports on the right

---

### Requirement: Transform Node Display
The Transform node SHALL display inline parameters and input resolution.

#### Scenario: Transform shows parameters inline
- **WHEN** Transform node renders
- **THEN** body displays inline: scale algorithm dropdown, width input, height input, crop toggle

#### Scenario: Transform shows input resolution
- **WHEN** Transform has an input connection
- **THEN** it displays the input image resolution next to the input port

#### Scenario: Transform ports
- **WHEN** Transform node renders
- **THEN** it has image input port (left, blue)
- **AND** it has image output port (right, blue)

---

### Requirement: ApplyMask Node Display
The ApplyMask node SHALL display inline parameters and input resolution.

#### Scenario: ApplyMask shows parameters inline
- **WHEN** ApplyMask node renders
- **THEN** body displays inline: mask type dropdown, threshold slider, invert toggle

#### Scenario: ApplyMask shows input resolution
- **WHEN** ApplyMask has input connections
- **THEN** it displays input image resolution

#### Scenario: ApplyMask ports
- **WHEN** ApplyMask node renders
- **THEN** it has image (blue) and mask (green) input ports (left)
- **AND** it has image output port (right, blue)

---

### Requirement: Composite Node Display
The Composite node SHALL display inline parameters.

#### Scenario: Composite shows parameters inline
- **WHEN** Composite node renders
- **THEN** body displays inline: blend mode dropdown, opacity slider with value display

#### Scenario: Composite ports
- **WHEN** Composite node renders with default definition
- **THEN** it has base (blue) and overlay (blue) input ports (left)
- **AND** it has image output port (right, blue)

#### Scenario: Composite dynamic extra inputs
- **WHEN** Composite has extra inputs from `data.extraInputs`
- **THEN** those ports appear in the left port column in addition to base/overlay

---

### Requirement: Export Node Display
The Export node SHALL display inline format parameters without preview.

#### Scenario: Export shows parameters inline
- **WHEN** Export node renders
- **THEN** body displays inline: format dropdown (PNG/JPEG/WebP), quality slider, output dimensions

#### Scenario: Export has no preview
- **WHEN** Export node renders
- **THEN** body does not contain image preview area

#### Scenario: Export ports
- **WHEN** Export node renders
- **THEN** it has image input port (left, blue)
- **AND** it has exported output port (right, pink/gray)

#### Scenario: Export triggers download
- **WHEN** user clicks on Export node body
- **THEN** the workflow executes and a file download is triggered
