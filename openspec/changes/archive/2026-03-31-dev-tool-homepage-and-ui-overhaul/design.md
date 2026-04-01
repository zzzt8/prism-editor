## Context

### Current State

The dev-tool has a functional editor but lacks a homepage and multi-workflow management layer. The `LocalStorageAdapter` already uses a three-key storage scheme (`workflow:`, `meta:`, `workflows` index), but `WorkflowMeta` stored at `prism:meta:{id}` is incomplete — it only contains `{ id, name, version }` from `workflowMeta` in `canvasStore`. Missing fields include `status`, `createdAt`, `updatedAt`, `description`, `category`, and `icon`.

The `App.tsx` boots directly into the editor with no ability to list, create, or switch between workflows. All workflow operations (new, save, load, import/export) are bundled into `WorkflowHeader` as buttons with no navigation concept.

The existing UI components have well-defined responsibilities:
- `canvasStore` (Zustand) owns all canvas state
- `LocalStorageAdapter` owns persistence via three keys
- `WorkflowHeader` owns workflow-level actions
- `NodePanel` renders draggable `NodeDefinition` cards from `@prism/node-definitions`
- `Inspector` handles parameter editing, settings, and info display

### Constraints

- **No new npm dependencies** — must use existing stack (Zustand, React Flow, lucide-react, `@prism/node-definitions`, `@prism/shared-types`)
- **PrismNode visual model is preserved** — ComfyUI-style embedded ports remain the standard node renderer. `WebhookNode` is deprecated and will be absorbed into the `NodeDefinition` registry
- **Backward compatibility** — existing localStorage data must be migrated automatically on first launch
- **Incremental implementation** — the change is large and should be broken into ordered, independently testable phases

---

## Goals / Non-Goals

**Goals:**
- Introduce a homepage (WorkflowsView) as the app entry point, listing all saved workflows with metadata
- Extend `WorkflowMeta` and the storage adapter to support full CRUD on workflow metadata and content separately
- Adopt the prototype's top bar design for the editor while keeping PrismNode and Inspector behavior from the current system
- Add NodePanel enhancements (collapsible categories, version display, Add Custom Node) and Inspector footer actions (Reset/Apply)
- Add canvas drag-drop visual feedback consistent with the prototype
- Implement NewWorkflowModal for creating new workflows

**Non-Goals:**
- Routing library — keep `App.tsx` state machine (no URL-based routing)
- Template workflows — UI placeholder only, not wired up in v1
- Copy/duplicate workflow — deferred to v2
- User authentication — out of scope
- Changes to node execution engine or port data type system
- Migrating WebhookNode to PrismNode — this belongs to the node-editor-comfyui-refactor change

---

## Decisions

### 1. Storage: Extend existing three-key scheme, add `status` field

**Decision:** Keep the existing three-key localStorage layout (`prism:workflow:{id}`, `prism:meta:{id}`, `prism:workflows`) and extend the stored metadata object to include the new fields.

**Rationale:** The adapter already handles index listing, save, load, and delete cleanly. Re-using the same keys avoids migration of the index itself. Only the metadata objects stored at `prism:meta:{id}` need extension — the `Workflow` objects stored at `prism:workflow:{id}` remain unchanged.

**Extended `WorkflowMeta` shape:**

```typescript
interface WorkflowMeta {
  id: string;
  name: string;
  version: string;
  status: 'draft' | 'published';       // new
  createdAt: string;                   // new: ISO date string
  updatedAt: string;                   // new: ISO date string
  description?: string;                // new
  category?: string;                   // new
  icon?: string;                      // new: lucide icon name
}
```

The existing `canvasStore.workflowMeta` remains `{ id, name, version }` — it is the editor's in-memory, lightweight reference. Full `WorkflowMeta` is read from the adapter only when needed (e.g., on the homepage).

**Alternative considered:** Separate `workflow-index` key (array of full `WorkflowMeta` objects) + `workflow:{id}` key (canvas content only). Rejected because it doubles the number of storage keys and requires rewriting the adapter's `list()` method from scratch.

### 2. App routing: Zustand state machine (no router)

**Decision:** Upgrade `App.tsx` from `useState<'workflows' | 'editor'>` to a typed `AppState` structure managed via a dedicated `appStore` (Zustand), not a URL-based router.

