## ADDED Requirements

### Requirement: Top bar adopts prototype layout exactly

The editor's top bar (WorkflowHeader) SHALL be visually redesigned to match the prototype. The bar is fixed at the top of the screen, height 48px, with a dark background (`#18181b`), a bottom border (`#27272a`). The bar is divided into three zones: left zone (breadcrumb + save state), center zone (tri-state panel toggle), right zone (action buttons).

#### Scenario: Top bar renders all three zones
- **WHEN** the editor view is active
- **THEN** the top bar displays: left zone with back arrow + logo + breadcrumb path, center zone with three toggle buttons, right zone with Execute and Publish buttons
- **AND** the top bar has the exact visual style (background color, border, height, font sizes) matching the prototype

---

### Requirement: Left zone: breadcrumb + save state badge

The left zone SHALL display: a back arrow button (clicking navigates to homepage, with dirty confirmation), the app logo and name, a forward slash separator, the current workflow name (from `canvasStore.workflowMeta.name`), and a status badge.

#### Scenario: Save state badge shows SAVED when clean
- **WHEN** `canvasStore.isDirty === false`
- **THEN** the badge shows a green dot + "SAVED" label in the prototype style

#### Scenario: Save state badge shows DRAFT when dirty
- **WHEN** `canvasStore.isDirty === true`
- **THEN** the badge shows a different color (amber) + "DRAFT" label

#### Scenario: Breadcrumb click navigates home
- **WHEN** user clicks the back arrow or the workflow name in the breadcrumb
- **THEN** the system navigates to the homepage (with dirty confirmation if applicable)

---

### Requirement: Center zone: tri-state panel toggle

The center zone SHALL contain three icon-text buttons: "节点" (toggles left panel), "Home" (navigates to homepage), "属性" (toggles right panel). Only one of "节点" and "属性" can be active at a time — they are panel toggles. "Home" is always clickable.

#### Scenario: Panel toggle activates left panel
- **WHEN** user clicks "节点" button
- **THEN** the NodePanel becomes visible (left panel open)

#### Scenario: Panel toggle activates right panel
- **WHEN** user clicks "属性" button
- **THEN** the Inspector becomes visible (right panel open)

#### Scenario: Panel toggle inactivates other panel
- **WHEN** left panel is open and user clicks "属性"
- **THEN** left panel closes and right panel opens

---

### Requirement: Right zone: Execute and Publish buttons

The right zone SHALL contain: an "Execute" button (shows loading spinner during execution, green check on success, red X on error) and a "Publish" button (shows loading spinner during publishing, changes to green on success). Both buttons retain their existing handlers from the current WorkflowHeader.

#### Scenario: Execute button shows success state
- **WHEN** workflow execution completes successfully
- **THEN** the Execute button briefly shows a green check icon + "Success" text, then returns to normal

#### Scenario: Execute button shows error state
- **WHEN** workflow execution fails
- **THEN** the Execute button briefly shows a red X icon + "Failed" text, then returns to normal

#### Scenario: Publish button shows loading then success
- **WHEN** user clicks Publish and publishing starts
- **THEN** the button shows a spinner + "Publishing..."
- **WHEN** publishing completes
- **THEN** the button turns green and shows "Published"

---

### Requirement: Top bar responsive to viewport

The top bar SHALL use `position: fixed` with `z-index` higher than all other elements. The center zone SHALL be absolutely centered horizontally within the bar regardless of the left and right content widths.

#### Scenario: Top bar stays fixed on scroll
- **WHEN** the page is scrolled
- **THEN** the top bar remains at the top of the viewport and does not scroll away
