# Prism Editor

A visual low-code workflow editor for composable image processing pipelines. Build, test and run workflows directly in the browser — no backend required.

## Features

- **Visual Workflow Canvas** — drag-and-drop nodes onto an infinite canvas, connect them with edges, configure parameters
- **Rich Node Library** — LoadImage, Transform, ApplyMask, Composite, Export out of the box
- **Real-time Preview** — each node shows its live output preview as you configure it
- **Publish to Users** — export a configured workflow for the end-user app with chosen input/outputs and parameter visibility
- **Client-side Execution** — workflows run entirely in the browser using a topological executor
- **Zero-setup Testing** — vitest + canvas npm polyfill for pixel-level image operation tests

## Project Structure

```
prism-editor/
├── apps/
│   ├── dev-tool/       # Developer-facing workflow editor (React + React Flow)
│   └── user-app/        # End-user run page — loads published workflows
├── packages/
│   ├── shared-types/    # Shared TypeScript interfaces (Workflow, PublishedWorkflow, etc.)
│   ├── node-definitions/ # Node definitions: inputs, outputs, params, UI metadata
│   ├── image-ops/      # Pure image operations (applyMask, composite, transform, export)
│   └── workflow-core/   # WorkflowExecutor, PublishedWorkflowExecutor, topological sort
├── openspec/           # Change proposals, specs, design docs, and task tracking
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start both apps in development mode
pnpm dev

# Run in dev-tool only
pnpm dev:dev-tool

# Run in user-app only
pnpm dev:user-app

# Build both apps for production
pnpm build

# Run all tests
pnpm test

# Type-check all packages
pnpm typecheck
```

Requirements: Node.js ≥ 18, pnpm ≥ 8.

## Node Types

| Node | Category | Description |
|------|----------|-------------|
| **LoadImage** | Input | Load an image from a URL |
| **Transform** | Processing | Crop, resize, rotate, translate |
| **ApplyMask** | Processing | Apply an alpha/brightness/luminance mask to an image |
| **Composite** | Processing | Blend two images with configurable blend mode and opacity |
| **Export** | Output | Export image as PNG/JPEG/WebP, optionally resized |

## How It Works

### Developer Flow (dev-tool)

1. Drop nodes onto the canvas and wire them together
2. Configure each node's parameters
3. Preview the output at every step
4. Click **Publish** → configure which parameters are visible to users
5. The published workflow is stored in localStorage, ready for the user app

### End-User Flow (user-app)

1. Browse published workflows
2. Fill in required inputs (e.g. image URLs)
3. Adjust exposed parameters (e.g. opacity, blend mode)
4. Click **Run** — the workflow executes client-side via `PublishedWorkflowExecutor`

### Execution Model

The `WorkflowExecutor` topologically sorts all nodes, resolves inputs from upstream outputs, and runs each node's executor. `PublishedWorkflowExecutor` bridges the published config (index-keyed) back to a runnable `Workflow` and injects user-supplied inputs.

## Technology Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Apps**: Vite + React 18
- **Canvas**: React Flow (node graph), Zustand (state)
- **Image Operations**: Canvas API (browser), `canvas` npm (Node.js test polyfill)
- **Testing**: Vitest + `canvas` npm polyfill for pixel-accurate assertions
- **Language**: TypeScript strict mode throughout
