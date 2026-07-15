// M2-C: FlowCatalog injected at server startup.
// See app.ts: FlowCatalog.create() → passed via fastify-plugin options.
export interface RenderRoutesOptions {
  readonly catalog: import('@prism/workflow-core').TemplateVersionCatalog;
}

// Render routes — server-side template rendering
// Phase 2: ProductTemplate multi-flow
// Replaces old /api/render workflow endpoint with /api/render/template

import type { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import { WorkflowExecutorNodeJs, FlowResolverError } from '@prism/workflow-core';
import { nodeExecutors } from '@prism/image-ops/nodejs';
import { validateRenderRequest } from '@prism/shared-types';

const executor = new WorkflowExecutorNodeJs({ nodeExecutors });

interface RenderTemplateBody {
  templateId: string;
  userParams?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  format?: 'png' | 'jpeg';
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

function contentTypeFor(format: 'png' | 'jpeg') {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png';
}

const renderRoutes: FastifyPluginAsync<
  FastifyPluginOptions & RenderRoutesOptions
> = async (fastify: FastifyInstance, options) => {
  const catalog = options.catalog;

  // M2-C error → HTTP status mapping (per design.md §"错误模型").
  function mapRenderError(
    err: unknown,
    reply: { status: (code: number) => { send: (body: Record<string, unknown>) => unknown } },
  ) {
    // ValidationError: ajv schema failure
    if (
      err instanceof Error &&
      (err as { name?: string }).name === 'ValidationError'
    ) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', error: err.message });
    }

    // FlowResolverError: flow resolution failures
    if (err instanceof FlowResolverError) {
      if (err.code === 'REQUESTED_OUTPUT_UNKNOWN') {
        return reply.status(422).send({ code: err.code, error: err.message });
      }
      // FLOW_NOT_FOUND / TEMPLATE_VERSION_NOT_FOUND / DUPLICATE_FLOW_KEY / FLOW_OUTPUTS_MISSING etc.
      return reply.status(404).send({ code: err.code, error: err.message });
    }

    if (err instanceof Error && (err as { name?: string }).name === 'AbortError') {
      return reply.status(504).send({ code: 'RENDER_TIMEOUT', error: 'Render timed out after 30 seconds' });
    }

    return reply.status(500).send({
      code: 'RENDER_FAILED',
      error: err instanceof Error ? err.message : 'Render failed',
    });
  }

  // POST /api/render/design-state
  // M2-C: Deterministic production entry consuming RenderRequest + DesignState.
  fastify.post<{ Body: unknown }>(
    '/design-state',
    async (request, reply) => {
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 30_000);

      try {
        validateRenderRequest(request.body);
        const renderReq = request.body as import('@prism/shared-types').RenderRequest;
        const ds = renderReq.designState;

        // executeFromDesignState handles templateVersion lookup + resolveFlow + executeFlow internally
        const { renderResult } = await executor.executeFromDesignState(ds, {
          catalog,
          signal: ac.signal,
        });

        clearTimeout(timeout);
        return reply.send(renderResult);
      } catch (err: unknown) {
        clearTimeout(timeout);
        request.log.error({ err }, 'Design-state render error');
        return mapRenderError(err, reply);
      }
    },
  );

  // POST /api/render/template
  // @deprecated M2-C: Forward to new /design-state endpoint with backward-compat defaults.
  // Will be removed in M4 (per design.md Decision 5).
  fastify.post<{ Body: RenderTemplateBody }>(
    '/template',
    async (request, reply) => {
      const { templateId, format = 'png' } = request.body;

      // Forward to /design-state with backward-compat defaults:
      // - templateVersion defaults to '1' (legacy default)
      // - flowKey defaults to 'production'
      // - requestedOutputSlots defaults to ['production']
      const renderReq = {
        designState: {
          schemaVersion: 1,
          templateId,
          templateVersion: '1',
          flowKey: 'production',
          inputs: { assets: [], params: request.body.userParams ?? {} },
          createdAt: new Date().toISOString(),
        },
        requestedOutputSlots: ['production'],
      };

      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 30_000);

      try {
        validateRenderRequest(renderReq);
        const { renderResult } = await executor.executeFromDesignState(
          renderReq.designState,
          { catalog, signal: ac.signal },
        );
        clearTimeout(timeout);

        // Extract first output image and return as binary (legacy response format)
        const first = renderResult.outputs[0];
        if (!first) {
          return reply.status(500).send({ code: 'RENDER_FAILED', error: 'No image output from workflow' });
        }
        const imageRef = first.image;
        const previewUrl =
          typeof imageRef === 'string'
            ? imageRef
            : (imageRef as { previewUrl?: string }).previewUrl ?? imageRef.toString();
        const imageBuffer = dataUrlToBuffer(previewUrl);
        const filename = `${templateId}-${Date.now()}.${format}`;
        reply.header('Content-Type', contentTypeFor(format));
        reply.header('Content-Disposition', `inline; filename="${filename}"`);
        return reply.send(imageBuffer);
      } catch (err: unknown) {
        clearTimeout(timeout);
        request.log.error({ err }, 'Design-state render error');
        return mapRenderError(err, reply);
      }
    },
  );

  // Legacy endpoints — reject with 410 Gone
  fastify.post('/workflow', async (_request, reply) => {
    return reply.status(410).send({
      error: 'This endpoint is deprecated. Use POST /api/render/template instead.',
    });
  });

  fastify.post('/batch', async (_request, reply) => {
    return reply.status(410).send({
      error: 'This endpoint is deprecated. Use POST /api/render/template instead.',
    });
  });
};

export default renderRoutes;
