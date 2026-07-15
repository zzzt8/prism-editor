// M2-C: FlowCatalog injected at server startup.
// See app.ts: FlowCatalog.create() → passed via fastify-plugin options.
export interface RenderRoutesOptions {
  readonly catalog: import('@prism/workflow-core').TemplateVersionCatalog;
}

// Render routes — server-side template rendering
// Phase 2: ProductTemplate multi-flow
// Replaces old /api/render workflow endpoint with /api/render/template

import type { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import { WorkflowExecutorNodeJs } from '@prism/workflow-core';
import { nodeExecutors } from '@prism/image-ops/nodejs';
import type { Workflow as PrismaWorkflow } from '@prisma/client';
import { Workflow } from '@prism/shared-types';
import {
  getById,
  selectFlowByKey,
  selectProductionFlow,
  TemplateNotFoundError,
  RenderPlatformNotFoundError,
} from '../services/product-template-service.js';
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

  // POST /api/render/design-state
  // M2-C: Deterministic production entry consuming RenderRequest + DesignState.
  // Uses exact (templateId, templateVersion, flowKey) lookup via catalog.
  fastify.post<{ Body: unknown }>(
    '/design-state',
    async (request, reply) => {
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 30_000);

      try {
        validateRenderRequest(request.body);
        const renderReq = request.body as import('@prism/shared-types').RenderRequest;
        const ds = renderReq.designState;

        // 1. Look up templateVersion via catalog
        const templateVersion = catalog.getVersion(ds.templateId, ds.templateVersion);
        if (!templateVersion) {
          return reply.status(404).send({
            code: 'TEMPLATE_VERSION_NOT_FOUND',
            error: `Template version not found: ${ds.templateId}@${ds.templateVersion}`,
          });
        }

        // 2. Look up flow via M2-B resolveFlow (catalog is already TemplateVersion)
        const { resolveFlow } = await import('@prism/workflow-core');
        let flow: import('@prism/shared-types').Flow;
        try {
          flow = resolveFlow(templateVersion, ds.flowKey);
        } catch (err: unknown) {
          const code =
            (err as { code?: string })?.code ?? 'FLOW_NOT_FOUND';
          return reply.status(404).send({
            code,
            error: err instanceof Error ? err.message : `Flow not found: ${ds.flowKey}`,
          });
        }

        // 3. Execute via M2-B executeFromDesignState (method on executor)
        const { renderResult } = await executor.executeFromDesignState(
          ds,
          { catalog, signal: ac.signal },
        );

        clearTimeout(timeout);
        return reply.send(renderResult);
      } catch (err: unknown) {
        clearTimeout(timeout);

        // validateRenderRequest throws ValidationError on invalid RenderRequest
        if (
          err instanceof Error &&
          (err as { name?: string }).name === 'ValidationError'
        ) {
          return reply.status(400).send({
            code: 'VALIDATION_ERROR',
            error: err.message,
          });
        }

        if (err instanceof Error && (err as { name?: string }).name === 'AbortError') {
          return reply.status(504).send({
            code: 'RENDER_TIMEOUT',
            error: 'Render timed out after 30 seconds',
          });
        }

        request.log.error({ err }, 'Design-state render error');
        return reply.status(500).send({
          code: 'RENDER_FAILED',
          error: err instanceof Error ? err.message : 'Render failed',
        });
      }
    },
  );

  // POST /api/render/template
  // Render a ProductTemplate using its production (nodejs) Flow
  fastify.post<{ Body: RenderTemplateBody }>(
    '/template',
    {
      schema: {
        body: {
          type: 'object',
          required: ['templateId'],
          properties: {
            templateId: { type: 'string' },
            userParams: { type: 'object' },
            inputs: { type: 'object' },
            format: { type: 'string', enum: ['png', 'jpeg'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { templateId, format = 'png' } = request.body;

      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 30_000);

      try {
        await getById(templateId);

        const flow: PrismaWorkflow = await selectProductionFlow(templateId);
        const workflow: Workflow = JSON.parse(flow.content);
        const result = await executor.execute(workflow, { signal: ac.signal });

        clearTimeout(timeout);

        if (result.status === 'cancelled') {
          return reply.status(504).send({
            error: 'Render timed out after 30 seconds',
            code: 'RENDER_TIMEOUT',
          });
        }

        if (result.status === 'error') {
          return reply.status(500).send({
            error: result.error ?? 'Render execution failed',
            code: 'RENDER_FAILED',
          });
        }

        const results = result.results ?? {};
        const finalNodeId = Object.keys(results).pop() ?? '';
        const finalOutput = results[finalNodeId] as Record<string, unknown> | undefined;

        let previewUrl: string | undefined;
        if (finalOutput?.previewUrl && typeof finalOutput.previewUrl === 'string') {
          previewUrl = finalOutput.previewUrl;
        } else if (
          finalOutput?.image &&
          typeof finalOutput.image === 'object' &&
          'previewUrl' in finalOutput.image &&
          typeof (finalOutput.image as Record<string, unknown>).previewUrl === 'string'
        ) {
          previewUrl = (finalOutput.image as Record<string, unknown>).previewUrl as string;
        }

        if (!previewUrl) {
          return reply.status(500).send({
            error: 'No image output from workflow',
            code: 'RENDER_FAILED',
          });
        }

        const imageBuffer = dataUrlToBuffer(previewUrl);
        const timestamp = Date.now();
        const filename = `${templateId}-${timestamp}.${format}`;

        reply.header('Content-Type', contentTypeFor(format));
        reply.header('Content-Disposition', `inline; filename="${filename}"`);
        return reply.send(imageBuffer);
      } catch (err: unknown) {
        clearTimeout(timeout);
        request.log.error({ err }, 'Render error');

        if (err instanceof TemplateNotFoundError) {
          return reply.status(404).send({
            error: err.message,
            code: 'TEMPLATE_NOT_FOUND',
          });
        }
        if (err instanceof RenderPlatformNotFoundError) {
          return reply.status(422).send({
            error: err.message,
            code: 'RENDER_PLATFORM_NOT_FOUND',
          });
        }
        if (err instanceof Error && err.name === 'AbortError') {
          return reply.status(504).send({
            error: 'Render timed out after 30 seconds',
            code: 'RENDER_TIMEOUT',
          });
        }

        return reply.status(500).send({
          error: err instanceof Error ? err.message : 'Render failed',
          code: 'RENDER_FAILED',
        });
      }
    }
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
