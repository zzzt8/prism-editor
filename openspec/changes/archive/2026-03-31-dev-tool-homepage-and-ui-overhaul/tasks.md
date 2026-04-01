## 1. Storage Layer Foundation

- [x] 1.1 Extend `WorkflowMeta` type in `@prism/shared-types` to include `status: 'draft' | 'published'`, `createdAt: string`, `updatedAt: string`, `description?: string`, `category?: string`, `icon?: string`
- [x] 1.2 Add `createWorkflow(name: string, description?: string, category?: string): Promise<{ meta: WorkflowMeta; content: Workflow }>` method to `LocalStorageAdapter`
- [x] 1.3 Add `deleteWorkflow(id: string): Promise<void>` method to `LocalStorageAdapter` that removes both `prism:workflow:{id}` and `prism:meta:{id}`, and removes `id` from `prism:workflows` index
- [x] 1.4 Add `updateWorkflowMeta(id: string, patch: Partial<WorkflowMeta>): Promise<void>` method to `LocalStorageAdapter` for updating status and timestamps without touching content
- [x] 1.5 Implement automatic migration in `LocalStorageAdapter` constructor: detect legacy flat storage, generate extended `WorkflowMeta` for each existing workflow, write to `prism:meta:{id}`, set `prism:migration:1 = 'done'` flag. Migration MUST be idempotent.
- [x] 1.6 Write unit tests for `LocalStorageAdapter` covering: `createWorkflow`, `deleteWorkflow`, `updateWorkflowMeta`, `listWorkflows` sorted order, and migration idempotency

---

## 2. App State Machine & Auto-Save

- [x] 2.1 Create `appStore.ts` in `apps/dev-tool/src/store/` with Zustand store: `{ view: 'workflows' | 'editor', currentWorkflowId: string | null, leftPanelOpen: boolean, rightPanelOpen: boolean }` and actions: `navigateToHome()`, `navigateToEditor(workflowId: string)`, `toggleLeftPanel()`, `toggleRightPanel()`
- [x] 2.2 Update `App.tsx` to consume `appStore` instead of local `useState` for `leftVisible`/`rightVisible` and remove the `App`-level panel visibility state
- [x] 2.3 Remove `DevToolLayout` prop drilling — `DevToolLayout` receives panel visibility from `appStore` directly via Zustand selector
- [x] 2.4 Ensure `canvasStore.isDirty` and `canvasStore.workflowMeta` are wired so that `WorkflowHeader` can read them from the store (not as props)
- [x] 2.5 **Debounced auto-save:** In `canvasStore`, implement `autoSaveDebounceMs = 1500`. Add a private debounce ref. Every action that sets `isDirty = true` resets the debounce timer. When the timer fires, call `localStorageAdapter.saveWorkflow(workflowMeta.id, toWorkflow())` silently, then set `isDirty = false`. On `loadWorkflow`, cancel any pending auto-save. No explicit Save button exists in the UI.
- [x] 2.6 Test: fresh load shows homepage, clicking a workflow navigates to editor, clicking Home in top bar returns to homepage. Auto-save fires 1.5s after last change, badge transitions DRAFT → SAVED.

---

## 3. Homepage — WorkflowsView

- [x] 3.1 Create `WorkflowsView.tsx` in `apps/dev-tool/src/components/` with layout matching the prototype: dark background `#0e0e12`, sticky top bar with logo and user avatar, main content area with max-width `max-w-6xl`, centered
- [x] 3.2 Implement workflow list: call `localStorageAdapter.listWorkflows()` on mount and store in local state, render each as a row with icon (from `icon` field, default to `Layers`), name, description, status badge (amber "Draft" / emerald "Published"), updated time, and `...` context menu trigger
- [x] 3.3 Implement toolbar: search input (filters by name, case-insensitive), Status dropdown (All / Draft / Published), Sort dropdown (Recent / Name / Status), list/grid view toggle buttons, "New Workflow" button (accent color `#b1a1ff`)
- [x] 3.4 Implement context menu: click `...` opens dropdown with "Open" and "Delete" options. Open navigates to editor. Delete shows confirmation dialog then calls `deleteWorkflow(id)` and removes row from list
- [x] 3.5 Implement empty state: when `listWorkflows()` returns empty, show centered empty state with "创建你的第一个工作流" prompt and "New Workflow" button
- [x] 3.6 Implement pagination: show "Showing X of Y" footer and Prev/Next pagination controls matching prototype style
- [x] 3.7 Connect "New Workflow" button to open `NewWorkflowModal`
- [x] 3.8 Connect workflow row click to `appStore.navigateToEditor(workflow.id)` and load the workflow content via `loadWorkflow(id)` into `canvasStore`
- [x] 3.9 Test: homepage lists all workflows, search filters correctly, status filter works, sort changes order, delete removes from list and storage, clicking a row opens editor with that workflow