**AppState:**

```typescript
interface AppState {
  view: 'workflows' | 'editor';
  currentWorkflowId: string | null;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
}
```

**Rationale:** No router library exists in the project, and adding one is disproportionate for a two-view app. State-based routing is sufficient and avoids browser history complexity.

**Navigation rules:**
- From editor, clicking "Home" in the top bar center set: `view = 'workflows'`, `currentWorkflowId = null`
- From homepage, clicking a workflow: `view = 'editor'`, `currentWorkflowId = '<id>'`
- Dirty workflow on navigation: `confirm('当前工作流有未保存的更改，是否离开？')` — if confirmed, discard changes and navigate; if cancelled, stay

**Alternative considered:** URL routes (`/` and `/editor/:id`). Rejected; adds dependency and complexity disproportionate to the use case.

### 3. Editor top bar: Adopt prototype design wholesale

**Decision:** Rewrite `WorkflowHeader` to match the prototype's top bar structure exactly.

**New structure:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ [←] [Prism Logo] / [workflowName] [SAVED/DRAFT badge]  │
│                           [节点][Home][属性]   │  [Execute][Publish][Settings][User] │
└──────────────────────────────────────────────────────────────────────┘
```

**Implementation notes:**
- The left section (`←` + breadcrumb) replaces the current `WorkflowHeader` content. `WorkflowHeader` receives no props from `App` — it reads `workflowMeta` and `isDirty` from `canvasStore` directly
- The center tri-state toggle (`节点 | Home | 属性`) is a new component `PanelToggle` that controls `appStore.leftPanelOpen` and `appStore.rightPanelOpen`. When `leftPanelOpen` is true, "节点" is highlighted; when `rightPanelOpen` is true, "属性" is highlighted; "Home" always navigates to the homepage
- The right section (`Execute` + `Publish`) retains the existing handlers from the current `WorkflowHeader`. The existing "Save", "New", "Open", "Import", "Export" buttons are removed — they are either handled by `NewWorkflowModal` (New) or moved elsewhere (Save is implicit via auto-save or toolbar)
- The save behavior: `isDirty` flag tracks changes; `SAVED` badge appears when `!isDirty`; explicit save button is removed from the top bar (save is triggered by navigating away or a dedicated toolbar button)

**Alternative considered:** Keep existing `WorkflowHeader` buttons and add the prototype elements alongside. Rejected — the current header is already cramped and mixing paradigms creates visual conflict.

### 4. NodePanel enhancements: Collapsible categories + footer

**Decision:** Wrap existing `CategoryGroup` render logic in an animated collapsible container and add a footer section with version info and action buttons.

**Changes to `NodePanel.tsx`:**
- Replace static `CategoryGroup[]` rendering with a map that tracks `collapsed` state per category
- Each category header click toggles `collapsed` state with CSS `max-height` transition (0 → content height, 200ms ease)
- Add `CATEGORY_LABELS` entry for `custom`: `'自定义'` — registered custom nodes render under this category
- Footer section appended below the scrollable node list:
  ```
  ┌────────────────────────────────┐
  │  Add Custom Node               │
  │  Settings          Support     │
  │  V1.2.0                       │
  └────────────────────────────────┘
  ```

**Alternative considered:** A dedicated "Node Library" panel component. Rejected — `NodePanel.tsx` already owns this rendering; extending it in place is simpler and avoids creating new file boundaries.

### 5. Inspector footer: Add Reset / Apply Changes buttons

**Decision:** Add a fixed footer to `Inspector/index.tsx` with two buttons: "Reset" (reverts all param changes for the selected node) and "Apply Changes" (commits and shows confirmation).

**Implementation:**
- The footer renders only when a single node is selected (`selectedNodeIds.length === 1`)
- "Reset" reads the node's `definition?.params` defaults and calls `updateNodeParams` to restore them
- "Apply Changes" is currently a no-op in the prototype but provides UX affordance; in v1 it logs or shows a toast. Its real effect (auto-apply on every param change) is already the current behavior
- Styling: full-width split layout matching the prototype's `bg-[#18181b]` footer with `border-t border-[#27272a]`

**Alternative considered:** Apply-on-blur (apply changes when user clicks away from a field). This is already the current behavior — the button is purely cosmetic affordance for users who expect a commit gesture.

### 6. Canvas drag feedback: Overlay component in WorkflowCanvas

**Decision:** Extend the existing `WorkflowCanvas.tsx` to add a drag overlay component, triggered when `dataTransfer` contains `'application/prism-node-type'`.

**Implementation:**
- `WorkflowCanvas` already receives `onDragOver` events. Add a local state `isDraggingNode` that becomes `true` when `event.dataTransfer.types.includes('application/prism-node-type')` during `onDragOver`, and `false` on `onDragLeave` or `onDrop`
- Render a fixed-position overlay div inside the canvas container (outside React Flow, above the canvas):
  ```tsx
  {isDraggingNode && (
    <div className="canvas-drag-overlay">
      <span>Drop to create node</span>
    </div>
  )}
  ```
- CSS: dark semi-transparent background (`bg-[#131316]/80`), dashed border (`border-2 border-dashed border-[#8b80d1]/40`), centered text label, `pointer-events-none`

**Alternative considered:** Use React Flow's built-in `DragOverlay`. Rejected — `DragOverlay` is for dragging existing nodes within the canvas, not for the initial drag-from-panel-to-canvas gesture. The `isDraggingNode` state approach is simpler and matches the prototype exactly.

### 7. WebhookNode: Absorb into NodeDefinition registry

**Decision:** `WebhookNode.tsx` is removed. Its behavior is expressed as a `NodeDefinition` registered via `@prism/node-definitions` and rendered by the existing `PrismNode` renderer.

**The NodeDefinition:**

```typescript
const webhookDefinition: NodeDefinition = {
  type: 'webhook',
  label: 'Webhook Trigger',
  category: 'input',
  inputs: [
    { id: 'image', name: 'image', type: 'image', dataType: 'Image' },
  ],
  outputs: [
    { id: 'out', name: 'out', type: 'any', dataType: 'Any' },
  ],
  params: [
    { id: 'method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
    { id: 'retryCount', type: 'number', min: 0, max: 10, default: 3 },
    { id: 'secureMode', type: 'boolean', default: true },
  ],
};
```

This is a **deferred task** — it belongs to the node-editor-comfyui-refactor change, not this one. This change only removes the `WebhookNode.tsx` import from `EditorView.tsx` (if present) and marks the file for future deletion.

---

## Data Migration Plan

On first launch after this change, existing localStorage data must be migrated automatically:

```
Step 1: On app init, check localStorage for any key matching 'prism:workflow:*'
Step 2: If 'prism:workflows' (index) does not exist:
         a. Read all existing workflow keys
         b. For each workflow, read its meta (or derive from the workflow object)
         c. Create 'prism:workflows' index array
         d. For each workflow, write extended WorkflowMeta to 'prism:meta:{id}'
            with status: 'draft', createdAt: metadata.createdAt, updatedAt: metadata.updatedAt
Step 3: Mark migration as done (localStorage key 'prism:migration:1')
```

This runs synchronously on app startup, is idempotent (safe to re-run), and is invisible to the user.

---

## Open Questions

All open questions have been resolved:

1. **Auto-save:** v1 adopts **debounced auto-save with status feedback** — no explicit Save button. `isDirty` starts `false`, every canvas change sets it `true` and resets a 1.5-second debounce timer; when the timer fires, `saveWorkflow` runs silently and `isDirty` becomes `false` with the badge switching to SAVED. This is a "防抖自动保存 + 状态提示" model.

2. **"Open" workflow:** The "Open" action is **repurposed as Import JSON** — a file picker that calls `importWorkflowFromFile`. The homepage becomes the primary navigation surface; no "Open" button that returns to homepage.

3. **NodePanel version number:** v1 reads from a **project constant** (`APPS_DEV_TOOL_VERSION` in a `src/constants.ts` file). Future upgrade to build-time injection (`process.env.npm_package_version`) is deferred.

4. **Inspector Settings tab:** **Extend, not replace.** The existing `SettingsPanel` content (bypass, minimize, pin, node alias) is preserved. The prototype's settings fields are added alongside, not in place of.

5. **"Add Custom Node" button:** v1 is a **placeholder** — clicking shows a toast "Coming soon" and does nothing else.
