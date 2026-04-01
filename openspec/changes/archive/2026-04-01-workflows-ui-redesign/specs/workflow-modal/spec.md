# Spec: workflow-modal

## ADDED Requirements

### Requirement: Modal label sits directly above its input field

The form label SHALL be placed with `margin-bottom: 4px` relative to the input below it. The label SHALL NOT use a gap-based layout that creates equal space on all sides. The label text SHALL be 12px, non-uppercase, color `#a1a1aa`. Required field asterisks SHALL appear inline to the right of the label text with color `#a78bfa`.

#### Scenario: Label appears directly above input

- **WHEN** a form field with a label renders in the modal
- **THEN** the label text sits 4px above the top edge of the input field

#### Scenario: Required asterisk is soft purple

- **WHEN** a required label renders in the modal
- **THEN** the asterisk character renders in `#a78bfa` color

### Requirement: Card selection has smooth border-width transition

Each card in the card selection grid SHALL transition its border from 1px to 2px when selected. The transition duration SHALL be 120ms. The selected card SHALL also display a subtle brand glow shadow `box-shadow: 0 0 12px rgba(168, 85, 247, 0.25)`.

#### Scenario: Card border transitions smoothly on selection

- **WHEN** the user selects a card
- **THEN** the border transitions from 1px to 2px over 120ms without a visible jump

#### Scenario: Selected card has brand glow

- **WHEN** a card is in the selected state
- **THEN** it has a `box-shadow: 0 0 12px rgba(168, 85, 247, 0.25)` glow effect

### Requirement: Modal footer distributes hint and actions across horizontal axis

The modal footer SHALL use `justify-content: space-between` to place the privacy hint text on the left and the action buttons on the right. The hint icon and text SHALL remain on a single line, vertically centered.

#### Scenario: Footer hint is left-aligned, buttons right-aligned

- **WHEN** the modal footer renders
- **THEN** the privacy hint text appears on the left and Cancel/Create buttons appear on the right

### Requirement: Step guide text precedes card selection

The modal body SHALL display a guidance sentence "What would you like to start with?" in 14px, color `#a1a1aa`, font-weight 400, before the card selection grid.

#### Scenario: Guidance text appears above cards

- **WHEN** the modal body renders
- **THEN** the guidance text "What would you like to start with?" appears above the card grid

### Requirement: Create button is disabled when name is empty

The "Create Workflow" button SHALL remain disabled (`disabled` attribute) until the workflow name input contains at least one non-whitespace character.

#### Scenario: Create button disabled when name is empty

- **WHEN** the workflow name field is empty
- **THEN** the "Create Workflow" button has the `disabled` attribute

#### Scenario: Create button enabled when name is filled

- **WHEN** the user types at least one non-whitespace character in the name field
- **THEN** the "Create Workflow" button removes the `disabled` attribute
