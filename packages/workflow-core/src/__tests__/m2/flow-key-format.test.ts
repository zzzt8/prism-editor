/**
 * M2-B Test 1 â€?`resolveFlow` hits the unique Flow matching the requested flowKey.
 *
 * Verifies Decision 1 / Decision 5: precise key match (no findFirst).
 */

import { describe, it, expect } from 'vitest';
import type { FlowKey } from '@prism/shared-types';

import { resolveFlow } from '../../flow-resolver';
import { FlowResolverError } from '../../errors';
import { makeFlow, makeTemplateVersion } from './fixtures';

describe('M2-B / resolveFlow â€?hit / miss / duplicate', () => {
  it('returns the unique flow when flowKey is present', () => {
    const f1 = makeFlow({
      flowKey: 'production.print' as FlowKey,
      explicitOutputs: [{ slot: 'production.print', nodeId: 'export-3' }],
    });
    const f2 = makeFlow({
      flowKey: 'preview.flat' as FlowKey,
      explicitOutputs: [{ slot: 'preview.flat', nodeId: 'export-3' }],
    });
    const tv = makeTemplateVersion([f1, f2]);
    const got = resolveFlow(tv, 'production.print' as FlowKey);
    expect(got.flowKey).toBe('production.print');
  });

  it('throws FLOW_NOT_FOUND when no flow carries the requested flowKey', () => {
    const f1 = makeFlow({
      flowKey: 'production.print' as FlowKey,
      explicitOutputs: [{ slot: 'production.print', nodeId: 'export-3' }],
    });
    const tv = makeTemplateVersion([f1]);
    expect(() => resolveFlow(tv, 'production.batch' as FlowKey)).toThrow(FlowResolverError);
    try {
      resolveFlow(tv, 'production.batch' as FlowKey);
    } catch (err) {
      expect((err as FlowResolverError).code).toBe('FLOW_NOT_FOUND');
    }
  });

  it('throws DUPLICATE_FLOW_KEY when two flows share the same flowKey', () => {
    const f1 = makeFlow({
      flowKey: 'production.print' as FlowKey,
      explicitOutputs: [{ slot: 'production.print', nodeId: 'export-3' }],
    });
    const f2 = makeFlow({
      flowKey: 'production.print' as FlowKey,
      explicitOutputs: [{ slot: 'production.print', nodeId: 'export-3' }],
    });
    const tv = makeTemplateVersion([f1, f2]);
    expect(() => resolveFlow(tv, 'production.print' as FlowKey)).toThrow(FlowResolverError);
    try {
      resolveFlow(tv, 'production.print' as FlowKey);
    } catch (err) {
      expect((err as FlowResolverError).code).toBe('DUPLICATE_FLOW_KEY');
    }
  });

  it('shuffling the order of flows[] does not change the resolved flow', () => {
    const f1 = makeFlow({
      flowKey: 'production.print' as FlowKey,
      explicitOutputs: [{ slot: 'production.print', nodeId: 'export-3' }],
    });
    const f2 = makeFlow({
      flowKey: 'preview.flat' as FlowKey,
      explicitOutputs: [{ slot: 'preview.flat', nodeId: 'export-3' }],
    });
    const tvA = makeTemplateVersion([f1, f2]);
    const tvB = makeTemplateVersion([f2, f1]);
    expect(resolveFlow(tvA, 'production.print' as FlowKey)).toBe(resolveFlow(tvB, 'production.print' as FlowKey));
  });
});
