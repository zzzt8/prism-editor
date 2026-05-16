---
opsx_meta:
  change_class: medium
  layers:
    - editor
    - engine
---

# Tasks: fix-react-hooks-and-lint

## Phase 1: Fix React Hook Conditional Calls (Critical)

- [ ] T1: Fix `ParametersPanel.tsx` — move 4 conditional Hook calls to top level
  - layer: editor
  - verify: `pnpm lint --filter=@prism/dev-tool`

- [ ] T2: Fix `SettingsPanel.tsx` — move 7 conditional Hook calls to top level
  - layer: editor
  - verify: `pnpm lint --filter=@prism/dev-tool`

- [ ] T3: Fix `DebugTab.tsx` — move 2 conditional useMemo calls to top level
  - layer: editor
  - verify: `pnpm lint --filter=@prism/dev-tool`

- [ ] T4: Fix `InfoPanel.tsx` — move 5 conditional useMemo calls to top level
  - layer: editor
  - verify: `pnpm lint --filter=@prism/dev-tool`

## Phase 2: Fix Unused Variables (Batch)

- [ ] T5: Run `pnpm lint:fix` to auto-fix simple unused variable issues
  - layer: editor, engine, ui-skin
  - verify: Check remaining errors manually

- [ ] T6: Fix remaining unused imports in `PrismNodeControls.tsx` (7 issues)
  - layer: editor
  - verify: `pnpm lint --filter=@prism/dev-tool`

- [ ] T7: Fix unused imports in `autosaveService.ts`, `importExportService.ts`
  - layer: editor
  - verify: `pnpm lint --filter=@prism/dev-tool`

- [ ] T8: Fix unused variables in `publishedToWorkflow.ts`, `interfaces.ts`
  - layer: editor
  - verify: `pnpm lint --filter=@prism/dev-tool`

- [ ] T9: Fix unused import in `workflow-core/executor.ts`
  - layer: engine
  - verify: `pnpm lint --filter=@prism/workflow-core`

- [ ] T10: Clean up unused exports in `shared-types/` (auth.ts, execution.ts, port-data-types.ts)
  - layer: ui-skin
  - verify: `pnpm lint --filter=@prism/shared-types`

## Phase 3: Fix useEffect Dependencies

- [ ] T11: Fix useEffect dependency warnings in multiple files
  - layer: editor
  - verify: `pnpm lint --filter=@prism/dev-tool`

## Verification

- [ ] T12: Full lint check passes
  - verify: `pnpm lint 2>&1 | grep -c "error"` should be 0

- [ ] T13: Typecheck still passes
  - verify: `pnpm typecheck`

- [ ] T14: Tests still pass
  - verify: `pnpm test`
