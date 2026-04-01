## ADDED Requirements

### Requirement: Port Type Color Mapping
The system SHALL provide a complete mapping from PortDataType to color values.

#### Scenario: IMAGE type color
- **WHEN** port has type `IMAGE` or `'image'`
- **THEN** port handle and label use color blue `#3B82F6`

#### Scenario: MASK type color
- **WHEN** port has type `MASK` or `'mask'`
- **THEN** port handle and label use color green `#22C55E`

#### Scenario: NUMBER type color
- **WHEN** port has type `NUMBER` or `'number'`
- **THEN** port handle and label use color orange `#F97316`

#### Scenario: BOOLEAN type color
- **WHEN** port has type `BOOLEAN` or `'boolean'`
- **THEN** port handle and label use color purple `#A855F7`

#### Scenario: STRING type color
- **WHEN** port has type `STRING` or `'string'`
- **THEN** port handle and label use color gray-blue `#6B7280`

#### Scenario: FILE type color
- **WHEN** port has type `FILE` or `'file'`
- **THEN** port handle and label use color pink `#EC4899`

---

### Requirement: Edge Color Based on Port Type
The system SHALL color edges based on the source port's data type.

#### Scenario: Edge uses source port color
- **WHEN** an edge connects source node output to target node input
- **THEN** the edge stroke color matches the source port's type color

#### Scenario: Edge between image ports
- **WHEN** edge connects `image`-type source to `image`-type target
- **THEN** edge stroke is blue `#3B82F6`

#### Scenario: Edge between mask ports
- **WHEN** edge connects `mask`-type source to `mask`-type target
- **THEN** edge stroke is green `#22C55E`

---

### Requirement: Edge Hover Highlight
The system SHALL highlight edges on hover.

#### Scenario: Hover increases opacity
- **WHEN** edge is hovered
- **THEN** edge opacity increases from 0.6 to 1.0

#### Scenario: Hover increases stroke width
- **WHEN** edge is hovered
- **THEN** edge stroke-width increases from 2px to 3px

---

### Requirement: Edge Selected Highlight
The system SHALL highlight selected edges.

#### Scenario: Selected edge styling
- **WHEN** edge is selected (in `selectedEdgeIds`)
- **THEN** edge uses accent color highlight
- **AND** stroke-width increases to 3px
