/**
 * M2-B Test 7 â€?`requestedOutputSlots` order does not affect output order.
 */

import { describe, it, expect } from 'vitest';
import type { FlowKey } from '@prism/shared-types';

import { executeFlow } from '../../flow-execution';
import { makeDesignState, makeFlow, makeMockExecutor } from './fixtures';

describe('M2-B / requestedOutputSlots shuffling', () => {
  it('shuffling requestedOutputSlots does not change RenderResult.outputs order', async () => {
    const flow = makeFlow({
      flowKey: 'production.full' as FlowKey,
      nodeTypes: ['a'],
      explicitOutputs: [
        { slot: 'production.print', nodeId: 'a-0' },
        { slot: 'production.preview', nodeId: 'a-0' },
        { slot: 'production.mask', nodeId: 'a-0' },
      ],
    });
    const { executor } = makeMockExecutor();

    const requestedOrders = [
      ['production.print', 'production.mask', 'production.preview'],
      ['production.mask', 'production.print', 'production.preview'],
      ['production.preview', 'production.print', 'production.mask'],
    ];
    for (const order of requestedOrders) {
      const ds = makeDesignState(flow.flowKey, {
        params: { nodeParams: { 'a-0': {} }, requestedOutputSlots: order },
      });
      const result = await executeFlow(executor, flow, ds);
      expect(result.outputs.map((o) => o.slot)).toEqual([
        'production.print', 'production.preview', 'production.mask',
      ]);
    }
  });
});
