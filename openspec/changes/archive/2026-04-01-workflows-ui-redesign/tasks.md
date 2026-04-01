# Tasks: Workflows UI Redesign

## 1. Design Tokens (CSS Custom Properties)

- [x] 1.1 Add `--text-primary`, `--text-secondary`, `--text-muted` tokens to `:root` in `global.css`
- [x] 1.2 Add `--bg-base`, `--bg-surface`, `--bg-elevated` tokens to `:root` in `global.css`
- [x] 1.3 Add `--accent`, `--accent-muted` tokens to `:root` in `global.css`
- [x] 1.4 Add `--radius-sm` (`6px`), `--radius-md` (`8px`), `--radius-lg` (`12px`), `--radius-xl` (`16px`) tokens to `:root` in `global.css`
- [x] 1.5 Audit existing hard-coded color values in `WorkflowsView` and `NewWorkflowModal` CSS; replace occurrences that match token values with CSS variable references

## 2. PageHeader Component

- [x] 2.1 Move the "New Workflow" button from inside the toolbar into the page header bar, right-aligned alongside the logo
- [x] 2.2 Remove the separate `home-hero` section wrapper from `WorkflowsView.tsx`; move the title and subtitle into the header
- [x] 2.3 Add subtitle text style using `--text-secondary` token
- [x] 2.4 Set header bar padding to `16px 24px`, vertically center all header children

## 3. Toolbar — Split Layout

- [x] 3.1 Refactor toolbar CSS: left zone (`flex: 1, max-width: 320px`) holds Search; right zone (`margin-left: auto`) holds Status, Sort, and hidden ViewToggle
- [x] 3.2 Update toolbar container: remove pill border-radius (`12px`); use `--bg-surface` for toolbar background; reduce padding to `8px`
- [x] 3.3 Style Search input with `--radius-md` (`8px`), `--bg-base` background, `--text-muted` placeholder
- [x] 3.4 Style Status and Sort dropdown buttons with `--radius-sm` (`6px`), `--bg-base` background
- [x] 3.5 Remove the `≡` List / `▤` Grid toggle buttons from the toolbar (keep hidden until grid view is implemented)
- [x] 3.6 Verify toolbar renders correctly at 1280px and 1440px viewport widths

## 4. Workflow Row — Visual Hierarchy

- [x] 4.1 Update `.home-workflow-name` CSS: 13px, font-weight 600, `--text-primary` color
- [x] 4.2 Add hover rule: `.home-workflow-row:hover .home-workflow-name` → `--accent` color, `transition: color 0.12s`
- [x] 4.3 Update `.home-workflow-desc` CSS: 12px, font-weight 400, `--text-muted` color
- [x] 4.4 Update `.home-workflow-time` CSS: 12px, font-weight 400, `--text-muted` color
- [x] 4.5 Remove `.home-workflow-icon` background color and simplify to icon-only with `--text-secondary` color

## 5. Workflow Row — Status Badge Refinement

- [x] 5.1 Remove background fill and border from `.home-status-badge`; keep only text color and 11px uppercase bold text
- [x] 5.2 Remove `.home-status-badge--draft` background and border declarations
- [x] 5.3 Remove `.home-status-badge--published` background and border declarations
- [x] 5.4 Update `--draft` color to `#f59e0b` (amber), `--published` color to `#22c55e` (green), applied as text color only
- [x] 5.5 Verify badge spacing and alignment in the row after removing background

## 6. Workflow Row — Progressive Action Reveal

- [x] 6.1 Set `.home-more-btn` default `opacity: 0.4`
- [x] 6.2 Add `.home-workflow-row:hover .home-more-btn` rule: `opacity: 1.0`, `transition: opacity 0.12s`
- [x] 6.3 Open context menu on More button click (already implemented, verify no regressions)

## 7. NewWorkflowModal — Form Layout

- [x] 7.1 Add step guide text "What would you like to start with?" above the card grid, 14px, `--text-secondary`, font-weight 400
- [x] 7.2 Refactor `.new-field` from `gap: 6px` flex column to `margin-bottom: 4px` on the label element
- [x] 7.3 Update `.new-label` CSS: 12px, non-uppercase, `--text-secondary` color, remove `text-transform: uppercase` and `letter-spacing`
- [x] 7.4 Update `.new-label-required` asterisk: `--accent` color (`#a78bfa`), 12px, inline with label
- [x] 7.5 Update `.new-input`, `.new-select`, `.new-textarea`: `--radius-sm` (`6px`) radius, `--bg-elevated` background
- [x] 7.6 Update input/textarea placeholder: `--text-muted` color (`#71717a`)
- [x] 7.7 Verify label-input alignment for the two-column row (Category + Target Environment on same line)

## 8. NewWorkflowModal — Card Selection

- [x] 8.1 Set unselected card: `border: 1px solid rgba(255,255,255,0.05)`, `background: #18181b`, `--radius-lg` (`12px`)
- [x] 8.2 Add hover rule on `.new-card:hover`: `background: #1f1f23`, `border-color: rgba(255,255,255,0.1)`
- [x] 8.3 Add selected state `.new-card--selected`: `border: 2px solid --accent`, `background: #27272a`, `box-shadow: 0 0 12px rgba(168, 85, 247, 0.25)`
- [x] 8.4 Add `transition: border-width 0.12s` to `.new-card` for smooth border-width jump from 1px to 2px

## 9. NewWorkflowModal — Footer

- [x] 9.1 Restructure footer layout: `display: flex`, `justify-content: space-between`, `align-items: center`
- [x] 9.2 Left side: info icon + hint text (`.new-footer-hint`), `--text-muted` color, 12px
- [x] 9.3 Right side: Cancel button (ghost, `--text-secondary`) + Create button (filled `--accent`, white text, `--radius-sm` `6px`)
- [x] 9.4 Ensure footer has `border-top: 1px solid rgba(255,255,255,0.05)` separator

## 10. EmptyState + Pagination

- [x] 10.1 Update empty state `.home-empty` layout: vertically center content, `gap: 16px`
- [x] 10.2 Style `.home-empty-title`: 18px, font-weight 700, `--text-primary`
- [x] 10.3 Style `.home-empty-subtitle`: 14px, `--text-secondary`, `max-width: 320px`, centered
- [x] 10.4 Style `.home-empty-btn`: filled `--accent` button with `--radius-sm` (`6px`)
- [x] 10.5 Update `.home-pagination-info`: font-size 11px, `--text-muted` color
- [x] 10.6 Update page number buttons with `--radius-sm` (`6px`)

## 11. Verify & Cleanup

- [x] 11.1 Verify all changes compile with no TypeScript or CSS errors
- [x] 11.2 Verify `DevToolLayout` and canvas area are not affected by global CSS changes (no cascade contamination)
- [x] 11.3 Take before/after screenshot of WorkflowsView homepage
- [x] 11.4 Take before/after screenshot of New Workflow modal
- [x] 11.5 Review Open Questions from `design.md` and close or defer them as appropriate
