import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';
import {
  CreateProductTemplateSchema,
  UpdateProductTemplateSchema,
  ProductTemplateParamsSchema,
  ProductTemplateQuerySchema,
  PublishProductTemplateSchema,
} from '../schemas/product-template.js';

const productTemplateRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const getCurrentUserId = (request: FastifyRequest): string => {
    return request.user.userId;
  };

  // GET /api/product-templates - List templates with pagination (public read)
  fastify.get('/product-templates', async (request) => {
    const query = ProductTemplateQuerySchema.parse(request.query);
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.productTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
      }),
      prisma.productTemplate.count({ where }),
    ]);

    return {
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // GET /api/product-templates/:id - Get template by id (public read)
  fastify.get('/product-templates/:id', async (request, reply) => {
    const { id } = ProductTemplateParamsSchema.parse(request.params);
    const template = await prisma.productTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      return reply.status(404).send({ error: 'Product template not found' });
    }
    return { data: template };
  });

  // POST /api/product-templates - Create template (auth required)
  fastify.post('/product-templates', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const input = CreateProductTemplateSchema.parse(request.body);

    const template = await prisma.productTemplate.create({
      data: {
        name: input.name,
        description: input.description,
        version: input.version,
        content: input.content,
        userId,
      },
    });
    return { data: template };
  });

  // PATCH /api/product-templates/:id - Update template (auth required, userId match)
  fastify.patch('/product-templates/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id } = ProductTemplateParamsSchema.parse(request.params);
    const input = UpdateProductTemplateSchema.parse(request.body);

    const existing = await prisma.productTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Product template not found' });
    }
    if (existing.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const template = await prisma.productTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.content !== undefined && { content: input.content }),
      },
    });
    return { data: template };
  });

  // DELETE /api/product-templates/:id - Delete template (auth required, userId match)
  fastify.delete('/product-templates/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id } = ProductTemplateParamsSchema.parse(request.params);

    const existing = await prisma.productTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Product template not found' });
    }
    if (existing.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    await prisma.productTemplate.delete({ where: { id } });
    return { success: true };
  });

  // POST /api/product-templates/:id/publish - Bind to PublishedWorkflow (auth required)
  fastify.post('/product-templates/:id/publish', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id } = ProductTemplateParamsSchema.parse(request.params);
    const input = PublishProductTemplateSchema.parse(request.body);

    const template = await prisma.productTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: 'Product template not found' });
    }
    if (template.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Verify the workflow exists and belongs to the user
    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
    });
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (workflow.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Create or get PublishedWorkflow
    let publishedWorkflow = await prisma.publishedWorkflow.findUnique({
      where: { workflowId: input.workflowId },
    });

    if (!publishedWorkflow) {
      publishedWorkflow = await prisma.publishedWorkflow.create({
        data: {
          workflowId: input.workflowId,
          content: workflow.content,
          publishedBy: userId,
        },
      });
    }

    // Bind product template to published workflow
    const updatedTemplate = await prisma.productTemplate.update({
      where: { id },
      data: { publishedId: publishedWorkflow.id },
    });

    return { data: updatedTemplate };
  });
};

export default productTemplateRoutes;
