/**
 * M2-B Test 8 â€?`requestedOutputSlots` containing an undeclared slot throws
 * `REQUESTED_OUTPUT_UNKNOWN`.
 */

import { describe, it, expect } from 'vitest';
import type { FlowKey } from '@prism/shared-types';

import { executeFlow } from '../../flow-execution';
import { FlowResolverError } from '../../errors';
import { makeDesignState, makeFlow, makeMockExecutor } from './fixtures';

describe('M2-B / executeFlow â€?undeclared slot rejection', () => {
  it('throws REQUESTED_OUTPUT_UNKNOWN when a requested slot is not in flow.explicitOutputs', async () => {
    const flow = makeFlow({
      flowKey: 'production.full' as FlowKey,
      nodeTypes: ['a'],
      explicitOutputs: [{ slot: 'production.print', nodeId: 'a-0' }],
    });
    const { executor } = makeMockExecutor();
    const ds = makeDesignState(flow.flowKey, {
      params: {
        nodeParams: { 'a-0': {} },
        requestedOutputSlots: ['production.print', 'production.unknown-slot'],
      },
    });
    await expect(executeFlow(executor, flow, ds)).rejects.toBeInstanceOf(FlowResolverError);
    try {
      await executeFlow(executor, flow, ds);
    } catch (err) {
      expect((err as FlowResolverError).code).toBe('REQUESTED_OUTPUT_UNKNOWN');
      expect((err as FlowResolverError).context).toMatchObject({ slot: 'production.unknown-slot' });
    }
  });
});
