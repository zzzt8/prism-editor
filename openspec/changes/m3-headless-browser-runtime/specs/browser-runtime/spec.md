# Spec: M3 — Headless Browser Runtime

> **Spec Delta**: M3 adds `@prism/browser-runtime` package, AssetResolver/OutputSink interfaces, image-ops browser entry, and Chromium test host. M2 protocol types remain unchanged.

---

## ADDED Requirements

### Requirement: @prism/browser-runtime Package Exists

The system SHALL provide a `@prism/browser-runtime` package that:
- Exposes a single `execute(request, options)` function
- Accepts `RenderRequest` as input (not designState + separate RenderOptions)
- Returns `RenderResult` as output (M2 protocol, unchanged)
- Does NOT define `BrowserRenderResult` or any M2 protocol variant
- Does NOT add `previewUrl` field to any M2 type

#### Scenario: browser-runtime package is buildable

- **WHEN** `pnpm build --filter @prism/browser-runtime` is run
- **THEN** the build succeeds with exit code 0

#### Scenario: execute function accepts complete RenderRequest

- **WHEN** `execute(renderRequest, options)` is called
- **THEN** `renderRequest` must be a complete `RenderRequest` object
- **AND** `renderRequest.designState` must be present
- **AND** `renderRequest.requestedOutputSlots` must be non-empty

#### Scenario: execute function returns RenderResult

- **WHEN** `execute(renderRequest, options)` succeeds
- **THEN** the return value is a valid `RenderResult` (schemaVersion: 2)
- **AND** `result.outputs` follows `Flow.explicitOutputs` order
- **AND** `result.templateVersion` equals `renderRequest.designState.templateVersion`

---

### Requirement: AssetResolver Interface

The system SHALL define an `AssetResolver` interface with the following contract:

```typescript
interface AssetResolver {
  resolve(assetRef: AssetRef): Promise<ImageData>;
}
```

The `AssetResolver` interface:
- Only handles INPUT asset resolution (AssetRef → ImageData)
- Does NOT generate previews or manage UI state
- Does NOT write Blob/ImageData/ImageBitmap to DesignState/RenderRequest/RenderResult
- Does NOT write blob URLs to persistent JSON

#### Scenario: AssetResolver resolves inline asset

- **WHEN** `assetResolver.resolve({ id: '...', kind: 'inline', mimeType: 'image/png', checksum: 'sha256:...' })` is called
- **THEN** it returns `Promise<ImageData>`
- **AND** the ImageData is suitable for executor input

#### Scenario: AssetResolver resolves remote asset

- **WHEN** `assetResolver.resolve({ id: '...', kind: 'remote', url: 'https://...' })` is called
- **THEN** it returns `Promise<ImageData>`
- **AND** CORS headers are validated if cross-origin

#### Scenario: AssetResolver resolves prism-asset

- **WHEN** `assetResolver.resolve({ id: '...', kind: 'prism-asset', url: '/api/assets/...' })` is called
- **THEN** it returns `Promise<ImageData>`
- **AND** the asset is fetched from the Prism asset API

---

### Requirement: OutputSink Interface

The system SHALL define an `OutputSink` interface with the following contract:

```typescript
interface OutputSink {
  publish(nodeId: string, slot: string, output: unknown): ImageRef;
}
```

The `OutputSink` interface:
- Only handles OUTPUT publishing (executor output → ImageRef)
- Does NOT resolve input assets
- Returns `ImageRef` suitable for `RenderResult.outputs`
- Must NEVER return Blob/Canvas/ImageBitmap in RenderResult

#### Scenario: OutputSink publishes executor output

- **WHEN** `outputSink.publish(nodeId, slot, imageData)` is called
- **THEN** it returns `ImageRef`
- **AND** the ImageRef is serializable to JSON
- **AND** `RenderResult.outputs` can contain the returned ImageRef

---

### Requirement: TemplateVersionResolver Interface

The system SHALL define a `TemplateVersionResolver` interface that mirrors M2-B `TemplateVersionCatalog`:

```typescript
interface TemplateVersionResolver {
  getVersion(templateId: string, version: string): TemplateVersion | undefined;
  currentVersion(templateId: string): TemplateVersion | undefined;
}
```

The `TemplateVersionResolver`:
- Must be provided explicitly to `execute()`
- Must NOT have implicit fallback behavior
- Is required (not optional)

#### Scenario: TemplateVersionResolver returns specific version

- **WHEN** `templateVersionResolver.getVersion('template-1', '1.0.0')` is called
- **THEN** it returns `TemplateVersion | undefined`
- **AND** the returned version matches the requested templateId and version

