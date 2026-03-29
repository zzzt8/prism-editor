## Context

The current `PublishDialog` component (`apps/dev-tool/src/components/header/PublishDialog.tsx`) grew organically and now contains several architectural problems:

1. **`buildPublishedInputs`** iterates every node's every port, producing `PublishedInput` entries keyed by `{index}:{portId}`. This leaks raw engine ports (Base, Overlay) as user-facing inputs, and the index is unstable across canvas edits.

2. **`buildPublishedOutputs`** similarly dumps every node's ports — including internal mid-graph nodes — rather than identifying final output nodes.

3. **Visibility toggle** is black-list: every param defaults to visible. The developer must manually hide every internal param, which is tedious and error-prone. The correct mental model is white-list: nothing is visible unless explicitly opted in.

4. **No explicit labels**: inputs and params have no developer-assigned user-facing name, making the user app show raw port/param IDs.

5. **`nodeTypes` / `nodeConfigs`** in the PublishedWorkflow use array indices (`"0"`, `"1"`) as keys, breaking when nodes are reordered or deleted. This was already partially fixed (nodeId-based keys) but the dialog still generates the wrong input/output ID format.

## Goals / Non-Goals

**Goals:**
- Auto-detect source nodes (no incoming edges, or `load-image` type) as Inputs.
- Auto-detect export/leaf nodes (no outgoing edges) as Outputs.
- All parameters default to hidden; developer explicitly white-lists desired params with user-facing labels.
- Each input/output/param has a required `label` field for the developer to name what the end user sees.
- Output nodes have an export format selector (PNG / JPEG / WebP).

**Non-Goals:**
- No drag-and-drop (keep it click-based for simplicity, per user feedback timeline).
- No changes to the underlying engine or executor (those are already fixed).
- No changes to the user app's rendering of inputs/outputs — only the data shape it receives.

## Decisions

### Decision 1: Auto-infer Inputs via graph traversal, not port enumeration

**Choice**: Detect source nodes (nodes with zero incoming edges, OR nodes of type `load-image`) and present exactly one entry per source node.

**Rationale**: The user-facing concept is "what images/text does the user provide?" not "which pipeline ports exist." A node may have multiple input ports, but from a UX perspective it's one logical input source. Merging multiple ports into one entry avoids confusing developers with implementation details.

**Alternative considered — enumerate all ports**: Rejected because it exposes Base/Overlay ports that are mid-graph connections, not user inputs.

### Decision 2: Auto-infer Outputs via graph traversal, prefer `export` type

**Choice**: Scan for `type === 'export'` nodes first, then fall back to leaf nodes (no outgoing edges). Present exactly one entry per detected output node with a format selector.

**Rationale**: The current code produces the "无可用输出端口" false negative because it checks `def.outputs` — which may be empty or contain internal ports. The graph topology is the source of truth.

**Alternative considered — enumerate all ports**: Same problem as inputs; exposes mid-graph outputs.

### Decision 3: White-list params with explicit opt-in

**Choice**: `visibility` map is empty by default (all hidden). Developer clicks `+ 添加向用户暴露的参数` to open a node-browser panel. For each checked param, a label field is required.

**Rationale**: White-list is the correct mental model for a publish interface. The developer knows what they want to expose; they should opt in rather than opt out. Default-visible leads to accidental exposure of internal implementation details.

**Alternative considered — keep black-list**: Already proven confusing; developer forgets to hide internal params, leaking them to users.

### Decision 4: PublishedConfig replaces PublishedInput[] / PublishedOutput[]

**Choice**: The publish dialog generates a `PublishedConfig` object with `inputs[]`, `exposedParams[]`, `outputs[]`. Each entry references a canvas `nodeId` (UUID). The existing `PublishedWorkflow` type is extended, not replaced, to remain backward-compatible.

**Rationale**: Clean separation between "what user provides" (inputs), "what user adjusts" (params), "what user receives" (outputs). The nodeId references are stable across re-publishes (UUIDs don't change when nodes are reordered).

**Alternative considered — keep existing PublishedInput/PublishedOutput arrays**: Already broken; IDs use array indices, not node IDs. Fixing the ID format in place would require a migration.

### Decision 5: Node-browser panel for param white-listing

**Choice**: Clicking `+ 添加向用户暴露的参数` opens a collapsible in-dialog panel listing all nodes with their params. Developer checks boxes; a label input appears inline for each checked param.

**Rationale**: Keeps all configuration in one modal rather than spawning sub-dialogs. Simpler to implement and use.

## Risks / Trade-offs

- **[Risk]** Developers may not understand which nodes are "source" nodes if the canvas has unusual topology. → **Mitigation**: Always show the node name (e.g., "Load Image") in the card so the developer can identify it visually.

- **[Risk]** White-list default hides ALL params, including ones developers expect to be visible (e.g., common settings). → **Mitigation**: Clear UI copy ("暂无对用户开放的参数 — 点击上方按钮添加") + sensible defaults can be added in a future iteration.

- **[Risk]** The new PublishedConfig format is incompatible with previously published workflows. → **Mitigation**: The executor already uses nodeId-based keys (fixed in prior session). Old workflows with numeric-index keys will fail gracefully with a clear error message to re-publish.

## Migration Plan

1. Replace `buildPublishedInputs` / `buildPublishedOutputs` with auto-infer logic.
2. Remove the visibility toggle per-param; replace with white-list panel.
3. Add `PublishedConfig` type to `packages/shared-types/src/published.ts`.
4. Update `PublishDialog.handlePublish` to generate the new config shape.
5. User-app components (`InputSection`, `WorkflowRunPage`) consume the new PublishedConfig.
6. No database or storage migration needed — `localStorage` keys use `sourceId`, which is unchanged.

## Open Questions

- Should `load-image` nodes with default values (e.g., a built-in sample image) still appear as inputs, or should they be treated as internal defaults? Decision: treat as inputs but mark with a "默认值" hint.
- Should the white-list panel allow bulk selection (e.g., "expose all numeric params on node X")? Out of scope for v1.
- What about nodes that are both a source and a destination (loops in the graph)? Decision: nodes with both incoming and outgoing edges are neither source nor leaf; they don't appear as inputs or outputs.
