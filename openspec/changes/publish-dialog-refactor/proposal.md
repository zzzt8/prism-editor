## Why

The current PublishDialog leaks internal engine abstractions directly to developers: it exposes raw pipeline ports (Base, Overlay) as "user inputs", lists every node's internal parameters with a confusing black-list toggle, and fails to correctly identify export nodes. This creates a poor developer experience and produces incorrect PublishedWorkflow data that breaks execution in the user app. We need a clean, business-oriented publish interface with automatic inference of input/output nodes and a parameter white-list.

## What Changes

### Inputs Section — Auto-detect Source Nodes
- Infer source nodes automatically: nodes with no incoming edges, OR nodes explicitly typed `load-image`.
- Each detected source node appears as a card with a required **visible label** field (developer-facing name shown to end users, e.g. "产品白底图").
- Remove all raw port-based inputs; only one entry per source node.

### Parameter White-list — Default Hidden
- All node parameters default to **hidden** (instead of the current default-visible approach).
- A single `+ 添加向用户暴露的参数` button opens a node-browser panel listing every node and its available params.
- Developers explicitly opt-in params by checking them, then give each a user-facing label.
- Only whitelisted params appear in the user app.

### Outputs Section — Auto-detect Export / Leaf Nodes
- Auto-detect output nodes: `type === 'export'` nodes first, then fallback to leaf nodes (nodes with no outgoing edges).
- Each detected output node shows an export format selector (PNG / JPEG / WebP).
- Fixes the current "无可用输出端口" false-negative bug.

### Data Model — PublishedConfig Structure
- Replace the current `PublishedInput[]` / `PublishedOutput[]` arrays (keyed by `{index}:{portId}`) with a clean `PublishedConfig` containing `inputs[]`, `exposedParams[]`, `outputs[]`, all keyed by stable canvas `nodeId` UUIDs.
- The PublishedWorkflow.id / sourceId system remains unchanged.

## Capabilities

### New Capabilities
- `publish-dialog-auto-infer`: Automatically detect source nodes (no incoming edges) and export/leaf nodes (no outgoing edges) from the React Flow graph, presenting them as Inputs and Outputs without exposing raw pipeline ports.
- `publish-dialog-param-whitelist`: Replace the black-list visibility toggle with a white-list opt-in mechanism. Parameters are hidden by default; developers explicitly add them via a node-browser panel.

## Impact

- **File changed**: `apps/dev-tool/src/components/header/PublishDialog.tsx` — fully rewritten dialog UI and logic
- **Types updated**: `packages/shared-types/src/published.ts` — new `PublishedConfig` interface replacing `PublishedInput[]` / `PublishedOutput[]` for publish metadata
- **Executor updated**: `packages/workflow-core/src/published-executor.ts` — already migrated to nodeId-based keys (done in prior session); only the parameter injection logic may need light adjustment
- **User app**: `apps/user-app/src/components/InputSection/index.tsx` and `apps/user-app/src/pages/WorkflowRunPage.tsx` — may need minor updates to consume the new PublishedConfig shape