#### Scenario: TemplateVersionResolver returns current version

- **WHEN** `templateVersionResolver.currentVersion('template-1')` is called
- **THEN** it returns `TemplateVersion | undefined`
- **AND** the returned version is the catalog-marked current version

#### Scenario: TemplateVersionResolver is required

- **WHEN** `execute(renderRequest, { assetResolver, outputSink })` is called without `templateVersionResolver`
- **THEN** the call throws `TypeError` (missing required field)

---

### Requirement: @prism/image-ops/browser Subpackage

The system SHALL provide `@prism/image-ops/browser` as a browser-only entry point.

The `@prism/image-ops/browser` entry:
- Exports ONLY browser executors and helpers
- Does NOT export Sharp or Node.js executors
- Does NOT export `nodejs/` directory content
- Is suitable for Chromium test hosts and browser runtime

#### Scenario: browser entry exports browser executors

- **WHEN** the browser entry is imported
- **THEN** `browserExecutors` is available
- **AND** `createCanvas`, `makeImageData`, `getImageData`, `putImageData` are available
- **AND** `generatePreviewUrl`, `lazyPreviewStrategy`, `eagerPreviewStrategy` are available

#### Scenario: browser entry does not contain Sharp

- **WHEN** `@prism/image-ops/browser` is bundled
- **THEN** the bundle does NOT contain 'sharp'
- **AND** the bundle does NOT contain `nodejs/` imports

---

### Requirement: Package Boundary Gates

The system SHALL verify that `@prism/browser-runtime` does not contain forbidden dependencies.

Forbidden dependencies include:
- `react`, `@types/react`
- `zustand`
- `@prism/dev-tool`
- `@prism/composer-sdk`
- `@prism/server`
- `sharp`
- `@prism/image-ops/nodejs`
- Node built-ins: `fs`, `path`, `Buffer`, `process`, `stream`, `crypto`

#### Scenario: browser-runtime has no forbidden packages

- **WHEN** `boundary-gates.test.ts` checks package.json
- **THEN** no forbidden packages are found in dependencies
- **AND** no forbidden packages are found in devDependencies

#### Scenario: browser-runtime bundle has no forbidden patterns

- **WHEN** the bundle is analyzed
- **THEN** no Node built-in patterns are found (fs, path, buffer, process)
- **AND** no Sharp imports are found
- **AND** no React imports are found

---

### Requirement: Chromium Test Host Verifications

The system SHALL verify 10 conditions when running browser-runtime in real Chromium.

The 10 verification conditions:
1. Browser Runtime can be created independently
2. Does not depend on Dev Tool, Composer, or React
3. Precisely executes DesignState.flowKey
4. Returns at least two explicit output slots
5. requestedOutputSlots filter is effective
6. Output order follows Flow.explicitOutputs declaration
7. Unknown slot returns M2 explicit error
8. Runtime bundle does not include Sharp
9. Does not load canvas npm polyfill
10. Package build, typecheck, and Chromium tests pass

#### Scenario: Browser Runtime can be created independently

- **WHEN** Chromium test host creates a browser runtime
- **THEN** `createBrowserRuntime({ assetResolver, templateVersionResolver, outputSink })` succeeds
- **AND** the returned object can execute RenderRequests

#### Scenario: executes DesignState.flowKey precisely

- **WHEN** `execute(renderRequest, options)` is called with `designState.flowKey = 'preview.main'`
- **THEN** the resolved Flow matches the declared flowKey exactly
- **AND** no other Flow is selected

#### Scenario: returns multiple explicit output slots

- **WHEN** Chromium test executes with 2+ declared output slots
- **THEN** `result.outputs` contains at least 2 entries
- **AND** each entry has a distinct slot name

#### Scenario: requestedOutputSlots filter is effective

- **WHEN** `renderRequest.requestedOutputSlots = ['mockup']`
- **THEN** `result.outputs` contains only 1 entry
- **AND** `result.outputs[0].slot === 'mockup'`

#### Scenario: output order follows explicitOutputs

- **WHEN** `Flow.explicitOutputs` declares slots in order `['mockup', 'cutting-preview']`
- **THEN** `result.outputs[0].slot === 'mockup'`
- **AND** `result.outputs[1].slot === 'cutting-preview'`

#### Scenario: unknown slot returns M2 error

- **WHEN** `renderRequest.requestedOutputSlots = ['nonexistent-slot']`
- **THEN** `execute()` throws `FlowResolverError` with code `'REQUESTED_OUTPUT_UNKNOWN'`

#### Scenario: bundle excludes Sharp