---

## 4. NewWorkflowModal

- [x] 4.1 Create `NewWorkflowModal.tsx` in `apps/dev-tool/src/components/` matching the prototype's visual style: centered modal with backdrop blur, rounded corners, correct typography and spacing
- [x] 4.2 Implement two-option card selection: "New Blank Workflow" (pre-selected, highlighted border `#b1a1ff`) and "Start from Template" (placeholder for future, hover effect only)
- [x] 4.3 Implement form fields: workflow name (required, focused on open), category dropdown (Uncategorized / Data Pipeline / Infrastructure), target environment dropdown (Staging / Production / Development), description textarea
- [x] 4.4 Implement Create button: on click, call `localStorageAdapter.createWorkflow(name, description, category)`, then `appStore.navigateToEditor(newMeta.id)`, then close modal. Disable button if name is empty.
- [x] 4.5 Implement close: X button, backdrop click, and Escape key all close the modal without creating
- [x] 4.6 Test: modal opens on "New Workflow" click, form validation works, create navigates to editor with new workflow, close dismisses modal without side effects

---

## 5. WorkflowHeader Redesign

- [x] 5.1 Rewrite `WorkflowHeader.tsx` to the prototype three-zone layout: left zone (breadcrumb + save state), center zone (PanelToggle), right zone (Execute + Publish). Use `position: fixed`, `height: 48px`, `background: #18181b`, `border-bottom: 1px solid #27272a`.
- [x] 5.2 Left zone: back arrow button (`ChevronLeft` icon) + Prism logo + "/" + workflow name as clickable breadcrumb + save state badge (green dot + "SAVED" when `!isDirty`, amber dot + "DRAFT" when `isDirty`)
- [x] 5.3 Left zone: breadcrumb click triggers `appStore.navigateToHome()`. If `isDirty`, show `window.confirm('当前工作流有未保存的更改，是否离开？')` before navigating.
- [x] 5.4 Create `PanelToggle.tsx` component: three buttons in a pill-shaped container (`bg-[#18181b] rounded-md p-0.5 border border-[#27272a]`). Active button has `bg-[#27272a]`. "节点" toggles `appStore.leftPanelOpen`, "Home" calls `appStore.navigateToHome()`, "属性" toggles `appStore.rightPanelOpen`. Buttons use `PanelLeft`, `Home`, `PanelRight` icons.
- [x] 5.5 Right zone: "Execute" button with `Play`/`Loader2`/`CheckCircle2`/`XCircle` states (re-use existing `executeWorkflow`/`cancelExecution` handlers). "Publish" button with `Loader2`/`CheckCircle2` states (re-use existing publish handler). "Import JSON" icon button (FileUp from lucide) that opens a file picker and calls `importWorkflowFromFile`, replacing the old "打开" button. Settings and User icon buttons as placeholders on far right.
- [x] 5.6 Remove old buttons from `WorkflowHeader`: "新建", "打开", "导入", "导出", "执行", "发布", left/right panel toggle buttons. No "保存" button exists in the new design — auto-save is the only save mechanism.
- [x] 5.7 Remove `WorkflowHeaderProps` interface and prop drilling — all state read from stores directly
- [x] 5.8 Test: top bar renders all three zones, breadcrumb navigates home with dirty confirmation, panel toggle opens/closes panels, Execute/Publish retain existing behavior

---

## 6. NodePanel Enhancements

- [x] 6.1 Replace static category rendering in `NodePanel.tsx` with collapsible state map: `Record<string, boolean>` tracking `collapsed` per category, initialized to `false` (all expanded)
- [x] 6.2 Add CSS `max-height` transition on category content: `max-height: 0; opacity: 0` when collapsed → `max-height: 400px; opacity: 1` when expanded, with `transition: max-height 200ms ease, opacity 200ms ease`
- [x] 6.3 Rotate chevron icon based on `collapsed` state: down (`-rotate-90`) when collapsed, up when expanded
- [x] 6.4 Add `CATEGORY_LABELS` entry: `'custom': '自定义'`. Filter and render registered custom nodes under this category only if the `custom` array is non-empty
- [x] 6.5 Append footer section to `NodePanel.tsx` below the scrollable category list: "Add Custom Node" button (full width, `bg-[#18181b]`), "Settings" and "Support" as small text links side by side, version number `VX.X.X` (read from a constant)
- [x] 6.6 Add Custom Node button: on click, show a toast "自定义节点功能即将推出" (use existing toast system)
- [x] 6.7 Test: categories expand/collapse with animation, chevron rotates correctly, footer is always visible at bottom regardless of scroll, Add Custom Node shows toast

