## ADDED Requirements

### Requirement: Type badge colors align with dev-tool port type colors

The user-app input type badge colors SHALL use the same hex values as dev-tool's port type colors for semantically equivalent types (IMAGE, MASK, TEXT), ensuring a consistent visual language across both apps.

#### Scenario: IMAGE type badge uses #8b5cf6
- **WHEN** a workflow input field has `dataType: "image"` or `dataType: "IMAGE"`
- **THEN** the type badge color is `#8b5cf6`
- **AND** the badge background is `rgba(139, 92, 246, 0.15)`
- **AND** the badge border is `rgba(139, 92, 246, 0.3)`

#### Scenario: MASK type badge uses #22c55e
- **WHEN** a workflow input field has `dataType: "mask"` or `dataType: "MASK"`
- **THEN** the type badge color is `#22c55e`
- **AND** the badge background is `rgba(34, 197, 94, 0.15)`
- **AND** the badge border is `rgba(34, 197, 94, 0.3)`

#### Scenario: TEXT type badge uses #94a3b8
- **WHEN** a workflow input field has `dataType: "string"` or `dataType: "TEXT"`
- **THEN** the type badge color is `#94a3b8`
- **AND** the badge background is `rgba(148, 163, 184, 0.15)`
- **AND** the badge border is `rgba(148, 163, 184, 0.3)`

#### Scenario: Default type badge falls back to muted color
- **WHEN** a workflow input field has an unrecognized or unspecified dataType
- **THEN** the type badge color falls back to `--ua-text-muted`
- **AND** the badge background is `rgba(122, 122, 138, 0.15)`
- **AND** the badge border is `rgba(122, 122, 138, 0.3)`

### Requirement: CSS variables for type colors are exposed in :root

The type badge color values SHALL be exposed as CSS custom properties in the `:root` block of `global.css`, allowing them to be used consistently across all components without hardcoding hex values.

#### Scenario: Type color variables exist in :root
- **WHEN** any CSS rule references `--ua-type-image`, `--ua-type-mask`, or `--ua-type-text`
- **THEN** these variables resolve to their defined hex values from the `:root` block
- **AND** the variables follow the naming pattern `--ua-type-<typename>`
