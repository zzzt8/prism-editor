# Tasks: M3 — Headless Browser Runtime

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 12 |
| Completed | 1 |
| In Progress | 0 |

---

## Phase 3.1 — Package Structure

### T.3.1.1 — Create package structure

**opsx-meta**

```yaml
id: T.3.1.1
layer: packages/browser-runtime
task_type: setup
verify:
  - type: file_exists
    path: packages/browser-runtime/package.json
  - type: file_exists
    path: packages/browser-runtime/tsconfig.json
  - type: file_exists
    path: packages/browser-runtime/src/index.ts
```

**Description**

Create the initial `@prism/browser-runtime` package structure.

**Acceptance Criteria**

- [x] `packages/browser-runtime/package.json` created with correct name, version, exports
- [x] `packages/browser-runtime/tsconfig.json` configured with ES2022 + DOM libs, no @types/node
- [x] `packages/browser-runtime/vitest.config.ts` configured for Chromium testing
- [x] `packages/browser-runtime/src/index.ts` exports `execute()` function stub
- [x] Package registered in `pnpm-workspace.yaml`
- [x] `pnpm install` succeeds
- [x] `pnpm typecheck --filter @prism/browser-runtime` succeeds

---

### T.3.1.2 — Define interfaces

**opsx-meta**

```yaml
id: T.3.1.2
layer: packages/browser-runtime
task_type: feature
depends_on: [T.3.1.1]
verify:
  - type: file_exists
    path: packages/browser-runtime/src/interfaces/asset-resolver.ts
  - type: file_exists
    path: packages/browser-runtime/src/interfaces/output-sink.ts
  - type: file_exists
    path: packages/browser-runtime/src/interfaces/template-version-resolver.ts
```

**Description**

Define the three core interfaces: AssetResolver, OutputSink, TemplateVersionResolver.

**Acceptance Criteria**

- [ ] `AssetResolver` interface with `resolve(assetRef): Promise<ImageData>`
- [ ] `OutputSink` interface with `publish(nodeId, slot, output): ImageRef`
- [ ] `TemplateVersionResolver` interface mirroring M2-B TemplateVersionCatalog
- [ ] `BrowserRuntimeOptions` interface grouping three dependencies
- [ ] `execute()` function signature defined
- [ ] All interfaces exported from `src/index.ts`
- [ ] Unit tests for interface contracts

---

## Phase 3.2 — image-ops Browser Subpackage

### T.3.2.1 — Add image-ops browser entry

**opsx-meta**

```yaml
id: T.3.2.1
layer: packages/image-ops
task_type: feature
depends_on: [T.3.1.2]
verify:
  - type: command
    cmd: pnpm build --filter @prism/image-ops
    expect_exit_code: 0
```

**Description**

Add `@prism/image-ops/browser` export condition to image-ops package.

**Acceptance Criteria**

- [ ] `packages/image-ops/src/browser-entry.ts` created with browser-only exports
- [ ] `browser-entry.ts` exports `browserExecutors`, canvas utilities, preview strategy
- [ ] `packages/image-ops/package.json` updated with `browser` export condition
- [ ] `packages/image-ops/package.json` does NOT export Sharp/nodejs from browser entry
- [ ] `pnpm build --filter @prism/image-ops` succeeds
- [ ] TypeScript compilation succeeds with new entry point

---

### T.3.2.2 — Verify browser entry isolation

**opsx-meta**

```yaml
id: T.3.2.2
layer: packages/image-ops
task_type: verification
depends_on: [T.3.2.1]
verify:
  - type: test_file
    path: packages/image-ops/src/__tests__/browser-entry-isolation.test.ts
```

**Description**

Add test to verify `@prism/image-ops/browser` does not contain Sharp or Node built-ins.

**Acceptance Criteria**

- [ ] Test file `browser-entry-isolation.test.ts` created
- [ ] Test verifies `browser` entry does not contain Sharp imports
- [ ] Test verifies `browser` entry does not contain Node built-ins (fs, path, buffer, process)
- [ ] Test passes

---

## Phase 3.3 — Implementation

### T.3.3.1 — Implement internal executor creation

**opsx-meta**

```yaml
id: T.3.3.1
layer: packages/browser-runtime
task_type: feature
depends_on: [T.3.2.1]
verify:
  - type: file_exists
    path: packages/browser-runtime/src/internal/create-executor.ts
```

**Description**

Implement internal executor creation using image-ops browser executors.

**Acceptance Criteria**

- [ ] `create-executor.ts` creates `WorkflowExecutor` with browser executors
- [ ] Executors imported from `@prism/image-ops/browser`
- [ ] `WorkflowExecutor` correctly registered with all browser executors
- [ ] Unit tests for executor creation
- [ ] `pnpm typecheck --filter @prism/browser-runtime` succeeds

---

### T.3.3.2 — Implement execute function

**opsx-meta**

```yaml
id: T.3.3.2
layer: packages/browser-runtime
task_type: feature
depends_on: [T.3.3.1]
verify:
  - type: test_file
    path: packages/browser-runtime/src/__tests__/execute.test.ts
```

