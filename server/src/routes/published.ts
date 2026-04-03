import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/client.js';
import {
  PublishWorkflowSchema,
  PublishedWorkflowParamsSchema,
  PublishedWorkflowQuerySchema,
  ImportPublishWorkflowSchema,
} from '../schemas/published.js';

const DEFAULT_USER_ID = 'default-user';

async function getOrCreateDefaultUser(): Promise<string> {
  let user = await prisma.user.findFirst({
    where: { email: 'default@localhost' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'default@localhost',
        name: 'Default User',
        password: 'default',
      },
    });
  }
  return user.id;
}

const publishedRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const defaultUserId = await getOrCreateDefaultUser();
  // GET /api/published - List published workflows
  fastify.get('/published', async (request) => {
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

  // GET /api/published/:id - Get published workflow by id
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
      },
    };
  });

  // POST /api/published - Publish a workflow
  fastify.post('/published', async (request, reply) => {
    const input = PublishWorkflowSchema.parse(request.body);

    // Check if workflow exists
    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
    });
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    // Check if already published
    const existingPublished = await prisma.publishedWorkflow.findUnique({
      where: { workflowId: input.workflowId },
    });
    if (existingPublished) {
      return reply.status(409).send({ error: 'Workflow already published' });
    }

    // Use the provided content (complete PublishedWorkflow JSON) if available,
    // otherwise fall back to the raw draft workflow content
    const contentToStore = input.content ?? workflow.content;

    // Create published workflow and update status in transaction
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
  fastify.delete('/published/:id', async (request, reply) => {
    const { id } = PublishedWorkflowParamsSchema.parse(request.params);

    const published = await prisma.publishedWorkflow.findUnique({
      where: { id },
    });
    if (!published) {
      return reply.status(404).send({ error: 'Published workflow not found' });
    }

    // Delete published workflow and update status in transaction
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
  fastify.post('/published/import', async (request) => {
    const input = ImportPublishWorkflowSchema.parse(request.body);

    // Create workflow and publish in a transaction
    const published = await prisma.$transaction(async (tx) => {
      // Create the workflow
      const workflow = await tx.workflow.create({
        data: {
          name: input.name,
          description: input.description,
          content: input.content,
          category: input.category || 'imported',
          version: input.version || '1.0.0',
          status: 'PUBLISHED',
          publishedAt: new Date(),
          userId: defaultUserId,
        },
      });

      // Create the published workflow entry
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
