# frontend-workflow-live-synthesis — Manual E2E smoke checklist

Date: 2026-06-15
Tester: (pending — agent verified build/transform but manual UI interaction required)

## Environment

- dev-tool: `pnpm dev --filter=@prism/dev-tool` (port 3000)
- server: `pnpm server:dev` (port 3001)

## Agent-verified (build pipeline)

- [x] `pnpm --filter=@prism/dev-tool typecheck` passes
- [x] `pnpm --filter=@prism/dev-tool test` — 25/25 tests pass (10 pre-existing + 6 executionService + 9 live subscription)
- [x] `pnpm --filter=@prism/dev-tool build` — production bundle builds without errors
- [x] Vite dev server boots in 601ms, serves `index.html` and transforms `SettingsPage.tsx` without errors

## Manual UI scenarios (require human interaction)

1. **Frontend workflow auto-synthesis**
   - Create `targetPlatform = browser` workflow (load-image × 2 + composite)
   - Load 2 test images → preview should auto-update within ~250ms
   - Drag `composite.opacity` slider 0→0.5→1 → preview auto-updates
   - Switch `composite.blendMode` → preview auto-updates
   - Drag a new image onto a LoadImage node → preview auto-updates

2. **Live Preview disabled**
   - In SettingsPage (`/settings`), toggle Live Preview off
   - Repeat scenario 1 → preview should NOT auto-update (revert to manual mode)
   - Click "重跑" button → preview updates

3. **Backend workflow unchanged**
   - Create `targetPlatform = nodejs` workflow
   - Change any input/parameter → preview should NOT auto-update
   - Live badge should be hidden
   - Execute button should read "Execute" (not "重跑")

4. **Cancellation/重入**
   - During a live execution, change a param → previous execution should be aborted
   - Click "重跑" while live execution is running → button acts as "停止" (no crash)

5. **Persistence**
   - Toggle Live Preview off, reload page → setting persists
   - Change Debounce to 500ms, reload → value persists

## Known follow-ups

- The composite node's `overlayX` / `overlayY` in the inspector is wired through `updateNodeParams` and will be picked up by the live subscription. If a future composite UX reads `node.position` instead, that path would not trigger live execution.
- `useAppStore` uses `zustand/middleware/persist` against `localStorage`. SSR / cross-tab sync is not in scope for this change.
