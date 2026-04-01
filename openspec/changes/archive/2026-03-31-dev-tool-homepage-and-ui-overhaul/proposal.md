## Why

The dev-tool currently has no homepage or multi-workflow management — users land directly in the editor with no way to list, create, or switch between workflows. The localStorage layer stores everything in a single flat structure, making workflow listing inefficient and the overall UX feel incomplete. Additionally, the editor's top bar, node panel, and inspector need polish borrowed from the AI Studio prototype while preserving the existing PrismNode/ComfyUI-style node rendering model.

## What Changes

- **New Homepage (WorkflowsView)** — A list view showing all workflows with name, description, status badge, and last-updated time. Search and filter toolbar. Entry point of the app.
- **NewWorkflowModal** — Dialog for creating a new blank workflow with name, category, and description fields.
- **Storage Layer Refactor** — Separate `workflow-index` (array of WorkflowMeta) from `workflow:{id}` (full canvas content). Enables O(1) homepage listing without loading every workflow individually.
- **App Routing State** — Upgrade `App.tsx` from a simple `'workflows' | 'editor'` boolean to a typed state machine with `currentWorkflowId`. Homepage becomes the entry point.
- **WorkflowHeader Overhaul** — Adopt the prototype's top bar design: left side = Logo + breadcrumb with workflow name + save state badge (SAVED/DRAFT); center = tri-state panel toggle (Node Library / Home / Inspector); right side = Execute + Publish + Import JSON + Settings + User. **No explicit Save button — debounced auto-save (1.5s) is the sole persistence mechanism.**
- **NodePanel Enhancements** — Collapsible categories with smooth animation, version number display, "Add Custom Node" button, and Settings/Support links at the bottom.
- **Inspector Bottom Actions** — Add Reset and Apply Changes buttons to the inspector's footer, matching the prototype.
- **Canvas Drag Feedback** — When dragging a node over the canvas, the background subtly darkens and a dashed border with "Drop to create node" overlay appears.
- **Editor ↔ Homepage Navigation** — The center Home button returns to the homepage. When the current workflow is dirty (unsaved), a confirmation prompt appears before navigating away.

## Capabilities

### New Capabilities

- `multi-workflow-management`: Homepage listing, creating, opening, and deleting workflows. WorkflowMeta includes id, name, version, status (draft/published), createdAt, updatedAt, description, category, and icon.
- `workflow-storage-layer`: Separation of workflow metadata index from workflow canvas content in localStorage. Supports CRUD operations on both layers. Includes migration logic for existing flat storage.
- `editor-topbar-redesign`: WorkflowHeader rebuilt to prototype spec: breadcrumb navigation, save state badge, tri-state panel toggle, and Execute/Publish buttons.
- `node-panel-enhancements`: Collapsible node categories with CSS max-height animation, version display, custom node entry point.
- `inspector-actions`: Reset and Apply Changes buttons in the inspector footer.
- `canvas-drag-feedback`: Visual overlay and background color shift when dragging a node over the canvas drop zone.

### Modified Capabilities

*(No existing specs to modify — all capabilities are new.)*

## Impact

- **New files**: `WorkflowsView.tsx`, `NewWorkflowModal.tsx`, `appStore.ts`, enhanced `WorkflowHeader.tsx` (redesigned), enhanced `NodePanel.tsx` (collapsible + footer), enhanced `Inspector/index.tsx` (footer actions), enhanced `WorkflowCanvas.tsx` (drag overlay), `src/constants.ts` (APP_VERSION).
- **Modified files**: `App.tsx` (state machine + conditional view rendering), `localStorageAdapter.ts` (extended WorkflowMeta, new CRUD methods, migration), `canvasStore.ts` (debounced auto-save, WorkflowMeta extension), `DevToolLayout.tsx` (consume appStore directly).
- **Dependencies**: No new npm dependencies. Uses existing Zustand, React Flow, lucide-react stack.
- **Data migration**: On first launch, existing flat workflow objects in localStorage are scanned and converted to the new extended `WorkflowMeta` format. Migration is idempotent and gated by `prism:migration:1` flag.
