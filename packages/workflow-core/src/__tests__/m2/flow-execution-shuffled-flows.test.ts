/**
 * M2-B Test 6 â€?shuffling `TemplateVersion.flows[]` does not affect output.
 */

import { describe, it, expect } from 'vitest';
import type { FlowKey } from '@prism/shared-types';

import { executeFlow } from '../../flow-execution';
import { resolveFlow } from '../../flow-resolver';
import {
  InMemoryTemplateVersionCatalog,
} from '../../flow-resolver';
import { makeDesignState, makeFlow, makeTemplateVersion, makeMockExecutor } from './fixtures';

describe('M2-B / TemplateVersion.flows[] shuffling', () => {
  it('shuffling the order of flows[] does not change resolveFlow / executeFlow output', async () => {
    const fA = makeFlow({
      flowKey: 'production.full' as FlowKey,
      explicitOutputs: [{ slot: 'production.print', nodeId: 'export-3' }],
    });
    const fB = makeFlow({
      flowKey: 'preview.flat' as FlowKey,
      explicitOutputs: [{ slot: 'preview.flat', nodeId: 'export-3' }],
    });
    const cat = new InMemoryTemplateVersionCatalog();
    cat.add(makeTemplateVersion([fA, fB]));
    cat.add(makeTemplateVersion([fB, fA])); // unrelated second version

    const tv1 = cat.getVersion('tmpl.m2-b-test', '1.0.0')!;
    const tv2 = makeTemplateVersion([fB, fA]);
    const a = resolveFlow(tv1, 'production.full' as FlowKey);
    const b = resolveFlow(tv2, 'production.full' as FlowKey);
    expect(a.flowKey).toBe(b.flowKey);

    const { executor } = makeMockExecutor();
    const ds1 = makeDesignState(fA.flowKey, { params: { nodeParams: { 'export-3': {} } } });
    const ds2 = makeDesignState(fA.flowKey, { params: { nodeParams: { 'export-3': {} } } });
    const r1 = await executeFlow(executor, a, ds1);
    const r2 = await executeFlow(executor, b, ds2);
    expect(r1.outputs.map((o) => o.slot)).toEqual(r2.outputs.map((o) => o.slot));
  });
});