**Description**

Implement the main `execute()` function.

**Acceptance Criteria**

- [ ] `execute()` validates RenderRequest using ajv
- [ ] `execute()` calls templateVersionResolver.getVersion()
- [ ] `execute()` calls resolveFlow() with templateVersion and designState.flowKey
- [ ] `execute()` resolves assets via assetResolver
- [ ] `execute()` calls executeFlow() with resolved params
- [ ] `execute()` publishes outputs via outputSink
- [ ] `execute()` returns RenderResult matching M2 protocol
- [ ] Error handling for ValidationError, FlowResolverError, executor errors

---

### T.3.3.3 — Implement asset resolver-backed loader

**opsx-meta**

```yaml
id: T.3.3.3
layer: packages/browser-runtime
task_type: feature
depends_on: [T.3.3.2]
verify:
  - type: file_exists
    path: packages/browser-runtime/src/internal/asset-resolver-backed-loader.ts
```

**Description**

Implement the asset-resolver-backed loader for browser runtime.

**Acceptance Criteria**

- [ ] `asset-resolver-backed-loader.ts` created
- [ ] Loader uses AssetResolver.resolve() to get ImageData
- [ ] Loader supports inline, remote, and prism-asset kinds
- [ ] Loader reuses existing OffscreenCanvas decoding logic
- [ ] Does NOT modify existing `load-image.ts` (preserves Dev Tool behavior)
- [ ] Unit tests for all supported asset kinds

---

## Phase 3.4 — Test Host

### T.3.4.1 — Create Chromium test fixtures

**opsx-meta**

```yaml
id: T.3.4.1
layer: packages/browser-runtime
task_type: feature
depends_on: [T.3.3.2]
verify:
  - type: file_exists
    path: packages/browser-runtime/src/__tests__/fixtures/minimal-template-version.ts
  - type: file_exists
    path: packages/browser-runtime/src/__tests__/fixtures/minimal-design-state.ts
  - type: file_exists
    path: packages/browser-runtime/src/__tests__/fixtures/minimal-render-request.ts
```

**Description**

Create fixed fixtures for Chromium test host.

**Acceptance Criteria**

- [ ] `minimal-template-version.ts` exports a TemplateVersion with at least 2 explicit output slots
- [ ] `minimal-design-state.ts` exports a DesignState with flowKey
- [ ] `minimal-render-request.ts` exports a RenderRequest with requestedOutputSlots
- [ ] Fixtures use real M2 types from @prism/shared-types
- [ ] Fixtures work with real workflow-core flow resolution

---

### T.3.4.2 — Create Chromium test host

**opsx-meta**

```yaml
id: T.3.4.2
layer: packages/browser-runtime
task_type: feature
depends_on: [T.3.4.1]
verify:
  - type: file_exists
    path: packages/browser-runtime/src/__tests__/chromium/chromium-host.html
  - type: file_exists
    path: packages/browser-runtime/src/__tests__/chromium/chromium-runner.ts
```

**Description**

Create Chromium test host based on M0 infrastructure but independent of `_m0_evidence`.

**Acceptance Criteria**

- [ ] `chromium-host.html` is independent HTML file (not in `_m0_evidence`)
- [ ] `chromium-host.html` loads browser-runtime via Vite/ESM
- [ ] `chromium-runner.ts` launches Playwright Chromium
- [ ] `chromium-runner.ts` resolves Chromium executable using M0 tool
- [ ] Test host injects mock AssetResolver
- [ ] Test host injects mock OutputSink
- [ ] Test host injects mock TemplateVersionResolver
- [ ] Test host executes RenderRequest and returns RenderResult

---

### T.3.4.3 — Implement 10 Chromium verifications

**opsx-meta**

```yaml
id: T.3.4.3
layer: packages/browser-runtime
task_type: verification
depends_on: [T.3.4.2]
verify:
  - type: test_file
    path: packages/browser-runtime/src/__tests__/chromium/chromium-verify.test.ts
```

**Description**

Implement the 10 Chromium verification conditions.

**Acceptance Criteria**

- [ ] Test for "browser-runtime-can-be-created"
- [ ] Test for "no-dev-tool-dependency"
- [ ] Test for "executes-design-state-flow-key"
- [ ] Test for "returns-multiple-output-slots"
- [ ] Test for "requested-output-slots-effective"
- [ ] Test for "output-order-follows-explicit-outputs"
- [ ] Test for "unknown-slot-returns-error"
- [ ] Test for "bundle-excludes-sharp"
- [ ] Test for "no-canvas-polyfill"
- [ ] Test for "chromium-tests-pass"
- [ ] All 10 tests pass in real Chromium

---

## Phase 3.5 — Package Boundary Gates

### T.3.5.1 — Add boundary gates test

**opsx-meta**

```yaml
id: T.3.5.1
layer: packages/browser-runtime
task_type: verification
depends_on: [T.3.3.2]
verify:
  - type: test_file
    path: packages/browser-runtime/src/__tests__/boundary-gates.test.ts
```

**Description**

