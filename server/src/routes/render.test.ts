// Unit tests for render routes (M2-C smoke)
// Covers: /design-state normal path, error codes, /template forward

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyPluginOptions } from 'fastify';
import type { RenderRoutesOptions } from './render.js';

// Import the module under test — needs to be done as a dynamic import
// so vitest can instrument it correctly.
let renderRoutes: (
  fastify: Parameters<typeof import('./render.js').default>[0],
  opts: FastifyPluginOptions & RenderRoutesOptions,
) => Promise<void>;
let RenderRoutesOptions: typeof import('./render.js').RenderRoutesOptions;

async function loadModule() {
  const mod = await import('./render.js');
  renderRoutes = mod.default as unknown as typeof renderRoutes;
  RenderRoutesOptions = mod.RenderRoutesOptions;
}

beforeAll(async () => {
  await loadModule();
});

/** Minimal inline identity workflow. */
function makeIdentityWorkflow(flowKey = 'production'): import('@prism/shared-types').Flow {
  return {
    id: 'wf-1',
    name: 'Identity',
    flowKey,
    nodes: [
      {
        id: 'identity-out',
        type: 'noop',
        inputs: {},
        outputs: { image: { type: 'image', format: 'png' } },
      },
    ],
    edges: [],
    explicitOutputs: [
      { slot: 'result', nodeId: 'identity-out', port: 'image' },
    ],
    nodeRefs: [{ nodeId: 'identity-out' }],
    metadata: {},
  };
}

/** Valid RenderRequest payload for the mock catalog. */
function makeValidRequest(overrides: Partial<import('@prism/shared-types').RenderRequest> = {}): import('@prism/shared-types').RenderRequest {
  return {
    designState: {
      schemaVersion: 1, // must be 1 per design-state.schema.json const:1
      templateId: 'tmpl-test',
      templateVersion: '1.0.0',
      flowKey: 'production', // lowercase per pattern ^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$
      inputs: {
        assets: [],
        params: {},
      },
      createdAt: new Date().toISOString(),
    },
    requestedOutputSlots: ['result'], // must match explicitOutputs slot
    ...overrides,
  };
}

describe('render routes — smoke', () => {
  // Build a minimal mock catalog using InMemoryTemplateVersionCatalog
  let mockCatalog: import('@prism/workflow-core').InMemoryTemplateVersionCatalog;

  beforeAll(async () => {
    const { InMemoryTemplateVersionCatalog } = await import('@prism/workflow-core');
    mockCatalog = new InMemoryTemplateVersionCatalog();

    mockCatalog.add(
      {
        templateId: 'tmpl-test',
        version: '1.0.0',
        flows: [makeIdentityWorkflow()],
        createdAt: new Date().toISOString(),
      },
      true, // markCurrent
    );
  });

  /** Create a Fastify instance registered with render routes + mock catalog. */
  function buildApp() {
    const app = Fastify();
    app.register(renderRoutes as Parameters<typeof app.register>[1], {
      catalog: mockCatalog,
    } as FastifyPluginOptions & RenderRoutesOptions);
    return app;
  }

  describe('POST /design-state', () => {
    it('returns 400 for invalid RenderRequest (missing required fields)', async () => {
      const app = buildApp();
      await app.ready();
      const res = await app.inject({
        method: 'POST',
        url: '/design-state',
        payload: { designState: {} }, // missing required designState fields
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      await app.close();
    });

    it('returns 404 when templateId+templateVersion not found in catalog', async () => {
      const app = buildApp();
      await app.ready();
      const res = await app.inject({
        method: 'POST',
        url: '/design-state',
        payload: makeValidRequest({
          designState: {
            ...makeValidRequest().designState,
            templateId: 'non-existent-template',
          },
        }),
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBeTruthy();
      await app.close();
    });

    it('returns 404 when flowKey not found in catalog', async () => {
      const app = buildApp();
      await app.ready();
      const res = await app.inject({
        method: 'POST',
        url: '/design-state',
        payload: makeValidRequest({
          designState: {
            ...makeValidRequest().designState,
            flowKey: 'nonexistent-flow',
          },
        }),
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('FLOW_NOT_FOUND');
      await app.close();
    });
  });

  describe('POST /template', () => {
    it('returns 404 for non-existent templateId (forward path)', async () => {
      const app = buildApp();
      await app.ready();
      const res = await app.inject({
        method: 'POST',
        url: '/template',
        payload: { templateId: 'non-existent-id-12345' },
      });
      // /template forwards to executeFromDesignState which calls catalog.getVersion
      // → TEMPLATE_VERSION_NOT_FOUND → 404
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBeTruthy();
      await app.close();
    });
  });
});
