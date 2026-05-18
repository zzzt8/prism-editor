import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/client.js';
import { authenticate } from '../middleware/auth.js';
import {
  PublishWorkflowSchema,
  PublishedWorkflowParamsSchema,
  PublishedWorkflowQuerySchema,
  ImportPublishWorkflowSchema,
} from '../schemas/published.js';

const publishedRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/published - List all published workflows (public read)
  fastify.get('/published', async (request, reply) => {
    const query = PublishedWorkflowQuerySchema.parse(request.query);
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [publishedWorkflows, total] = await Promise.all([
      prisma.publishedWorkflow.findMany({
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
              description: true,
              version: true,
              category: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.publishedWorkflow.count(),
    ]);

    return {
      data: publishedWorkflows.map((pw) => ({
        id: pw.id,
        workflowId: pw.workflowId,
        publishedBy: pw.publishedBy,
        publishedAt: pw.publishedAt,
        workflow: pw.workflow,
        content: pw.content,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // GET /api/published/:id - Get published workflow by id (public read)
  fastify.get('/published/:id', async (request, reply) => {
    const { id } = PublishedWorkflowParamsSchema.parse(request.params);

    const published = await prisma.publishedWorkflow.findUnique({
      where: { id },
      include: {
        workflow: true,
      },
    });

    if (!published) {
      return reply.status(404).send({ error: 'Published workflow not found' });
    }

    return {
      data: {
        id: published.id,
        workflowId: published.workflowId,
        publishedBy: published.publishedBy,
        publishedAt: published.publishedAt,
        workflow: published.workflow,
        content: published.content,
      },
    };
  });

  // POST /api/published - Publish a workflow
  fastify.post('/published', { onRequest: [authenticate] }, async (request, reply) => {
    const input = PublishWorkflowSchema.parse(request.body);
    const userId = (request.user as { userId: string }).userId;

    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
    });

    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    if (workflow.userId !== userId) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    const existingPublished = await prisma.publishedWorkflow.findUnique({
      where: { workflowId: input.workflowId },
    });
    if (existingPublished) {
      return reply.status(409).send({ error: 'Workflow already published' });
    }

    const contentToStore = input.content ?? workflow.content;

    const published = await prisma.$transaction(async (tx) => {
      const pw = await tx.publishedWorkflow.create({
        data: {
          workflowId: input.workflowId,
          content: contentToStore,
          publishedBy: input.publishedBy,
        },
      });
      await tx.workflow.update({
        where: { id: input.workflowId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
      return pw;
    });

    return { data: published };
  });

  // DELETE /api/published/:id - Unpublish a workflow
  fastify.delete('/published/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const { id } = PublishedWorkflowParamsSchema.parse(request.params);
    const userId = (request.user as { userId: string }).userId;

    const published = await prisma.publishedWorkflow.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!published || published.workflow.userId !== userId) {
      return reply.status(404).send({ error: 'Published workflow not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.publishedWorkflow.delete({ where: { id } });
      await tx.workflow.update({
        where: { id: published.workflowId },
        data: {
          status: 'DRAFT',
          publishedAt: null,
        },
      });
    });

    return { success: true };
  });

  // POST /api/published/import - Import and publish a workflow directly
  fastify.post('/published/import', { onRequest: [authenticate] }, async (request, reply) => {
    const input = ImportPublishWorkflowSchema.parse(request.body);
    const userId = (request.user as { userId: string }).userId;

    const published = await prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          name: input.name,
          description: input.description,
          content: input.content,
          category: input.category || 'imported',
          version: input.version || '1.0.0',
          status: 'PUBLISHED',
          publishedAt: new Date(),
          userId,
        },
      });

      const pw = await tx.publishedWorkflow.create({
        data: {
          workflowId: workflow.id,
          content: input.content,
          publishedBy: input.publishedBy,
        },
      });

      return { workflow, published: pw };
    });

    return {
      data: {
        id: published.published.id,
        workflowId: published.workflow.id,
        publishedBy: published.published.publishedBy,
        publishedAt: published.published.publishedAt,
        workflow: {
          id: published.workflow.id,
          name: published.workflow.name,
          description: published.workflow.description,
          version: published.workflow.version,
          category: published.workflow.category,
        },
      },
    };
  });
};

export default publishedRoutes;
