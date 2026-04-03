## ADDED Requirements

### Requirement: Slider widget adopts DCN-style thumb with hover glow

The user-app slider widget SHALL replace the native `accent-color` implementation with a custom-styled thumb matching dev-tool's `.dcn-input-slider` behavior: a 14px circular thumb in `--ua-accent` color with 2px border matching `--ua-surface` background, achieving a "pill on track" effect.

#### Scenario: Slider thumb displays with correct styling on load
- **WHEN** a page containing a slider parameter loads
- **THEN** the slider track renders with 4px height, `--ua-surface-3` background, 2px border `--ua-border`, rounded 2px
- **AND** the slider thumb renders as a 14px circle at `--ua-accent` color with 2px `--ua-surface` border

#### Scenario: Slider thumb scales and glows on hover
- **WHEN** the user hovers over the slider thumb
- **THEN** the thumb scales to 1.15x with `transform: scale(1.15)`
- **AND** a glow effect appears: `box-shadow: 0 0 6px rgba(99, 102, 241, 0.5)`
- **AND** the transition duration is 0.1s

#### Scenario: Slider degrades gracefully on Firefox
- **WHEN** the slider renders on a Firefox browser
- **THEN** the `-moz-range-thumb` style matches the webkit appearance (14px circle, accent color, 2px surface border)
- **AND** the slider thumb scales on hover per the webkit behavior

### Requirement: Select widget includes embedded SVG chevron arrow

The user-app select widget SHALL display an inline SVG chevron-down arrow within its right padding area, matching dev-tool's `.dcn-select` arrow implementation, replacing the browser-default dropdown indicator.

#### Scenario: Select shows SVG arrow on all platforms
- **WHEN** a select dropdown is rendered
- **THEN** the browser-default arrow is hidden via `appearance: none` and `-webkit-appearance: none`
- **AND** an inline SVG chevron arrow appears at `right: 8px` center
- **AND** the arrow color is `--ua-text-muted` (#7a7a8a)

#### Scenario: Select focus shows accent border and glow
- **WHEN** the user focuses a select widget
- **THEN** the border color changes to `--ua-accent`
- **AND** a 2px accent glow appears: `box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2)`

### Requirement: Text input widget adds focus glow on focus

The user-app text input widget SHALL add a subtle accent-colored glow on focus, in addition to the existing border color change.

#### Scenario: Input shows glow on focus
- **WHEN** the user focuses a text input field
- **THEN** the border color changes to `--ua-accent` (existing behavior)
- **AND** a glow effect appears: `box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2)`
- **AND** the transition duration is 0.15s

### Requirement: All widget transitions use consistent timing

All interactive state transitions on slider, select, and input widgets SHALL use 0.1–0.15s ease timing to feel responsive without being jarring.

#### Scenario: Widget transitions feel responsive
- **WHEN** the user interacts with any slider, select, or input widget
- **THEN** all color, border, and box-shadow changes animate at 0.1s–0.15s with `ease` timing
- **AND** scale transformations use 0.1s timing

### Requirement: CSS variables use `--ua-*` namespace, not `--dcn-*`

All new CSS custom properties introduced by this change SHALL use the `--ua-*` prefix to maintain naming consistency with the existing user-app design token system.

#### Scenario: New variables use ua-prefix namespace
- **WHEN** a developer inspects `apps/user-app/src/styles/global.css`
- **THEN** all slider-related variables appear as `--ua-slider-*`
- **AND** all input-related variables appear as `--ua-input-*`
- **AND** no `--dcn-*` variables are introduced in user-app

### Requirement: Browser fallback via @supports for accent-color

Slider styling SHALL use `@supports (not (appearance: none))` to provide a graceful fallback to native `accent-color` styling on browsers that do not support `appearance: none`.

#### Scenario: Browser without appearance support falls back to accent-color
- **WHEN** the slider renders on a browser that does not support `appearance: none`
- **THEN** the native `accent-color: var(--ua-accent)` applies as fallback
- **AND** the custom thumb styling does not break the layout
