// ProductTemplate CRUD routes + Flow sub-resource routes
// Phase 2: ProductTemplate multi-flow support

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
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
} from '../services/product-template-service.js';
import {
  CreateProductTemplateSchema,
  UpdateProductTemplateSchema,
  CreateFlowSchema,
  UpdateFlowSchema,
} from '../schemas/templates.js';

function isPrismaFKError(err: unknown): boolean {
  return typeof (err as any)?.code === 'string' && (err as any).code === 'P2003';
}

const templatesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  // --- ProductTemplate CRUD ---

  // GET /api/templates — list all templates
  fastify.get('/', async () => {
    return listTemplates();
  });

  // POST /api/templates — create template
  fastify.post('/', async (request, reply) => {
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
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      return await getById(request.params.id);
    } catch (err: unknown) {
      if (err instanceof TemplateNotFoundError) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: err.message });
      }
      request.log.error({ err }, 'Failed to get template');
      return reply.status(500).send({ error: 'Failed to get template' });
    }
  });

  // PUT /api/templates/:id — update template
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = UpdateProductTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'TEMPLATE_INVALID',
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await update(request.params.id, parsed.data);
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
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      await deleteTemplate(request.params.id);
      return reply.status(204).send();
    } catch (err: unknown) {
      if (err instanceof TemplateNotFoundError) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: err.message });
      }
      request.log.error({ err }, 'Failed to delete template');
      return reply.status(500).send({ error: 'Failed to delete template' });
    }
  });

  // --- Flow sub-resources ---

  // GET /api/templates/:id/flows — list flows
  fastify.get<{ Params: { id: string } }>('/:id/flows', async (request, reply) => {
    try {
      return await listFlows(request.params.id);
    } catch (err: unknown) {
      if (err instanceof TemplateNotFoundError) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: err.message });
      }
      request.log.error({ err }, 'Failed to list flows');
      return reply.status(500).send({ error: 'Failed to list flows' });
    }
  });

  // POST /api/templates/:id/flows — add flow
  fastify.post<{ Params: { id: string } }>('/:id/flows', async (request, reply) => {
    const parsed = CreateFlowSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'TEMPLATE_INVALID',
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }
    try {
      const flow = await addFlow(request.params.id, parsed.data);
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
  fastify.put<{ Params: { id: string; flowId: string } }>(
    '/:id/flows/:flowId',
    async (request, reply) => {
      const parsed = UpdateFlowSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          code: 'TEMPLATE_INVALID',
          error: 'Invalid input',
          details: parsed.error.flatten(),
        });
      }
      try {
        return await updateFlow(request.params.flowId, parsed.data);
      } catch (err: unknown) {
        if (err instanceof FlowNotFoundError) {
          return reply.status(404).send({ code: 'FLOW_NOT_FOUND', error: err.message });
        }
        request.log.error({ err }, 'Failed to update flow');
        return reply.status(500).send({ error: 'Failed to update flow' });
      }
    }
  );

  // DELETE /api/templates/:id/flows/:flowId — delete flow
  fastify.delete<{ Params: { id: string; flowId: string } }>(
    '/:id/flows/:flowId',
    async (request, reply) => {
      try {
        await deleteFlow(request.params.flowId);
        return reply.status(204).send();
      } catch (err: unknown) {
        if (err instanceof FlowNotFoundError) {
          return reply.status(404).send({ code: 'FLOW_NOT_FOUND', error: err.message });
        }
        request.log.error({ err }, 'Failed to delete flow');
        return reply.status(500).send({ error: 'Failed to delete flow' });
      }
    }
  );
};

export default templatesRoutes;
