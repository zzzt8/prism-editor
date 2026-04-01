# Spec: design-tokens

## ADDED Requirements

### Requirement: Text color tokens are defined in global CSS

The following CSS custom properties SHALL be defined in `global.css` under `:root`:

| Token | Value | Purpose |
|-------|-------|---------|
| `--text-primary` | `#f4f4f5` | L1 primary text (names, headings) |
| `--text-secondary` | `#c4c4cc` | L2 secondary text (descriptions, subtitles) |
| `--text-muted` | `#71717a` | L3 muted text (timestamps, placeholders) |

#### Scenario: Text tokens are accessible in global CSS

- **WHEN** any component references `var(--text-primary)`
- **THEN** it resolves to `#f4f4f5`

### Requirement: Background color tokens are defined in global CSS

The following CSS custom properties SHALL be defined in `global.css` under `:root`:

| Token | Value | Purpose |
|-------|-------|---------|
| `--bg-base` | `#09090b` | Page background |
| `--bg-surface` | `#18181b` | Card and panel surfaces |
| `--bg-elevated` | `#27272a` | Hover and elevated surfaces |

#### Scenario: Background tokens are accessible in global CSS

- **WHEN** any component references `var(--bg-surface)`
- **THEN** it resolves to `#18181b`

### Requirement: Border radius tokens define a three-tier system

The following CSS custom properties SHALL be defined in `global.css` under `:root`:

| Token | Value | Purpose |
|-------|-------|---------|
| `--radius-sm` | `6px` | Buttons, inputs, selects |
| `--radius-md` | `8px` | Search boxes, dropdowns, card internals |
| `--radius-lg` | `12px` | List cards, modal internal blocks |
| `--radius-xl` | `16px` | Modal outer container |

#### Scenario: Radius tokens cover all component sizes

- **WHEN** a component uses `var(--radius-sm)` for a button
- **THEN** it resolves to `6px`

### Requirement: Accent color tokens are defined in global CSS

The following CSS custom properties SHALL be defined in `global.css` under `:root`:

| Token | Value | Purpose |
|-------|-------|---------|
| `--accent` | `#a855f7` | Brand purple — hover, focus, selected |
| `--accent-muted` | `rgba(168, 85, 247, 0.12)` | Brand purple at low opacity for backgrounds |

#### Scenario: Accent tokens are accessible in global CSS

- **WHEN** any component references `var(--accent)`
- **THEN** it resolves to `#a855f7`
