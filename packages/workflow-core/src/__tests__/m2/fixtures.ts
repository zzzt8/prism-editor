// Shared test fixtures for the M2-B test suite.
//
// Conventions:
// - `Flow.explicitOutputs` is the source of truth for output ordering
//   (Guardrails §1.8). `requestedOutputSlots` order MUST NOT affect
//   `RenderResult.outputs[]` order.
// - `executeFlow` defaults to a linear nodeRefs chain; tests use either
//   the default or override via `additionalConnections` / `buildWorkflow`.
// - All fixture `ImageRef`-style payloads are minimal objects with the
//   three fields the type validator consumes.

import type {
  DesignState,
  Flow,
  FlowKey,
  ImageRef,
  NodeExecutor,
} from '@prism/shared-types';

import type { TemplateVersion } from '../../flow-resolver';
import { WorkflowExecutor } from '../../executor';

export const TEST_TEMPLATE_ID = 'tmpl.m2-b-test';
export const TEST_TEMPLATE_VERSION = '1.0.0';

/** Minimal asset ref used by every test DesignState. */
export function makeImage(width = 16, height = 16, kind = 'mock'): ImageRef {
  return {
    type: 'inline-data',
    url: `inline://${kind}`,
    width,
    height,
    mimeType: 'image/png',
  };
}

export function makeDesignState(
  flowKey: FlowKey,
  inputs: Partial<DesignState['inputs']> = {},
): DesignState {
  return {
    schemaVersion: 1,
    templateId: TEST_TEMPLATE_ID,
    templateVersion: TEST_TEMPLATE_VERSION,
    flowKey,
    inputs: {
      assets: [
        {
          slot: 'base',
          asset: {
            id: 'asset-base',
            kind: 'inline',
            mimeType: 'image/png',
            checksum: 'a'.repeat(64),
            width: 16,
            height: 16,
          },
        },
      ],
      params: {},
      ...inputs,
    },
    createdAt: '2026-07-15T00:00:00.000Z',
  };
}

/** Build a Flow whose `nodeRefs` are a linear chain and whose `explicitOutputs`
 * index specific `(nodeId, port)` pairs. */
export function makeFlow(args: {
  flowKey: FlowKey;
  nodeTypes?: ReadonlyArray<string>;
  explicitOutputs: ReadonlyArray<{
    slot: string;
    nodeId: string;
    port?: string;
  }>;
}): Flow {
  const nodeTypes = args.nodeTypes ?? ['load-image', 'transform', 'composite', 'export'];
  const nodeRefs = nodeTypes.map((nodeType, idx) => ({
    nodeId: `${nodeType}-${idx}`,
    nodeType,
  }));
  return {
    schemaVersion: 1,
    flowKey: args.flowKey,
    nodeRefs,
    explicitOutputs: args.explicitOutputs.map((out) => ({
      slot: out.slot,
      nodeId: out.nodeId,
      port: out.port ?? 'image',
      kind: 'image' as const,
    })),
  };
}

export function makeTemplateVersion(
  flows: ReadonlyArray<Flow>,
  version: string = TEST_TEMPLATE_VERSION,
): TemplateVersion {
  return {
    templateId: TEST_TEMPLATE_ID,
    version,
    flows,
    createdAt: '2026-07-15T00:00:00.000Z',
  };
}

/** Build a `WorkflowExecutor` with registered deterministic mock executors
 * that satisfy the M2-B test contract:
 * - Every loaded `ImageRef` is returned unchanged.
 * - The `export` node returns a final `ImageRef`. */
export function makeMockExecutor(): {
  executor: WorkflowExecutor;
} {
  const exe = new WorkflowExecutor({});
  const passthrough: NodeExecutor = async () => ({ image: makeImage(32, 32, 'passthrough') });
  // Register every common node-type name so tests can pick any string.
  for (const type of ['a', 'b', 'c', 'd', 'multi', 'no-image']) {
    exe.register(type, passthrough);
  }
  exe.register('load-image', passthrough);
  exe.register('transform', passthrough);
  exe.register('composite', passthrough);
  exe.register('export', async () => ({ image: makeImage(32, 32, 'final') }));
  return { executor: exe };
}

/** Build a mock executor whose nodes return `ImageRef`s keyed by the node id
 * the executor receives via `params`. Useful for tests where the executor
 * itself needs to differentiate between nodes (e.g. multiple-output assertion). */
export function makeDeterministicExecutor(images: ReadonlyMap<string, ImageRef>): {
  executor: WorkflowExecutor;
} {
  const exe = new WorkflowExecutor({});
  const stub: NodeExecutor = async (_inputs, params) => {
    const param = (params ?? {}) as Record<string, unknown>;
    const id = (param['nodeId'] ?? param['id'] ?? 'mock') as string;
    const image = images.get(id) ?? makeImage(8, 8, id);
    return { image };
  };
  for (const type of ['a', 'b', 'c', 'd', 'multi', 'load-image', 'transform', 'composite', 'export']) {
    exe.register(type, stub);
  }
  return { executor: exe };
}
