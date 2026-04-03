## ADDED Requirements

### Requirement: Execution status uses consistent status color variables

The user-app execution status indicators SHALL use dedicated `--ua-status-*` CSS custom properties, defined in the `:root` block of `global.css`, ensuring consistent coloring across the run page status display.

#### Scenario: Ready/idle state uses neutral gray
- **WHEN** the workflow is loaded and ready to run
- **THEN** the status indicator uses `--ua-status-idle` (`#71717a`)
- **AND** this applies to any idle/ready state display (badge, dot, or text)

#### Scenario: Running state uses indigo with pulse animation
- **WHEN** the workflow is currently executing
- **THEN** the status indicator uses `--ua-status-running` (`#818cf8`)
- **AND** if a pulsing dot animation is used, the opacity oscillates between 1.0 and 0.3 at 1s intervals

#### Scenario: Done/success state uses green
- **WHEN** the workflow execution completes successfully
- **THEN** the status indicator uses `--ua-status-done` (`#22c55e`)
- **AND** this applies to the success summary badge, check icon, and any done-state indicators

#### Scenario: Error state uses red
- **WHEN** the workflow execution fails or errors
- **THEN** the status indicator uses `--ua-status-error` (`#ef4444`)
- **AND** this applies to error badges, error summary states, and any error-state indicators

### Requirement: Status color variables do not conflict with dev-tool node-status variables

The user-app `--ua-status-*` variables SHALL use a separate namespace from dev-tool's `--node-status-*` variables, preventing cross-app style bleed.

#### Scenario: Status variables use ua-prefix in user-app
- **WHEN** a developer inspects `apps/user-app/src/styles/global.css`
- **THEN** the status color variables appear as `--ua-status-idle`, `--ua-status-running`, `--ua-status-done`, `--ua-status-error`
- **AND** no `--node-status-*` variables are defined in user-app's global.css

### Requirement: Status colors map to existing semantic color tokens where possible

The `--ua-status-*` variable values SHALL reuse existing `--ua-*` semantic tokens where the values align (e.g., `--ua-status-done` uses the same green as `--ua-success`).

#### Scenario: Status colors reuse semantic tokens
- **WHEN** `--ua-status-done` is defined in global.css
- **THEN** its value is `#22c55e` (same as `--ua-success`)
- **AND** `--ua-status-error` value is `#ef4444` (same as `--ua-error`)
- **AND** this avoids introducing duplicate color values for the same semantic meaning
