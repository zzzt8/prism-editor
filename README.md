# Prism Editor

A visual low-code workflow editor for composable image processing pipelines. Build workflows in the browser, test them live, and publish to end users — no backend required.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      prism-editor                           │
│                     (pnpm monorepo)                         │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                       │
│  ├── dev-tool/          Developer UI — build & publish      │
│  └── user-app/          End-user UI — run published flows   │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                    │
│  ├── shared-types/      Workflow, PublishedWorkflow, types  │
│  ├── shared-ui/         Design tokens + shared components   │
│  ├── node-definitions/  Node metadata: inputs, params, UI   │
│  ├── image-ops/         Pure image operations (Canvas API)  │
│  └── workflow-core/     Executor, topological sort, cache   │
├─────────────────────────────────────────────────────────────┤
│  openspec/              Change proposals, specs, task track  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Developer (dev-tool)
  1. Drag nodes → canvas
  2. Wire them together
  3. Configure parameters
  4. Preview live output
  5. Publish → localStorage + BroadcastChannel
         ↓
End User (user-app)
  6. Browse workflows
  7. Fill inputs / adjust params
  8. Run → PublishedWorkflowExecutor → HTML img
```

---

## Node Types

| Node | Category | Description |
|------|----------|-------------|
| **LoadImage** | Input | Load image from URL or file upload |
| **Transform** | Processing | Crop, resize, rotate, translate |
| **ApplyMask** | Processing | Apply alpha / brightness / luminance mask |
| **Composite** | Processing | Blend two images — supports multi-overlay (overlay, overlay2 … overlayN), blend mode + opacity |
| **Export** | Output | Export as PNG / JPEG / WebP, optionally resized |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start both apps in development mode
pnpm dev

# Start dev-tool only
pnpm dev:dev-tool

# Start user-app only
pnpm dev:user-app

# Build for production
pnpm build

# Run all tests (Vitest + canvas npm polyfill for pixel-level assertions)
pnpm test

# Type-check all packages
pnpm typecheck

# Clean build artifacts
pnpm clean
```

**Requirements:** Node.js ≥ 18, pnpm ≥ 8.

---

## Apps

### dev-tool (`apps/dev-tool`)

The developer's workspace. Powered by React Flow for the node canvas and Zustand for state management.

- Drag nodes from the node palette onto the canvas
- Wire nodes by connecting ports
- Configure node parameters inline
- Click **Preview** on any node to see its live output
- **Publish** dialog: manually select which nodes are user-facing inputs, configure parameter visibility, export the workflow

### user-app (`apps/user-app`)

The end-user runtime. Loads published workflows from localStorage and runs them entirely client-side via `PublishedWorkflowExecutor`.

---

## Packages

### `@prism/image-ops`

Pure image processing operations using the Canvas API. Every node type has a corresponding executor function here. Tested pixel-to-pixel with Vitest + `canvas` npm polyfill.

### `@prism/workflow-core`

- **`WorkflowExecutor`**: topologically sorts nodes, resolves inputs from upstream outputs, runs each executor
- **`PublishedWorkflowExecutor`**: bridges a `PublishedWorkflow` (developer-curated subset, index-keyed) back to a runnable `Workflow` and injects user-supplied inputs
- **Cache**: LRU cache for decoded `ImageData` objects, keyed by source URL

### `@prism/node-definitions`

Type-safe node definitions: inputs, outputs, parameter schemas, UI metadata (category, color, icon).

### `@prism/shared-types`

All shared TypeScript interfaces: `Workflow`, `PublishedWorkflow`, `Connection`, executor types (`NodeExecutor`), executor output types (`LoadImageExecutorOutput`, `CompositeExecutorOutput`, …).

### `@prism/shared-ui`

Design tokens (CSS variables) and shared UI components used across dev-tool and user-app.

---

## Key Concepts

### ImageRuntimeObject (IRO)

The unified image data structure passed between executors:

```typescript
{ data: ImageData | Blob; width: number; height: number; previewUrl: string; ... }
```

### Execution Context

Each executor receives an `ExecutionContext` providing:
- `requireInput(name, nodeType)` — reads upstream output; throws if missing
- `setOutput(name, value)` — stores executor result
- `signal` — `AbortSignal` for cancellation

### Publishing Model

`buildPublishedConfig` maps the React Flow canvas (node IDs, edges) to a portable `PublishedWorkflow` config:

- `nodeConfigs[nodeId]` — parameter values; large `dataUrl` strings are stripped for user-input nodes (users supply the URL at runtime)
- `config.inputs` — manually selected nodes exposed to the end user
- `config.outputs` — auto-detected leaf nodes (export/composite) with `{nodeId}:image` format IDs
- `connections` — source → target wiring using node IDs

### Test Strategy

Tests live next to the code they test (`.test.ts`). The `canvas` npm package provides browser APIs (`ImageData`, `OffscreenCanvas`, `Image`) for Node.js. Each image operation test uses pixel-level assertions against known-good reference images.

---

## Recent Changes

See `git log` for full history. Highlights:

- **Composite node**: multi-overlay support (overlay, overlay2 … overlayN); overlay ports render correctly below the static overlay image
- **Published workflow storage**: `dataUrl` stripping prevents `QuotaExceededError` in localStorage while preserving developer-provided images
- **Output resolution**: v2 publish format uses `{nodeId}:image` output IDs; executor results are keyed by canvas node ID
- **Codebase cleanup**: `executors.ts` split into per-node files (`load-image.ts`, `composite.ts`, …); `WorkflowCanvas.tsx` split into focused hooks; `PrismNode.tsx` split into header / ports / controls sub-components
- **OpenSpec workflow**: change proposals, design docs, and task tracking live in `openspec/changes/`

---

## License

Private. All rights reserved.