- **WHEN** the browser-runtime bundle is analyzed
- **THEN** the bundle does NOT contain 'sharp'
- **AND** the bundle does NOT contain 'sharp-utils'

#### Scenario: does not load canvas polyfill

- **WHEN** Chromium test runs in headless Chromium
- **THEN** `typeof OffscreenCanvas !== 'undefined'`
- **AND** no canvas npm polyfill is loaded

---

## REMOVED Requirements

None.

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| AssetRef with unsupported kind | `AssetResolver.resolve()` throws `Error` with descriptive message |
| TemplateVersion not found | `execute()` throws `FlowResolverError` with code `'TEMPLATE_VERSION_NOT_FOUND'` |
| Duplicate flowKey in templateVersion | `execute()` throws `FlowResolverError` with code `'DUPLICATE_FLOW_KEY'` |
| Flow not found for flowKey | `execute()` throws `FlowResolverError` with code `'FLOW_NOT_FOUND'` |
| Empty requestedOutputSlots | `execute()` throws `ValidationError` with code `'REQUESTED_OUTPUTS_EMPTY'` |
| Output slot not declared in explicitOutputs | `execute()` throws `FlowResolverError` with code `'REQUESTED_OUTPUT_UNKNOWN'` |
| Executor throws error | `execute()` catches error and rethrows as is |
| AbortSignal aborted | `execute()` stops execution and returns `RenderResult` with `status: 'cancelled'` |

---

## Error Handling

| Error Condition | Error Code | Error Message |
|----------------|------------|--------------|
| Invalid RenderRequest | `VALIDATION_ERROR` | Per ajv schema validation |
| TemplateVersion not found | `TEMPLATE_VERSION_NOT_FOUND` | TemplateVersion not found (templateId=X, version=Y) |
| Flow not found | `FLOW_NOT_FOUND` | flowKey=X not found in templateVersion=Y |
| Duplicate flowKey | `DUPLICATE_FLOW_KEY` | Multiple flows share flowKey=X |
| Unknown output slot | `REQUESTED_OUTPUT_UNKNOWN` | Slot X not declared in explicitOutputs |
| Empty requestedOutputSlots | `REQUESTED_OUTPUTS_EMPTY` | requestedOutputSlots must be non-empty |
| Executor error | N/A | Rethrows original error |

---

## Test Mapping

| Scenario | Test File | Test Case |
|---------|----------|-----------|
| browser-runtime package is buildable | `packages/browser-runtime/src/__tests__/build.test.ts` | `should build successfully` |
| execute function accepts RenderRequest | `packages/browser-runtime/src/__tests__/execute.test.ts` | `should accept complete RenderRequest` |
| execute returns RenderResult | `packages/browser-runtime/src/__tests__/execute.test.ts` | `should return RenderResult` |
| AssetResolver resolves inline asset | `packages/browser-runtime/src/__tests__/asset-resolver.test.ts` | `should resolve inline asset` |
| AssetResolver resolves remote asset | `packages/browser-runtime/src/__tests__/asset-resolver.test.ts` | `should resolve remote asset` |
| OutputSink publishes output | `packages/browser-runtime/src/__tests__/output-sink.test.ts` | `should publish executor output` |
| TemplateVersionResolver required | `packages/browser-runtime/src/__tests__/execute.test.ts` | `should throw if templateVersionResolver missing` |
| browser entry excludes Sharp | `packages/image-ops/src/__tests__/browser-entry-isolation.test.ts` | `should not contain sharp` |
| boundary gates pass | `packages/browser-runtime/src/__tests__/boundary-gates.test.ts` | all gate tests |
| Chromium 10 verifications | `packages/browser-runtime/src/__tests__/chromium/chromium-verify.test.ts` | 10 verification tests |

---

## Dependencies

| Dependency | Description |
|-----------|-------------|
| `@prism/shared-types` | M2 protocol types (DesignState, RenderRequest, RenderResult, etc.) |
| `@prism/workflow-core` | WorkflowExecutor, flow resolver, flow execution engine |
| `@prism/image-ops/browser` | Browser executors, canvas utilities |
| `ajv ^8` | JSON schema validation (inherited from shared-types) |

---

## Future Considerations

- ~~Add caching system (deferred to future phase)~~
- ~~Add getStatus() method (deferred to future phase)~~
- ~~Add cancel() method (deferred to future phase)~~
- ~~Add Worker architecture (deferred to future phase)~~
- ~~Implement DevToolAssetResolver (M4 scope)~~
- ~~Implement ComposerAssetResolver (M4 scope)~~
- ~~npm external publish (M5 scope)~~
