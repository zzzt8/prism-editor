# Proposal: Workflows UI Redesign

## Why

The Workflows homepage (`WorkflowsView`) and New Workflow modal (`NewWorkflowModal`) suffer from unclear visual hierarchy, inconsistent spacing, and weak interaction feedback. Secondary information (timestamps, descriptions) competes with primary information (workflow names). The toolbar is overcrowded, labels are disconnected from their inputs, and hover/selected states lack the polish expected of a professional tool. Addressing this now improves daily usability for power users.

## What Changes

- **Page structure**: Hero section merged into PageHeader; toolbar decoupled from content area
- **Toolbar**: Search input left-aligned (flex-grow), auxiliary controls right-aligned; New Workflow button elevated to PageHeader
- **Workflow row hierarchy**: Three-tier visual system (L1: name, L2: status badge, L3: timestamp + description); name turns brand-purple on hover
- **Status badge**: Remove background fill; pure text badge with status color, saves row space
- **More button (⋮)**: Defaults to `opacity: 0.4`, `opacity: 1` on row hover, reveals affordance progressively
- **Modal label-input connection**: Label sits directly above input with `margin-bottom: 4px`; label style normalized to 12px non-uppercase
- **Modal card hover/selected**: Border transitions smoothly from 1px to 2px; selected card gains brand glow shadow
- **Modal footer**: Hint text left-aligned, action buttons right-aligned, `justify-content: space-between`
- **Design token cleanup**: Establish named CSS custom properties (`--text-primary/secondary/muted`, `--bg-surface/elevated`, `--radius-sm/md/lg/xl`) for future light-mode compatibility

## Capabilities

### New Capabilities

- `workflow-list`: Redesigned list container with toolbar split layout and three-tier row hierarchy
- `workflow-row`: Individual row component with progressive action reveal (More button) and hover accent feedback
- `workflow-modal`: NewWorkflowModal with connected label-input form, guided card selection, and restructured footer
- `page-header`: Unified header bar combining page title, subtitle, and primary CTA
- `design-tokens`: CSS custom property system for colors, spacing, and border-radius

### Modified Capabilities

*(None — no existing specs exist for these components yet.)*

## Impact

- **Files changed**: `apps/dev-tool/src/styles/global.css`, `apps/dev-tool/src/components/WorkflowsView.tsx`, `apps/dev-tool/src/components/NewWorkflowModal.tsx`
- **New files**: Component-level CSS or co-located styles in the above TSX files
- **No API changes**: Pure UI refactor, no breaking changes
- **Dependencies**: None — all work is in the `dev-tool` app
