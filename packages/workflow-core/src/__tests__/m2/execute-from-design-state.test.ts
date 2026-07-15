/**
 * M2-B Test 14/15 ? `executeFromDesignState` no longer requires `options.params`
 * (M1-B synonym bundle is removed).
 */

import { describe, it, expect } from 'vitest';
import type { FlowKey } from '@prism/shared-types';

import { WorkflowExecutor } from '../../executor';
import {
  InMemoryTemplateVersionCatalog,
} from '../../flow-resolver';
import {
  makeDesignState,
  makeFlow,
  makeDeterministicExecutor,
  makeMockExecutor,
  makeTemplateVersion,
  makeImage,
} from './fixtures';

describe('M2-B / executeFromDesignState options.params removed', () => {
  it('accepts a call with a catalog option (runtime reads from DesignState.inputs.params)', async () => {
    const flow = makeFlow({
      flowKey: 'production.full' as FlowKey,
      nodeTypes: ['a'],
      explicitOutputs: [{ slot: 'production.print', nodeId: 'a-0' }],
    });
    const tv = makeTemplateVersion([flow]);
    const cat = new InMemoryTemplateVersionCatalog();
    cat.add(tv);

    const ds = makeDesignState(flow.flowKey, {
      params: { nodeParams: { 'a-0': {} } },
    });
    // Configure an executor with a registered `'a'` mock and re-use it.
    const { executor } = makeMockExecutor();
    const result = await (executor as unknown as WorkflowExecutor).executeFromDesignState(ds, {
      catalog: cat,
    });
    expect(result.renderResult.status).toBe('done');
    expect(result.flowKey).toBe('production.full');
  });

  it('runtime reads node params from DesignState.inputs.params (no options.params required)', async () => {
    const flow = makeFlow({
      flowKey: 'production.full' as FlowKey,
      nodeTypes: ['load-image', 'transform', 'composite', 'export'],
      explicitOutputs: [{ slot: 'production.print', nodeId: 'export-3' }],
    });
    const tv = makeTemplateVersion([flow]);
    const cat = new InMemoryTemplateVersionCatalog();
    cat.add(tv);

    const ds = makeDesignState(flow.flowKey, {
      params: {
        nodeParams: {
          'load-image-0': { id: 'load-image' },
          'transform-1': { id: 'transform' },
          'composite-2': { id: 'composite' },
          'export-3': { id: 'export' },
        },
      },
    });
    const opts: { catalog: typeof cat } = { catalog: cat };
    expect('params' in opts).toBe(false);

    const { executor } = makeDeterministicExecutor(
      new Map([
        ['load-image', makeImage(64, 64)],
        ['transform', makeImage(64, 64)],
        ['composite', makeImage(64, 64)],
        ['export', makeImage(64, 64)],
      ]),
    );
    const result = await (executor as unknown as WorkflowExecutor).executeFromDesignState(ds, opts);
    expect(result.renderResult.outputs[0].slot).toBe('production.print');
  });
});
