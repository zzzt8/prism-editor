/**
 * M2-B Test 3 â€?`executeFlow` happy path: single explicit output.
 */

import { describe, it, expect } from 'vitest';
import type { FlowKey } from '@prism/shared-types';

import { executeFlow } from '../../flow-execution';
import { makeDesignState, makeFlow, makeMockExecutor } from './fixtures';

describe('M2-B / executeFlow â€?single explicit output', () => {
  it('produces 1 RenderResultOutput when flow declares 1 explicitOutput', async () => {
    const flow = makeFlow({
      flowKey: 'production.print' as FlowKey,
      nodeTypes: ['export'],
      explicitOutputs: [{ slot: 'production.print', nodeId: 'export-0' }],
    });
    const ds = makeDesignState(flow.flowKey, {
      params: { nodeParams: { 'export-0': {} } },
    });
    const { executor } = makeMockExecutor();
    const result = await executeFlow(executor, flow, ds);
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].slot).toBe('production.print');
    expect(result.outputs[0].flowKey).toBe('production.print');
  });
});
