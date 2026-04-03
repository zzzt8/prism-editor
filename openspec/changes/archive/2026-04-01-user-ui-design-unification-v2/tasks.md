## 1. CSS Variables Setup

- [x] 1.1 Add `--ua-slider-*` variables to `:root` (track height 4px, thumb size 14px, thumb bg = --ua-accent, thumb border = --ua-surface)
- [x] 1.2 Add `--ua-type-*` variables to `:root` (image=#8b5cf6, mask=#22c55e, text=#94a3b8) with rgba background variants
- [x] 1.3 Add `--ua-status-*` variables to `:root` (idle=#71717a, running=#818cf8, done=#22c55e, error=#ef4444) reusing existing --ua-success/--ua-error

## 2. Slider Widget Styling

- [x] 2.1 Replace `.ua-param-slider` with custom track styling (4px height, --ua-surface-3 bg, 2px --ua-border, rounded 2px)
- [x] 2.2 Add `-webkit-slider-thumb` custom thumb (14px circle, --ua-accent bg, 2px --ua-surface border)
- [x] 2.3 Add thumb hover effect (scale 1.15 + box-shadow glow with rgba accent)
- [x] 2.4 Add `-moz-range-thumb` equivalent styles for Firefox compatibility
- [x] 2.5 Add `@supports` fallback using native `accent-color` for unsupported browsers

## 3. Select Widget Styling

- [x] 3.1 Hide browser-default dropdown arrow with `appearance: none` and `-webkit-appearance: none`
- [x] 3.2 Add inline SVG chevron-down arrow via `background-image` data URI (color: #a1a1aa)
- [x] 3.3 Add `:hover` border color change to `--ua-accent`
- [x] 3.4 Add `:focus` border + `box-shadow` glow (2px rgba accent) matching input focus style

## 4. Input Focus Glow

- [x] 4.1 Add `box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2)` to `.ua-input:focus`
- [x] 4.2 Add `transition: border-color 0.15s, box-shadow 0.15s` to `.ua-input`

## 5. Type Badge Colors

- [x] 5.1 Update `.ua-input-type-badge` to use `--ua-type-*` variables for IMAGE type
- [x] 5.2 Update `.ua-input-type-badge` to use `--ua-type-*` variables for MASK type
- [x] 5.3 Update `.ua-input-type-badge` to use `--ua-type-*` variables for TEXT/string type
- [x] 5.4 Add default fallback style for unrecognized types using `--ua-text-muted`

## 6. Status Color Variables

- [x] 6.1 Update execution status summary badge to use `--ua-status-done` (green)
- [x] 6.2 Update execution error summary badge to use `--ua-status-error` (red)
- [x] 6.3 Verify running state uses `--ua-status-running` (indigo)
- [x] 6.4 Verify ready/idle state uses `--ua-status-idle` (gray)

## 7. Documentation Update

- [x] 7.1 Update `apps/user-app/docs/ui-guidelines.md` color system table to include new `--ua-type-*` and `--ua-status-*` variables
- [x] 7.2 Update component specs section to reflect new slider and select widget behavior
- [x] 7.3 Add note in "禁止事项" clarifying that node/port visual elements remain exclusive to dev-tool
