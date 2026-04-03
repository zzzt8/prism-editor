import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';
import {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  UpdateWorkflowMetaSchema,
  WorkflowParamsSchema,
  WorkflowQuerySchema,
  ImportWorkflowSchema,
} from '../schemas/workflow.js';

interface AuthUser {
  userId: string;
  type: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

const workflowRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Helper to get current user ID from JWT
  const getCurrentUserId = (request: FastifyRequest): string => {
    return request.user.userId;
  };

  // GET /api/workflows - List workflows with pagination and search (user's own workflows)
  fastify.get('/workflows', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = getCurrentUserId(request);
    const query = WorkflowQuerySchema.parse(request.query);
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          version: true,
          status: true,
          category: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.workflow.count({ where }),
    ]);

    return {
      data: workflows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // POST /api/workflows - Create workflow
  fastify.post('/workflows', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = getCurrentUserId(request);
    const input = CreateWorkflowSchema.parse(request.body);
    const workflow = await prisma.workflow.create({
      data: {
        name: input.name,
        description: input.description,
        content: input.content,
        category: input.category,
        version: input.version,
        userId,
      },
    });
    return { data: workflow };
  });

  // GET /api/workflows/:id - Get workflow by id
  fastify.get('/workflows/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = getCurrentUserId(request);
    const { id } = WorkflowParamsSchema.parse(request.params);
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (workflow.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }
    return { data: workflow };
  });

  // PUT /api/workflows/:id - Update workflow
  fastify.put('/workflows/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = getCurrentUserId(request);
    const { id } = WorkflowParamsSchema.parse(request.params);
    const input = UpdateWorkflowSchema.parse(request.body);

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (existing.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Create a new version snapshot whenever content is saved
    if (input.content !== undefined) {
      await prisma.workflowVersion.create({
        data: {
          workflowId: id,
          version: input.version || existing.version,
          content: input.content,
          createdBy: userId,
        },
      });
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.version !== undefined && { version: input.version }),
      },
    });
    return { data: workflow };
  });

  // DELETE /api/workflows/:id - Delete workflow
  fastify.delete('/workflows/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = getCurrentUserId(request);
    const { id } = WorkflowParamsSchema.parse(request.params);

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (existing.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    await prisma.workflow.delete({ where: { id } });
    return { success: true };
  });

  // PATCH /api/workflows/:id/meta - Update workflow metadata
  fastify.patch('/workflows/:id/meta', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = getCurrentUserId(request);
    const { id } = WorkflowParamsSchema.parse(request.params);
    const input = UpdateWorkflowMetaSchema.parse(request.body);

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (existing.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.category !== undefined && { category: input.category }),
      },
    });
    return { data: workflow };
  });

  // POST /api/workflows/import - Import workflow from JSON
  fastify.post('/workflows/import', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = getCurrentUserId(request);
    const input = ImportWorkflowSchema.parse(request.body);

    const workflow = await prisma.workflow.create({
      data: {
        name: input.name,
        description: input.description,
        content: input.content,
        category: input.category,
        version: input.version || '1.0.0',
        userId,
      },
    });
    return { data: workflow };
  });

  // GET /api/workflows/:id/export - Export workflow as JSON
  fastify.get('/workflows/:id/export', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = getCurrentUserId(request);
    const { id } = WorkflowParamsSchema.parse(request.params);
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (workflow.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const safeName = workflow.name
      .replace(/"/g, '\\"')
      .replace(/[\r\n]/g, '');
    reply.header('Content-Disposition', `attachment; filename="${safeName}.json"`);
    return {
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      content: workflow.content,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  });
};

export default workflowRoutes;