---

## 7. Inspector Footer Actions

- [x] 7.1 In `Inspector/index.tsx`, add a fixed footer div below the tab content: `bg-[#18181b] border-t border-[#27272a]`, height ~48px, `p-3 flex gap-2`
- [x] 7.2 Render footer only when `selectedNodeIds.length === 1`, otherwise render nothing
- [x] 7.3 Left button ("Reset"): `flex-1 py-2 rounded-md bg-[#27272a]/50 hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#e4e4e7] text-[11px] font-medium`. On click: read `selectedNode.definition?.params[].default`, call `updateNodeParams(nodeId, { ...defaults })`, set `isDirty = true`
- [x] 7.4 Right button ("Apply Changes"): `flex-1 py-2 rounded-md bg-[#8b80d1]/15 hover:bg-[#8b80d1]/25 text-[11px] font-medium text-[#b4a9f5] border border-[#8b80d1]/20`. On click: show success toast "已应用更改"
- [x] 7.5 Test: footer appears only when one node selected, Reset restores default param values, Apply shows toast, footer not visible when no nodes or multiple nodes selected

---

## 8. Canvas Drag Feedback

- [x] 8.1 In `WorkflowCanvas.tsx`, add local state `isDraggingNode: boolean` initialized to `false`
- [x] 8.2 In the existing `onDragOver` handler, detect if `event.dataTransfer.types.includes('application/prism-node-type')` — if true, set `isDraggingNode = true`
- [x] 8.3 Add `onDragLeave` and `onDrop` handlers to reset `isDraggingNode = false`
- [x] 8.4 Add overlay JSX inside the canvas container div (outside ReactFlow, with `pointer-events-none`): conditional on `isDraggingNode`. Overlay: `absolute inset-0 border-2 border-dashed border-[#8b80d1]/40 bg-[#8b80d1]/5 z-20 m-4 rounded-xl flex items-center justify-center`. Inner label: `bg-[#18181b] px-4 py-2 rounded-md border border-[#8b80d1]/30 text-[#8b80d1] font-medium text-xs tracking-wider uppercase shadow-sm` with text "Drop to create node"
- [x] 8.5 Add CSS class `canvas-drag-overlay-active` that changes the canvas container background to `#131316` when `isDraggingNode === true`
- [x] 8.6 Test: dragging a node card over the canvas shows the overlay and darker background, moving out hides the overlay, dropping creates the node and hides the overlay

---

## 9. Integration and Polish

- [x] 9.1 Update `App.tsx` composition: conditionally render `WorkflowsView` when `appStore.view === 'workflows'`, otherwise render the editor layout (WorkflowHeader + NodePanel + WorkflowCanvas + Inspector). Pass `onNewWorkflow={() => setIsModalOpen(true)}` to WorkflowsView.
- [x] 9.2 Place `NewWorkflowModal` outside the conditional render so it overlays both views when open
- [x] 9.3 Ensure `canvasStore.loadWorkflow(workflow)` is called when navigating to editor (from both homepage click and new workflow creation)
- [x] 9.4 Ensure `canvasStore.isDirty` is reset to `false` after `loadWorkflow` completes
- [x] 9.5 Ensure `canvasStore.newWorkflow()` is called when creating a new blank workflow (in `NewWorkflowModal` onCreate)
- [x] 9.6 Update the canvas store's `workflowMeta` after loading a workflow from the adapter so that `WorkflowHeader` shows the correct workflow name
- [x] 9.7 Run full integration test: open app → homepage shows → click New Workflow → modal opens → create "Test Workflow" → editor opens with empty canvas → add a node → dirty indicator shows → click Home → confirm dialog appears → confirm → back at homepage with new workflow in list
- [x] 9.8 Run full integration test: homepage → click existing workflow → editor loads correct content → modify a node → dirty shows → click Home → confirm → back at homepage (workflow still in list, content saved)
- [x] 9.9 Test localStorage migration: clear all prism:* keys except one old-style workflow → refresh app → homepage shows the migrated workflow with complete metadata
