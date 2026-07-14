/**
 * M2-B Test 9 â€?`Flow.explicitOutputs` must be non-empty; empty throws
 * `FLOW_OUTPUTS_MISSING`. Also negative for `DECLARED_OUTPUT_NOT_PRODUCED`
 * when the executor returns no image for a declared output.
 */

import { describe, it, expect } from 'vitest';
import type { FlowKey } from '@prism/shared-types';

import {
  collectOutputsByExplicitOutputs,
  executeFlow,
} from '../../flow-execution';
import { FlowResolverError } from '../../errors';
import { makeDesignState, makeFlow, makeMockExecutor } from './fixtures';

describe('M2-B / explicit outputs missing', () => {
  it('throws FLOW_OUTPUTS_MISSING when flow.explicitOutputs is empty', () => {
    const flow = makeFlow({
      flowKey: 'production.full' as FlowKey,
      nodeTypes: ['a'],
      explicitOutputs: [], // empty on purpose
    });
    expect(() => collectOutputsByExplicitOutputs(flow, [], {})).toThrow(FlowResolverError);
    try {
      collectOutputsByExplicitOutputs(flow, [], {});
    } catch (err) {
      expect((err as FlowResolverError).code).toBe('FLOW_OUTPUTS_MISSING');
    }
  });

  it('throws DECLARED_OUTPUT_NOT_PRODUCED when the executor returns no image for a declared port', async () => {
    const flow = makeFlow({
      flowKey: 'production.full' as FlowKey,
      nodeTypes: ['no-image'],
      explicitOutputs: [{ slot: 'production.print', nodeId: 'no-image-0', port: 'missing-port' }],
    });
    const { executor } = makeMockExecutor();
    const ds = makeDesignState(flow.flowKey, {
      params: {
        nodeParams: { 'no-image-0': {} },
        requestedOutputSlots: ['production.print'],
      },
    });
    await expect(executeFlow(executor, flow, ds)).rejects.toBeInstanceOf(FlowResolverError);
    try {
      await executeFlow(executor, flow, ds);
    } catch (err) {
      expect((err as FlowResolverError).code).toBe('DECLARED_OUTPUT_NOT_PRODUCED');
    }
  });
});
