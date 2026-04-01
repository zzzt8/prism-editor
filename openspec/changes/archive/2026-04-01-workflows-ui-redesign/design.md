# Design: Workflows UI Redesign

## Context

The Workflows homepage (`WorkflowsView.tsx`) and New Workflow modal (`NewWorkflowModal.tsx`) are the entry points for all users. The current UI has three core problems:

1. **Visual noise**: Timestamps, descriptions, and status badges compete visually with the most important element — the workflow name.
2. **Spacing inconsistency**: The toolbar is overcrowded (5 controls in one row), Hero margins are too large, and Modal label-input pairs are visually disconnected.
3. **Flat interaction feedback**: Hover states barely change, the "More" button is always visible, and card selection uses a jarring border-width jump.

All styling lives in `global.css` with some co-located `<style>` blocks in TSX files. No design token system exists yet — colors and radii are hard-coded.

## Goals / Non-Goals

**Goals:**
- Establish a clear three-tier information hierarchy across all pages
- Reduce visual density in toolbar; elevate primary CTA out of toolbar
- Introduce consistent interaction feedback (hover → accent, progressive reveal)
- Build a CSS custom property system for colors/radii that can support a future light theme

**Non-Goals:**
- Changing any data model, API, or storage behavior
- Implementing the grid view toggle (List/Grid) — leave it disabled/hidden
- Redesigning the DevTool editor canvas area (outside scope)
- Accessibility audit (future separate change)

## Decisions

### D1: Hero Section → Unified PageHeader

**Decision**: Merge the Hero section (40px top margin, large H1) into a compact PageHeader bar alongside the New Workflow button.

**Rationale**: The Hero pattern works for marketing pages but wastes vertical space on a tool. Linear collapses title + primary action into one bar. This saves ~60px of wasted space per page load.

**Alternatives considered**:
- Keep Hero as-is with a larger H1 — wastes space, no benefit
- Hide title entirely and rely on breadcrumb — too minimal for a homepage

---

### D2: Toolbar Split Layout (Search left, Controls right)

**Decision**: The toolbar separates into two zones — Search takes the left with `flex: 1`, all auxiliary controls (Status, Sort, View toggle) right-align.

**Rationale**: A single-row toolbar with 5 controls has no breathing room. Splitting into two zones creates clear scan lines: "I want to find something" (left) vs "I want to filter/sort" (right). The New Workflow button moves up into the PageHeader, removing one control from the toolbar entirely.

**Alternatives considered**:
- Toolbar wraps to two lines on narrow viewports — fragile, requires responsive breakpoints
- Keep all 5 inline — still too dense even with the fix

---

### D3: Three-Tier Row Hierarchy (L1/L2/L3)

**Decision**: The workflow row uses three visual tiers:
- **L1 (Name)**: 13px, weight 600, `#f4f4f5`. Hover → `#a855f7`
- **L2 (Status)**: 11px, weight 600, uppercase, status color (green/yellow/gray), no background
- **L3 (Time + Description)**: 12px, weight 400, `#71717a`, secondary to the eye

**Rationale**: Users scan for workflow names first. The current design gives names and timestamps nearly equal visual weight. Stripping the status badge background and moving time/description to a muted tertiary tier lets the name command attention.

**Alternatives considered**:
- Italicize description — adds visual noise without hierarchy clarity
- Hide description entirely on short rows — removes useful context

---

### D4: Progressive Action Reveal for "More" Button

**Decision**: The `⋮` More button defaults to `opacity: 0.4` and transitions to `opacity: 1.0` on row hover.

**Rationale**: Showing all action affordances all the time creates visual clutter. Progressive disclosure (the button "emerges" on hover) follows Norman's visibility principle — the action is there when needed, invisible when not.

**Alternatives considered**:
- Context menu on right-click only — power-user friendly but discoverability suffers
- Always visible — chosen for accessibility; keep as-is

---

### D5: Label-Input Connection via `margin-bottom` Not `gap`

**Decision**: In the Modal form, use `margin-bottom: 4px` on labels rather than `gap: 6px` between label and input wrapper.

**Rationale**: `gap` creates space that separates the label from what it labels. `margin-bottom` anchors the label to the top of the input, making the association unambiguous. This follows the "label sits on the input" principle from form design heuristics.

**Alternatives considered**:
- Use `display: flex; flex-direction: column; gap: 4px` — equivalent in effect, but explicit margin is clearer in CSS cascade

---

### D6: CSS Custom Properties for Design Tokens

**Decision**: Establish a token system in `global.css` under `:root` for all color/radius decisions. Hard-coded values remain for cases where they serve as intentional constants (e.g., `#09090b` page background).

**Rationale**: The current UI is dark-only. A token system future-proofs for a light theme and makes cross-component consistency easier to maintain. Tokens cover: text colors, background layers, border colors, border radii, accent colors.

**Token coverage**:
- `--text-primary/secondary/muted`
- `--bg-base/surface/elevated`
- `--border-subtle/default`
- `--accent` + `--accent-muted`
- `--radius-sm/md/lg/xl`

**Alternatives considered**:
- Use CSS-in-JS or styled-components — adds runtime dependency; CSS custom properties are native and zero-cost
- Full tokenization of every color — over-engineered for a single-page refactor; tokenize where reuse exists

---

## Risks / Trade-offs

- **[Risk] Hard-coded values in component styles**: Some inline `style={{}}` attributes and TSX-adjacent `<style>` blocks use pixel values. These need a one-time audit pass to migrate to CSS variables.
  → **Mitigation**: Do the audit in the same tasks pass; document all remaining hard-coded values.

- **[Risk] View toggle (Grid/List) is non-functional**: The `≡ ▤` toggle exists in the toolbar but Grid view is not implemented. Keeping it visible may confuse users.
  → **Mitigation**: Hide the toggle with `opacity: 0.3; pointer-events: none` until Grid view is implemented, or remove it entirely from this change.

- **[Risk] Changes to CSS cascade**: Global CSS changes can affect other components that share the same classes (e.g., `.home-workflow-row` could conflict with editor canvas rows).
  → **Mitigation**: Ensure all class names are scoped to the `home-*` prefix; verify no cascade into canvas area.

- **[Trade-off] Removing status badge backgrounds**: The badge backgrounds were the clearest signal of workflow state at a glance. Removing them makes status slightly less scannable for users unfamiliar with the tool.
  → **Mitigation**: Status color is still present (green/yellow/gray text) and the badge remains uppercase for quick recognition. User testing would validate this trade-off.

---

## Open Questions

1. **Grid view**: Should it be hidden or disabled with a tooltip ("Coming soon") during this change?
2. **Column resize**: The current row allocates a fixed 128px for the timestamp column. Long names may overlap. Should we implement a flexible layout that pushes time to a second line?
3. **Language**: The empty state mixes Chinese ("创建你的第一个工作流") and English. Should this change normalize to a single language, or is bilingual intentional?
