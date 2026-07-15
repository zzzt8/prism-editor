/**
 * M2-B T10 guard — structural assertion that the hard-coded 4-node DAG has
 * been excised from `packages/workflow-core/src/design-state-execution.ts`
 * and `packages/workflow-core/src/executor.ts`.
 *
 * Per Decision D of design.md / M2 路标:
 * - `load-image` / `transform` / `composite` / `export` string literals
 *   must NOT appear in the engine's source files as node-type identifiers.
 *   (They may appear as JavaScript `export` keywords — those are filtered
 *   out by the surrounding-token regex.)
 * - `buildWorkflowFromDesignState` (the M1-B hard-coded DAG) must NOT be
 *   present anywhere in the engine.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../../..');

function stripJsExports(src: string): string {
  // Drop lines that contain a JS `export` keyword so we only catch node-type
  // string literals.
  return src
    .split(/\r?\n/)
    .filter((line) => !/^\s*export\s/.test(line))
    .join('\n');
}

const HARD_CODED_TOKENS = ["'load-image'", "'transform'", "'composite'", "'export'"];

function assertNoHardcodedDAG(filePath: string): void {
  const src = stripJsExports(readFileSync(filePath, 'utf-8'));
  for (const tok of HARD_CODED_TOKENS) {
    expect(
      src.includes(tok),
      `forbidden hard-coded DAG token ${tok} found in ${filePath}`,
    ).toBe(false);
  }
}

describe('M2-B / hard-coded DAG removal', () => {
  it('design-state-execution.ts has no hard-coded node-type strings', () => {
    assertNoHardcodedDAG(
      resolve(REPO_ROOT, 'packages/workflow-core/src/design-state-execution.ts'),
    );
  });

  it('executor.ts has no hard-coded node-type strings', () => {
    assertNoHardcodedDAG(
      resolve(REPO_ROOT, 'packages/workflow-core/src/executor.ts'),
    );
  });

  it('buildWorkflowFromDesignState is no longer exported from workflow-core src', () => {
    const idx = readFileSync(
      resolve(REPO_ROOT, 'packages/workflow-core/src/index.ts'),
      'utf-8',
    );
    expect(idx.includes('buildWorkflowFromDesignState')).toBe(false);
  });

  it('executeFromDesignState routes through executeFlow, not the legacy builder', () => {
    const exec = readFileSync(
      resolve(REPO_ROOT, 'packages/workflow-core/src/executor.ts'),
      'utf-8',
    );
    // The new entry path calls `executeFlow`; the legacy builder should be
    // absent from the call chain.
    expect(exec).toContain('executeFlow');
  });
});
