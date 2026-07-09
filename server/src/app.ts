import { FastifyInstance, FastifyPluginAsync, FastifyError } from 'fastify';
import assetsRoutes from './routes/assets.js';
import renderRoutes from './routes/render.js';
import {
  listTemplates,
  getById,
  create,
  update,
  deleteTemplate,
  listFlows,
  addFlow,
  updateFlow,
  deleteFlow,
  TemplateNotFoundError,
  FlowNotFoundError,
} from './services/product-template-service.js';
import {
  CreateProductTemplateSchema,
  UpdateProductTemplateSchema,
  CreateFlowSchema,
  UpdateFlowSchema,
} from './schemas/templates.js';

function isPrismaFKError(err: unknown): boolean {
  return typeof (err as any)?.code === 'string' && (err as any).code === 'P2003';
}

// Template CRUD routes registered directly on the app plugin (not via sub-plugin)
// to avoid Fastify v5 router bug where /:id intercepts / within plugin scope.
const appPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(assetsRoutes);

  // GET /api/templates — list all templates
  fastify.get('/templates', async () => listTemplates());

  // POST /api/templates — create template
  fastify.post('/templates', async (request, reply) => {
    const parsed = CreateProductTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'TEMPLATE_INVALID',
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }
    try {
      const template = await create(parsed.data);
      return reply.status(201).send(template);
    } catch (err: unknown) {
      request.log.error({ err }, 'Failed to create template');
      return reply.status(500).send({ error: 'Failed to create template' });
    }
  });

  // GET /api/templates/:id — get template
  fastify.get('/templates/:id', async (request, reply) => {
    try {
      return await getById((request.params as { id: string }).id);
    } catch (err: unknown) {
      if (err instanceof TemplateNotFoundError) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: err.message });
      }
      request.log.error({ err }, 'Failed to get template');
      return reply.status(500).send({ error: 'Failed to get template' });
    }
  });

  // PUT /api/templates/:id — update template
  fastify.put('/templates/:id', async (request, reply) => {
    const parsed = UpdateProductTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'TEMPLATE_INVALID',
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await update((request.params as { id: string }).id, parsed.data);
    } catch (err: unknown) {
      if (err instanceof TemplateNotFoundError) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: err.message });
      }
      if (isPrismaFKError(err)) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: 'Referenced resource not found' });
      }
      request.log.error({ err }, 'Failed to update template');
      return reply.status(500).send({ error: 'Failed to update template' });
    }
  });

  // DELETE /api/templates/:id — delete template
  fastify.delete('/templates/:id', async (request, reply) => {
    try {
      await deleteTemplate((request.params as { id: string }).id);
      return reply.status(204).send();
    } catch (err: unknown) {
      if (err instanceof TemplateNotFoundError) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: err.message });
      }
      request.log.error({ err }, 'Failed to delete template');
      return reply.status(500).send({ error: 'Failed to delete template' });
    }
  });

  // GET /api/templates/:id/flows — list flows
  fastify.get('/templates/:id/flows', async (request, reply) => {
    try {
      return await listFlows((request.params as { id: string }).id);
    } catch (err: unknown) {
      if (err instanceof TemplateNotFoundError) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: err.message });
      }
      request.log.error({ err }, 'Failed to list flows');
      return reply.status(500).send({ error: 'Failed to list flows' });
    }
  });

  // POST /api/templates/:id/flows — add flow
  fastify.post('/templates/:id/flows', async (request, reply) => {
    const parsed = CreateFlowSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'TEMPLATE_INVALID',
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }
    try {
      const flow = await addFlow((request.params as { id: string }).id, parsed.data);
      return reply.status(201).send(flow);
    } catch (err: unknown) {
      if (err instanceof TemplateNotFoundError) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: err.message });
      }
      if (isPrismaFKError(err)) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: 'Referenced template not found' });
      }
      request.log.error({ err }, 'Failed to add flow');
      return reply.status(500).send({ error: 'Failed to add flow' });
    }
  });

  // PUT /api/templates/:id/flows/:flowId — update flow
  fastify.put('/templates/:id/flows/:flowId', async (request, reply) => {
    const parsed = UpdateFlowSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'TEMPLATE_INVALID',
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await updateFlow((request.params as { flowId: string }).flowId, parsed.data);
    } catch (err: unknown) {
      if (err instanceof FlowNotFoundError) {
        return reply.status(404).send({ code: 'FLOW_NOT_FOUND', error: err.message });
      }
      request.log.error({ err }, 'Failed to update flow');
      return reply.status(500).send({ error: 'Failed to update flow' });
    }
  });

  // DELETE /api/templates/:id/flows/:flowId — delete flow
  fastify.delete('/templates/:id/flows/:flowId', async (request, reply) => {
    try {
      await deleteFlow((request.params as { flowId: string }).flowId);
      return reply.status(204).send();
    } catch (err: unknown) {
      if (err instanceof FlowNotFoundError) {
        return reply.status(404).send({ code: 'FLOW_NOT_FOUND', error: err.message });
      }
      request.log.error({ err }, 'Failed to delete flow');
      return reply.status(500).send({ error: 'Failed to delete flow' });
    }
  });

  await fastify.register(renderRoutes, { prefix: '/render' });
};

// Global error handler for validation and Prisma errors
const errorHandler = (
  error: FastifyError & { code?: string },
  request: any,
  reply: any
) => {
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation failed',
      details: error.validation.map((v) => ({
        field: v.instancePath || v.params?.missingProperty,
        message: v.message,
      })),
    });
  }

  if (error.code?.startsWith('P')) {
    if (error.code === 'P2002') {
      return reply.status(409).send({
        error: 'Resource already exists',
        code: error.code,
      });
    }
    if (error.code === 'P2025') {
      return reply.status(404).send({
        error: 'Resource not found',
        code: error.code,
      });
    }
    request.log.error({ err: error }, 'Prisma error');
    return reply.status(500).send({
      error: 'Database error',
      code: error.code,
    });
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: error.message,
    });
  }

  request.log.error({ err: error }, 'Unhandled error');
  return reply.status(500).send({
    error: 'Internal server error',
  });
};

export { appPlugin as app, errorHandler };
