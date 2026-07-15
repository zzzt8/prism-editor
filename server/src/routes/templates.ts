// ProductTemplate CRUD routes + Flow sub-resource routes
// Phase 2: ProductTemplate multi-flow support
//
// NOTE: Fastify v5 has a routing bug where /:id may intercept /.
// We guard inside each /:id handler by checking if id === 'templates' (static path collision).

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

  // GET / — list all templates
  fastify.get('/', async (request, reply) => {
    request.log.info({ url: request.url, params: request.params, method: request.method }, 'GET / handler — LIST TEMPLATES');
    return listTemplates();
  });

  // POST / — create template
  fastify.post('/', async (request, reply) => {
    request.log.info({ url: request.url, params: request.params, method: request.method, body: request.body }, 'POST / handler');
    const parsed = CreateProductTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      request.log.info({ issues: parsed.error.issues }, 'Schema validation failed');
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

  // GET /:id — get template
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // Guard: Fastify v5 may route /api/templates → /:id with id="templates"
    if (id === 'templates') {
      return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: 'ProductTemplate not found: templates' });
    }
    request.log.info({ id, url: request.url }, 'GET /:id');
    try {
      return await getById(id);
    } catch (err: unknown) {
      if (err instanceof TemplateNotFoundError) {
        return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: err.message });
      }
      request.log.error({ err }, 'Failed to get template');
      return reply.status(500).send({ error: 'Failed to get template' });
    }
  });

  // PUT /:id — update template
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // Guard: Fastify v5 may route /api/templates → /:id with id="templates"
    if (id === 'templates') {
      return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: 'ProductTemplate not found: templates' });
    }
    request.log.info({ id, url: request.url }, 'PUT /:id');
    const parsed = UpdateProductTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'TEMPLATE_INVALID',
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }
    try {
      return await update(id, parsed.data);
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

  // DELETE /:id — delete template
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // Guard: Fastify v5 may route /api/templates → /:id with id="templates"
    if (id === 'templates') {
      return reply.status(404).send({ code: 'TEMPLATE_NOT_FOUND', error: 'ProductTemplate not found: templates' });
    }
    request.log.info({ id, url: request.url }, 'DELETE /:id');
    try {
      await deleteTemplate(id);
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

  // GET /:id/flows — list flows
  fastify.get('/:id/flows', async (request, reply) => {
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

  // POST /:id/flows — add flow
  fastify.post('/:id/flows', async (request, reply) => {
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

  // PUT /:id/flows/:flowId — update flow
  fastify.put('/:id/flows/:flowId', async (request, reply) => {
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

  // DELETE /:id/flows/:flowId — delete flow
  fastify.delete('/:id/flows/:flowId', async (request, reply) => {
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
};

export default templatesRoutes;