Add package boundary gates to verify no forbidden dependencies.

**Acceptance Criteria**

- [ ] `boundary-gates.test.ts` checks package.json dependencies
- [ ] Verifies no `react` or `@types/react`
- [ ] Verifies no `zustand`
- [ ] Verifies no `@prism/dev-tool`
- [ ] Verifies no `@prism/composer-sdk`
- [ ] Verifies no `@prism/server`
- [ ] Verifies no `sharp`
- [ ] Verifies no `@prism/image-ops/nodejs`
- [ ] Verifies no Node built-ins (fs, path, buffer, process, stream, crypto)
- [ ] Verifies no deep imports from `@prism/image-ops/src` except `/browser/`
- [ ] All gate tests pass

---

## Phase 3.6 — Integration

### T.3.6.1 — Build and typecheck

**opsx-meta**

```yaml
id: T.3.6.1
layer: packages/browser-runtime
task_type: verification
depends_on: [T.3.3.3, T.3.5.1]
verify:
  - type: command
    cmd: pnpm build --filter @prism/browser-runtime
    expect_exit_code: 0
```

**Description**

Build and typecheck the complete browser-runtime package.

**Acceptance Criteria**

- [ ] `pnpm build --filter @prism/browser-runtime` succeeds
- [ ] `pnpm typecheck --filter @prism/browser-runtime` succeeds
- [ ] `pnpm lint --filter @prism/browser-runtime` succeeds
- [ ] Generated bundle does not contain Sharp
- [ ] Generated bundle does not contain Node built-ins
- [ ] Generated bundle does not contain React/Zustand

---

### T.3.6.2 — Verify existing tests still pass

**opsx-meta**

```yaml
id: T.3.6.2
layer: monorepo
task_type: verification
depends_on: [T.3.6.1]
verify:
  - type: command
    cmd: pnpm test --filter @prism/workflow-core
    expect_exit_code: 0
  - type: command
    cmd: pnpm test --filter @prism/image-ops
    expect_exit_code: 0
```

**Description**

Verify that existing test suites still pass after adding browser-runtime package.

**Acceptance Criteria**

- [ ] `pnpm test --filter @prism/workflow-core` passes (all existing tests)
- [ ] `pnpm test --filter @prism/image-ops` passes (all existing tests)
- [ ] `pnpm test --filter @prism/dev-tool` passes (Dev Tool still works)
- [ ] `pnpm test --filter @prism/composer-sdk` passes (Composer SDK still works)
- [ ] No regression in existing functionality

---

## N. Quality Compliance Verification

### N.1 Package Integrity

- [ ] N.1.1 `@prism/browser-runtime` package.json follows monorepo conventions
- [ ] N.1.2 tsconfig.json excludes Node types
- [ ] N.1.3 Exports map correctly defined
- [ ] N.1.4 Peer dependencies correctly declared

### N.2 API Contract

- [ ] N.2.1 `execute()` accepts complete RenderRequest (not designState + separate options)
- [ ] N.2.2 `execute()` returns RenderResult matching M2 protocol
- [ ] N.2.3 `execute()` throws M2 error codes for validation/resolution failures
- [ ] N.2.4 TemplateVersionResolver must be provided (no implicit fallback)

### N.3 Interface Contracts

- [ ] N.3.1 AssetResolver.resolve() returns ImageData
- [ ] N.3.2 OutputSink.publish() returns ImageRef
- [ ] N.3.3 TemplateVersionResolver matches M2-B Catalog interface

### N.4 Chromium Tests

- [ ] N.4.1 All 10 Chromium verification tests pass
- [ ] N.4.2 Tests run in real Chromium (not polyfill)
- [ ] N.4.3 Tests verify M2 protocol compliance

### N.5 Boundary Gates

- [ ] N.5.1 No forbidden packages in dependencies
- [ ] N.5.2 No forbidden patterns in bundle
- [ ] N.5.3 No deep imports from restricted paths

### N.6 Regression

- [ ] N.6.1 Dev Tool tests still pass
- [ ] N.6.2 Composer SDK tests still pass
- [ ] N.6.3 workflow-core tests still pass
- [ ] N.6.4 image-ops tests still pass

---

## Completion Checklist

### Functional Completion
- [ ] All 12 tasks completed
- [ ] All specs scenarios implemented
- [ ] All Chromium verifications pass

### Quality Gates
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (all packages)
- [ ] `pnpm build` passes
- [ ] Coverage meets threshold

### Test Coverage
- [ ] All interface contracts have tests
- [ ] All Chromium verifications have tests
- [ ] All boundary gates have tests
- [ ] Integration tests for RenderRequest → RenderResult

### Documentation
- [ ] proposal.md complete
- [ ] design.md complete
- [ ] tasks.md complete
- [ ] Interface JSDoc comments complete

### Review
- [ ] AI Review no Critical/High issues
- [ ] Human Review approved
- [ ] All issues resolved or planned

**Final Status**: DRAFT

---

**Completion Criteria**: N.1 through N.6 must be fully checked before marking as READY_FOR_REVIEW.
