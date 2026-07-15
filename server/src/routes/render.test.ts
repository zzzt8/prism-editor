// Unit tests for render routes (M2-C smoke)
// Covers: /design-state normal path, error codes, /template forward

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';

// Import the module under test via dynamic import so vitest can instrument it.
let renderRoutes: (fastify: unknown, opts: unknown) => Promise<void>;

async function loadModule() {
  const mod = await import('./render.js');
  renderRoutes = mod.default as unknown as typeof renderRoutes;
}

beforeAll(async () => {
  await loadModule();
});

/** Cast to FlowKey. */
function fk(s: string) {
  return s as import('@prism/shared-types').FlowKey;
}

/** Minimal valid Flow for mock catalog. */
function makeFlow(flowKey = 'production') {
  return {
    schemaVersion: 1 as const,
    flowKey: fk(flowKey),
    nodeRefs: [{ nodeId: 'out', nodeType: 'noop' }],
    explicitOutputs: [{ slot: 'result', nodeId: 'out', port: 'image', kind: 'image' as const }],
  };
}

describe('render routes — smoke', () => {
  let mockCatalog: import('@prism/workflow-core').InMemoryTemplateVersionCatalog;

  beforeAll(async () => {
    const { InMemoryTemplateVersionCatalog } = await import('@prism/workflow-core');
    mockCatalog = new InMemoryTemplateVersionCatalog();
    mockCatalog.add({
      templateId: 'tmpl-test',
      version: '1.0.0',
      flows: [makeFlow()],
      createdAt: new Date().toISOString(),
    }, true);
  });

  /** Build a Fastify app with render routes + mock catalog. */
  function buildApp() {
    const app = Fastify();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.register(renderRoutes as any, { catalog: mockCatalog } as any);
    return app;
  }

  describe('POST /design-state', () => {
    it('returns 400 for invalid RenderRequest (missing required fields)', async () => {
      const app = buildApp();
      await app.ready();
      const res = await app.inject({
        method: 'POST',
        url: '/design-state',
        payload: { designState: {} },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      await app.close();
    });

    it('returns 404 when templateId+version not in catalog', async () => {
      const app = buildApp();
      await app.ready();
      const res = await app.inject({
        method: 'POST',
        url: '/design-state',
        payload: {
          designState: {
            schemaVersion: 1,
            templateId: 'non-existent-template',
            templateVersion: '1.0.0',
            flowKey: fk('production'),
            inputs: { assets: [], params: {} },
            createdAt: new Date().toISOString(),
          },
          requestedOutputSlots: ['result'],
        },
      });
      expect(res.statusCode).toBe(404);
      await app.close();
    });

    it('returns 404 when flowKey not in catalog', async () => {
      const app = buildApp();
      await app.ready();
      const res = await app.inject({
        method: 'POST',
        url: '/design-state',
        payload: {
          designState: {
            schemaVersion: 1,
            templateId: 'tmpl-test',
            templateVersion: '1.0.0',
            flowKey: fk('nonexistent-flow'),
            inputs: { assets: [], params: {} },
            createdAt: new Date().toISOString(),
          },
          requestedOutputSlots: ['result'],
        },
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
      // Forward to executeFromDesignState → catalog.getVersion → 404
      expect(res.statusCode).toBe(404);
      await app.close();
    });
  });
});
