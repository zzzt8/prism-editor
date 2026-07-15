# M0 Test Driver — Real Browser vs Node Runtime Comparison

## Overview

This directory contains the M0 verification harness that compares the **real
Chromium browser executor chain** against the **Node.js + Sharp executor chain**.
It is implemented per the **M0 Real-Browser Closure Fix** plan.

## Architecture

- **Node Driver** (`driver/m0-driver.ts`): the sole orchestrator. Launches Playwright Chromium,
  starts a Vite dev server hosting the Browser test page, and runs each scenario 3 times.
- **Browser Test Host** (`browser-runtime-host/index.html`): an HTML page loaded inside Chromium
  by the Node Driver. It registers `window.__M0_RUNTIME__` exposing the Browser executors
  and pure-JS fixtures. **Does NOT load `test-setup.ts` and does NOT load any canvas
  npm polyfill** — only real browser APIs (OffscreenCanvas, createImageBitmap, etc.).
- **Shared module** (`shared/`): pure-JS fixtures, scenarios, and SHA-256 hashing. **No
  platform-specific imports** — safe to load from both Browser and Node.
- **P0 Spike** (`spike/spike-runner.ts`): standalone Node script that boots Chromium and
  runs 6 invariant checks (userAgent, OffscreenCanvas, no canvas polyfill, no test-setup
  polyfill, minimal identity workflow). Spike failure is BLOCKING and must never fall
  back to Node polyfills.
- **Mutation Tests** (`mutation/`): 12 mutation tests verifying the comparator's
  sensitivity to fabricated errors. **All blocking** — any failure blocks M0 PASS.
- **Alpha Regression** (`alpha/`): 7 alpha-format tests covering unPremultiply semantics
  and detectAlphaFormat behavior for backup reference. **All blocking**.

## Verification Command

```
pnpm --filter @prism/image-ops verify:m0
```

This runs (in order):
1. **P0 Spike** — Node script launches Chromium + Vite + runs 6 invariant checks.
2. **Node Driver** — runs 5 scenarios × 3 times = 15 cross-runtime comparisons,
   writes per-scenario artifacts.
3. **Mutation Tests** — vitest run, 12 tests, all blocking.
4. **Alpha Regression** — vitest run, 7+3 tests, all blocking.

Any failure → exit code 1.

## Artifact Layout

Output goes to `artifacts/verification/M0/`:

```
M0/
├── browser.png         # worst-case scenario's browser output
├── node.png            # worst-case scenario's node output
├── diff.png            # worst-case scenario's diff visualization
├── metrics.json        # full report with worst-case + thresholds
└── scenarios/
    ├── identity-browser.png / node.png / diff.png
    ├── scale-2x-browser.png / node.png / diff.png
    └── ... (5 scenarios × 3 files)
```

Atomic replacement: artifacts are written to a tmp dir, validated, then atomically
renamed into place. **Validation failure preserves existing artifacts.**

## Known Limitations

- The pnpm-lock.yaml resolution indicates playwright@1.58.2 + @vitest/browser@1.6.1 are
  intended, but actual `node_modules/` are not installed in this checkout. Running
  `pnpm install` is required before executing the verify:m0 script.
- Browser Load executor needs HTTP fetch; we substitute with ImageData bytes passed
  through `page.evaluate`. This is a workaround documented as BLOCKED-on-protocol for M1.

## Notes on Control Center Scope

The control-center scope-clean rule currently flags `packages/**` modifications as
out-of-scope for M0 artifacts. This is an existing tooling bug — M0 artifacts
specifically target `packages/image-ops/` for the dual-runtime comparison. The
verification.json gate is therefore expected to remain BLOCKED under the current
control-center rules until that tooling bug is resolved separately.
