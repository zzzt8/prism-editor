// Render routes — server-side template rendering
// Phase 2: ProductTemplate multi-flow
// Replaces old /api/render workflow endpoint with /api/render/template

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { WorkflowExecutorNodeJs } from '@prism/workflow-core';
import { nodeExecutors } from '@prism/image-ops/nodejs';
import type { Workflow as PrismaWorkflow } from '@prisma/client';
import { Workflow } from '@prism/shared-types';
import {
  getById,
  selectProductionFlow,
  TemplateNotFoundError,
  RenderPlatformNotFoundError,
} from '../services/product-template-service.js';

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

const renderRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
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
