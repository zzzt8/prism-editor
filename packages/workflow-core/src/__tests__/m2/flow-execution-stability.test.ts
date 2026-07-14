/**
 * M2-B Test 12/13 ??stability + no implicit single-output fallback.
 *
 * The M1-B shape returned exactly 1 output by walking Object.keys(results).pop();
 * M2-B forbids that pattern. `grep` guard in `flow-execution.ts` and
 * `design-state-execution.ts` is a structural check; the assertion here is
 * the behavioural contract: a Flow with 3 declared outputs returns 3 frames,
 * in declaration order.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { FlowKey } from '@prism/shared-types';

import { executeFlow } from '../../flow-execution';
import { makeDesignState, makeFlow, makeMockExecutor } from './fixtures';

const REPO_ROOT = resolve(__dirname, '../../../../..');

describe('M2-B / stability + no implicit output fallback', () => {
  it('rendering a 3-output Flow never collapses to a single output', async () => {
    const flow = makeFlow({
      flowKey: 'production.full' as FlowKey,
      nodeTypes: ['multi'],
      explicitOutputs: [
        { slot: 'production.print', nodeId: 'multi-0' },
        { slot: 'production.preview', nodeId: 'multi-0' },
        { slot: 'production.mask', nodeId: 'multi-0' },
      ],
    });
    const { executor } = makeMockExecutor();
    const ds = makeDesignState(flow.flowKey, {
      params: {
        nodeParams: { 'multi-0': {} },
        requestedOutputSlots: ['production.print', 'production.preview', 'production.mask'],
      },
    });
    const r = await executeFlow(executor, flow, ds);
    expect(r.outputs).toHaveLength(3);
    expect(r.outputs.map((o) => o.slot)).toEqual([
      'production.print', 'production.preview', 'production.mask',
    ]);
  });

  it('grep guard: implementation must not call Object.keys(...).pop() in actual code', () => {
    const flowExec = readFileSync(
      resolve(REPO_ROOT, 'packages/workflow-core/src/flow-execution.ts'),
      'utf-8',
    );
    const designExec = readFileSync(
      resolve(REPO_ROOT, 'packages/workflow-core/src/design-state-execution.ts'),
      'utf-8',
    );
    // Strip comment + string lines so we only check executable code.
    const stripNoise = (src: string): string =>
      src
        .split(/\r?\n/)
        .filter((line) => !/^\s*(\/\/|\/\*|\*|`)/.test(line) && !/`[^`]*Object\.keys[^`]*`/.test(line))
        .join('\n');
    const flowCode = stripNoise(flowExec);
    const designCode = stripNoise(designExec);
    expect(flowCode).not.toMatch(/Object\.keys\([^)]+\)\.pop\(\)/);
    expect(designCode).not.toMatch(/Object\.keys\([^)]+\)\.pop\(\)/);
  });
});
