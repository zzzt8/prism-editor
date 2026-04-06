# Prism Editor

A visual low-code workflow editor for composable image processing pipelines. Build workflows in the browser, test them live, and publish to end users.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      prism-editor                           │
│                     (pnpm monorepo)                         │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                       │
│  ├── dev-tool/          Developer UI — build & publish      │
│  │                      (Login/Register, Node Canvas,      │
│  │                       Workflows Dashboard)                │
│  └── user-app/          End-user UI — run published flows   │
├─────────────────────────────────────────────────────────────┤
│  server/                                                    │
│  ├── Fastify API server — Workflow CRUD + publishing        │
│  ├── Prisma ORM — SQLite database                           │
│  ├── Auth — JWT-based authentication                        │
│  └── Node Package Registry — custom node sharing            │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                   │
│  ├── core/              Inline executor & utilities         │
│  ├── image-ops/         Pure image operations (Canvas API) │
│  ├── node-definitions/  Node metadata: inputs, params, UI   │
│  ├── shared-types/      Workflow, PublishedWorkflow, types  │
│  ├── shared-ui/         Design tokens + shared components  │
│  └── workflow-core/     Executor, topological sort, cache   │
├─────────────────────────────────────────────────────────────┤
│  openspec/              Change proposals, specs, task track │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Developer (dev-tool)
  1. Login/Register → JWT auth
  2. Create workflow → Drag nodes → canvas
  3. Wire them together
  4. Configure parameters
  5. Preview live output
  6. Publish → API Server (Fastify + Prisma/SQLite)
         ↓
End User (user-app)
  7. Browse published workflows from API
  8. Fill inputs / adjust params
  9. Run → PublishedWorkflowExecutor → HTML img
```

---

## Node Types

| Node | Category | Description |
|------|----------|-------------|
| **LoadImage** | Input | Load image from URL, file upload, or blob |
| **LoadMask** | Input | Load mask image (alpha/brightness/luminance) |
| **Transform** | Processing | Crop, resize, rotate, translate |
| **ApplyMask** | Processing | Apply alpha / brightness / luminance mask |
| **Composite** | Processing | Blend two images — supports multi-overlay, blend mode + opacity |
| **Export** | Output | Export as PNG / JPEG / WebP, optionally resized |

---

## Features

### Developer Tool (`apps/dev-tool`)

- **Authentication**: Login/Register with JWT tokens
- **Node Canvas**: React Flow-based visual editor
  - Drag nodes from the palette
  - Wire nodes by connecting ports
  - Inline parameter configuration
  - Live preview on any node
- **Workflow Management**: Create, edit, duplicate, delete workflows
- **Version History**: Track and rollback workflow versions
- **Publish Dialog**: Configure user-facing inputs and export settings
- **Node Package Manager**: Import custom node packages
- **Node Marketplace**: Browse shared node packages

### User App (`apps/user-app`)

- **Workflow Browser**: Browse and search published workflows
- **Runtime Executor**: Run workflows entirely client-side
- **Input Configuration**: Fill in URLs, adjust parameters
- **Export Options**: Download result in PNG/JPEG/WebP

### Server (`server/`)

- **Auth API**: Register, login, logout, token refresh
- **Workflow API**: CRUD operations, versioning, publishing
- **Published API**: List and fetch published workflows
- **Node Package API**: Publish and browse custom node packages

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start all apps (dev-tool, user-app, and server)
pnpm dev

# Start dev-tool only
pnpm dev:dev-tool

# Start user-app only
pnpm dev:user-app

# Start backend API server only
pnpm server:dev

# Migrate data from localStorage to API (one-time)
pnpm server:migrate

# Build for production
pnpm build

# Run all tests (Vitest + canvas npm polyfill for pixel-level assertions)
pnpm test

# Type-check all packages
pnpm typecheck

# Clean build artifacts
pnpm clean
```

**Requirements:** Node.js >= 18, pnpm >= 8.

---

## Apps

### dev-tool (`apps/dev-tool`)

The developer's workspace. Powered by React Flow for the node canvas and Zustand for state management.

- Login/Register with JWT authentication
- Drag nodes from the node palette onto the canvas
- Wire nodes by connecting ports
- Configure node parameters inline
- Click **Preview** on any node to see its live output
- **Publish** dialog: manually select which nodes are user-facing inputs, configure parameter visibility, export the workflow
- **Version History**: Track workflow changes and rollback to previous versions
- **Node Package Manager**: Import custom node packages from JSON
- **Marketplace**: Browse and install shared node packages

### user-app (`apps/user-app`)

The end-user runtime. Loads published workflows from the API server and runs them entirely client-side via `PublishedWorkflowExecutor`.

- Browse published workflows
- Fill inputs and adjust parameters
- Run workflow and view results
- Export result images

---

## Server (`server/`)

Backend API powered by Fastify + Prisma + SQLite with JWT authentication.

| Script | Description |
|--------|-------------|
| `pnpm server:dev` | Start dev server with hot reload (port 3001) |
| `pnpm server:migrate` | Migrate workflows from localStorage to API |

### API Endpoints

**Auth**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

**Workflows**
- `GET /api/workflows` - List user workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/:id` - Get workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow

**Versions**
- `GET /api/workflows/:id/versions` - List versions
- `POST /api/workflows/:id/versions` - Create version
- `GET /api/workflows/:id/versions/:vid` - Get version

**Published**
- `GET /api/published` - List published workflows
- `GET /api/published/:id` - Get published workflow

**Node Packages**
- `GET /api/nodes` - List node packages
- `POST /api/nodes` - Publish node package
- `GET /api/nodes/:name` - Get node package

See `server/README.md` for full API documentation.

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

All shared TypeScript interfaces: `Workflow`, `PublishedWorkflow`, `Connection`, executor types (`NodeExecutor`), executor output types (`LoadImageExecutorOutput`, `CompositeExecutorOutput`, ...).

### `@prism/shared-ui`

Design tokens (CSS variables) and shared UI components used across dev-tool and user-app.

### `@prism/core`

Inline executor utilities for custom node support.

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

- **IndexedDB Storage**: Replace localStorage with IndexedDB for better performance and larger storage capacity
- **Custom Node Support**: Import and run custom node packages with inline executors
- **User Authentication**: JWT-based auth system with register/login/logout flows
- **Node Package Marketplace**: Share and browse custom node packages
- **Workflow Versioning**: Track workflow changes with version history and rollback
- **Backend storage migration**: Fastify API server with Prisma ORM + SQLite for workflow CRUD and publishing
- **Codebase cleanup**: Removed deprecated features, unified shared components, optimized storage layer

---

## License

This project is licensed under the MIT License.

Copyright (c) 2024 Prism Editor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
