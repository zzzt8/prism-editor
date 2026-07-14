/**
 * M2-B Test 4 â€?multi-output ordering: output order mirrors `flow.explicitOutputs`
 * declaration order regardless of `requestedOutputSlots` order.
 */

import { describe, it, expect } from 'vitest';
import type { FlowKey } from '@prism/shared-types';

import { executeFlow } from '../../flow-execution';
import { makeDesignState, makeFlow, makeMockExecutor } from './fixtures';

describe('M2-B / executeFlow â€?multi output order is stable', () => {
  it('outputs follow explicitOutputs declaration order regardless of requestedOutputSlots order', async () => {
    const flow = makeFlow({
      flowKey: 'production.full' as FlowKey,
      nodeTypes: ['a', 'b', 'c', 'd'],
      explicitOutputs: [
        { slot: 'production.print', nodeId: 'd-3' },
        { slot: 'production.preview', nodeId: 'd-3' },
        { slot: 'production.mask', nodeId: 'd-3' },
      ],
    });
    const { executor } = makeMockExecutor();

    const orderings = [
      ['production.print', 'production.mask', 'production.preview'],
      ['production.mask', 'production.print', 'production.preview'],
      ['production.preview', 'production.print', 'production.mask'],
    ];

    for (const order of orderings) {
      const ds = makeDesignState(flow.flowKey, {
        params: {
          nodeParams: { 'd-3': {} },
          requestedOutputSlots: order,
        },
      });
      const { outputs } = await executeFlow(executor, flow, ds);
      expect(outputs.map((o) => o.slot)).toEqual([
        'production.print', 'production.preview', 'production.mask',
      ]);
    }
  });
});
