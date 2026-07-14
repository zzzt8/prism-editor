/**
 * M2-B Test 5 �?shuffling `flow.nodeRefs` does not affect output order.
 * Guardrails §1.7 / §1.8: output order is determined by `explicitOutputs`,
 * not by nodeRefs order.
 */

import { describe, it, expect } from 'vitest';
import type { Flow, FlowKey } from '@prism/shared-types';

import { executeFlow } from '../../flow-execution';
import { makeDesignState, makeFlow, makeMockExecutor, TEST_TEMPLATE_ID, TEST_TEMPLATE_VERSION } from './fixtures';

function makeFlowWithOrder(
  flowKey: FlowKey,
  refs: ReadonlyArray<{ nodeId: string; nodeType: string }>,
): Flow {
  return {
    schemaVersion: 1,
    flowKey,
    nodeRefs: refs,
    explicitOutputs: [
      { slot: 'production.print', nodeId: 'export-print', port: 'image', kind: 'image' },
      { slot: 'production.preview', nodeId: 'export-preview', port: 'image', kind: 'image' },
      { slot: 'production.mask', nodeId: 'export-mask', port: 'image', kind: 'image' },
    ],
  };
}

describe('M2-B / flow.nodeRefs order shuffling', () => {
  it('changing nodeRefs order does not change RenderResult.outputs order', async () => {
    const fA = makeFlowWithOrder('production.full' as FlowKey, [
      { nodeId: 'load', nodeType: 'load-image' },
      { nodeId: 'transform', nodeType: 'transform' },
      { nodeId: 'composite', nodeType: 'composite' },
      { nodeId: 'export-print', nodeType: 'export' },
      { nodeId: 'export-preview', nodeType: 'export' },
      { nodeId: 'export-mask', nodeType: 'export' },
    ]);
    const fB = makeFlowWithOrder('production.full' as FlowKey, [
      { nodeId: 'export-mask', nodeType: 'export' },
      { nodeId: 'export-print', nodeType: 'export' },
      { nodeId: 'transform', nodeType: 'transform' },
      { nodeId: 'load', nodeType: 'load-image' },
      { nodeId: 'composite', nodeType: 'composite' },
      { nodeId: 'export-preview', nodeType: 'export' },
    ]);
    const { executor } = makeMockExecutor();

    const params = {
      nodeParams: Object.fromEntries(
        ['load', 'transform', 'composite', 'export-print', 'export-preview', 'export-mask']
          .map((id) => [id, {}]),
      ),
      requestedOutputSlots: ['production.print', 'production.preview', 'production.mask'],
    };
    const dsA = makeDesignState(fA.flowKey, { params });
    const dsB = makeDesignState(fB.flowKey, { params });
    const a = await executeFlow(executor, fA, dsA);
    const b = await executeFlow(executor, fB, dsB);
    // Order must be identical even though the nodeRefs are shuffled.
    expect(a.outputs.map((o) => o.slot)).toEqual(b.outputs.map((o) => o.slot));
    // Also confirm same template/version metadata via the design states.
    expect(dsA.templateId).toBe(TEST_TEMPLATE_ID);
    expect(dsA.templateVersion).toBe(TEST_TEMPLATE_VERSION);
  });
});
