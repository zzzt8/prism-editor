# Product Template v1

> Established: 2026-06-09
> Status: v1 — Initial business abstraction layer

---

## What is a Product Template?

A **Product Template** is a business-level object that sits above the Workflow concept.

```
Product Template
  ├── Preview Flow  ←→  Preview Canvas
  └── Production Flow  ←→  Production Output Spec
```

The core insight driving this model:

> Prism Editor's purpose is not "generic workflow editing."
> It is product-oriented image synthesis — typically producing something
> a factory or end user will receive as a finished artifact.

A Product Template captures the complete intent of a product editing job,
including how it should look on screen and how it should be rendered for delivery.

---

## Relationship to Existing Concepts

| Concept | Role |
|---|---|
| **Workflow** | Execution graph of nodes and connections |
| **EditorDraft** | Canvas persistence state (nodes, edges, groups, viewport) |
| **Template** | Snapshot-based reusable workflow asset |
| **PublishedWorkflow** | A workflow exposed to the end user in the app |
| **ProductTemplate** | Business layer grouping preview + production intent |

`ProductTemplate` does **not** replace any of the above.
It is an additional abstraction that can reference existing Workflows as its flows.

---

## 与现有 Workflow / PublishedWorkflow 的关系

`ProductTemplate` is the new **business-layer container**, while `Workflow` and
`PublishedWorkflow` remain the current operational models during the transition period.

- **Current phase does not replace `Workflow`** — existing editor, execution, and publish
  flows continue to use the legacy workflow objects.
- **`ProductTemplate` acts as the upper container first** — it groups business inputs,
  design parameters, preview intent, and production intent without changing runtime behavior.
- **`preview.flow` temporarily reuses existing flow objects** — it may reference either a
  `PublishedWorkflow` (preferred for current user-app runnable preview) or a `Workflow`
  (for editor-side or transitional preview scenarios).
- **`production.flow` currently keeps only a reference structure** — it may reference a
  `Workflow`, an external production process, or no bound flow yet. v1 does not implement
  production execution.
- **Preview and Production are allowed to diverge** — they are not required to point to the
  same workflow. Their consistency comes from shared `ProductTemplate.inputs` and
  `designParams`, not from sharing a single runtime graph.
- **Future direction** — `Preview Flow` and `Production Flow` will be split into clearer,
  more dedicated flow models step by step, instead of overloading today's legacy workflow
  objects forever.

A temporary mapping for v1:

```
ProductTemplate
  ├── preview.flow     -> PublishedWorkflow | Workflow
  └── production.flow  -> Workflow | external | none
```

This keeps the current publishing model intact while making room for later migration of the
existing published flow into `ProductTemplate.preview.flow`.

---

## Preview Flow

**Purpose:** Front-end real-time preview rendering.

The Preview Flow drives the canvas inside Prism Editor's dev-tool.
Its output is a `PreviewCanvasSpec` — a specification for how the canvas should
compose layers, handle background, and fit content.

Key characteristics:
- Interactive, fast iteration
- Runs in the browser via `workflow-core`
- Tied to the canvas viewport and visual composition

**Relation to existing code:**
The Preview Flow will initially point at existing Workflows. Over time, a dedicated
preview-optimized workflow variant may be introduced (e.g., lower resolution, simpler nodes).

---

## Production Flow

**Purpose:** Back-end factory-ready output generation.

The Production Flow produces the artifacts that will be delivered to the factory
or end user. Its output is a `ProductionOutputSpec` — a specification for
format, resolution, color profile, and output fields.

Key characteristics:
- High fidelity, potentially different node composition
- May run on the server (`@prism/server`) or in a headless Node.js environment
- Output is production-quality, not preview-quality

**Relation to existing code:**
Currently, production output is implicitly handled by the same workflow used for
preview. In v1, the two flows are allowed to be **completely different workflows**
— they only share inputs, assets, and design parameters.

---

## Shared State: Inputs, Assets, Design Params

Both flows reference the same:

- **`inputs`** — user-provided source materials (images, masks, files)
- **`assets`** — bundled or referenced materials (fonts, materials, overlays)
- **`designParams`** — editorial parameters (color, layout, copy, sizing)

This shared layer is the **consistency contract** between preview and production.
If preview and production diverge, they must do so within the bounds of this shared input.

```
  User Input
       │
  ┌────▼─────────────┐
  │  Shared Inputs  │
  │  Shared Assets  │
  │  Shared Params  │
  └────┬─────────────┘
       │
  ┌────┴────┐
  │         │
Preview   Production
  │         │
  │         └─→ ProductionOutputSpec
  └─→ PreviewCanvasSpec
```

---

## PreviewCanvasSpec

Describes how the preview canvas should render the product.

```typescript
interface PreviewCanvasSpec {
  width?: number;
  height?: number;
  background?: string;
  fit?: 'contain' | 'cover' | 'stretch';
  viewport?: { x?: number; y?: number; zoom?: number };
  layers?: PreviewCanvasLayerBinding[];
}
```

`layers` describe which inputs/assets/params map to which canvas layers,
enabling the dev-tool to render the canvas dynamically from the template definition
rather than requiring a pre-baked workflow.

---

## ProductionOutputSpec

Describes what the production output should look like when sent to the factory.

```typescript
interface ProductionOutputSpec {
  format?: 'png' | 'jpeg' | 'webp' | 'pdf' | 'svg';
  dpi?: number;
  colorProfile?: string;
  size?: { width?: number; height?: number; unit?: 'px' | 'mm' | 'cm' | 'in' };
  outputs?: ProductionOutputField[];
  notes?: string;
}
```

`outputs` enumerates the named fields the factory expects (e.g., `main_image`,
`mask_layer`, `cutting_outline`). Each field has a type and required flag.

---

## v1 Non-Goals (What This Does NOT Change)

The following are explicitly **out of scope** for v1:

- ❌ No change to `workflow-core` execution model
- ❌ No change to node definition registry
- ❌ No change to `image-ops` task scheduler
- ❌ No change to dev-tool UI components
- ❌ No change to user-app UI components
- ❌ No change to server Prisma schema
- ❌ No change to published API contracts
- ❌ No change to the executor

This v1 is purely a **business concept and data model**. It does not yet drive
any runtime behavior.

---

## Future Direction

**v2 (TBD):** Bind `ProductTemplate` to the actual publishing pipeline.

- User selects a Product Template to run
- Preview Flow executes in dev-tool
- Production Flow executes server-side and produces factory deliverables
- Shared inputs/params are validated against both flows at publish time

**v3 (TBD):** Template marketplace and versioning.

- Product Templates become versioned, shareable assets
- Different product categories (packaging, labels, signage) have domain-specific template extensions

---

## Type File Location

All v1 types are defined in:

```
packages/shared-types/src/product-template.ts
```

Exported from:

```
packages/shared-types/src/index.ts
```
