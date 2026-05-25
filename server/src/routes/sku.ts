import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client.js';
import {
  CreateSKUSchema,
  UpdateSKUSchema,
  SKUParamsSchema,
  SKUQuerySchema,
  SKUWorkflowsParamsSchema,
  AddWorkflowToSKUSchema,
} from '../schemas/sku.js';

const skuRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Helper to get current user ID from JWT
  const getCurrentUserId = (request: FastifyRequest): string => {
    return request.user.userId;
  };

  // GET /api/skus - List SKUs with pagination and search
  fastify.get('/skus', { onRequest: [fastify.authenticate] }, async (request) => {
    const userId = getCurrentUserId(request);
    const query = SKUQuerySchema.parse(request.query);
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    // Only return SKUs that are associated with workflows owned by the user
    const where: any = {
      workflows: {
        some: {
          workflow: {
            userId,
          },
        },
      },
    };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [skus, total] = await Promise.all([
      prisma.sKU.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          workflows: {
            include: {
              workflow: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.sKU.count({ where }),
    ]);

    // Transform response to include workflow IDs
    const transformedSkus = skus.map((sku) => ({
      id: sku.id,
      code: sku.code,
      name: sku.name,
      description: sku.description,
      inputSchema: JSON.parse(sku.inputSchema),
      workflowIds: sku.workflows.map((w) => w.workflowId),
      createdAt: sku.createdAt,
      updatedAt: sku.updatedAt,
    }));

    return {
      data: transformedSkus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // POST /api/skus - Create SKU
  fastify.post('/skus', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const input = CreateSKUSchema.parse(request.body);

    // Verify all workflowIds belong to the user
    if (input.workflowIds && input.workflowIds.length > 0) {
      const workflows = await prisma.workflow.findMany({
        where: {
          id: { in: input.workflowIds },
          userId,
        },
        select: { id: true },
      });
      const validIds = new Set(workflows.map((w) => w.id));
      const invalidIds = input.workflowIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        return reply.status(400).send({
          error: 'Invalid workflow IDs',
          invalidIds,
        });
      }
    }

    const sku = await prisma.sKU.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        inputSchema: JSON.stringify(input.inputSchema),
        workflows: input.workflowIds && input.workflowIds.length > 0
          ? {
              create: input.workflowIds.map((workflowId) => ({
                workflowId,
              })),
            }
          : undefined,
      },
      include: {
        workflows: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      data: {
        id: sku.id,
        code: sku.code,
        name: sku.name,
        description: sku.description,
        inputSchema: JSON.parse(sku.inputSchema),
        workflowIds: sku.workflows.map((w) => w.workflowId),
        createdAt: sku.createdAt,
        updatedAt: sku.updatedAt,
      },
    };
  });

  // GET /api/skus/:id - Get SKU by id
  fastify.get('/skus/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id } = SKUParamsSchema.parse(request.params);

    const sku = await prisma.sKU.findUnique({
      where: { id },
      include: {
        workflows: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!sku) {
      return reply.status(404).send({ error: 'SKU not found' });
    }

    // Check if user has access (owns at least one associated workflow)
    const hasAccess = sku.workflows.some((w) => w.workflow.userId === userId);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return {
      data: {
        id: sku.id,
        code: sku.code,
        name: sku.name,
        description: sku.description,
        inputSchema: JSON.parse(sku.inputSchema),
        workflowIds: sku.workflows.map((w) => w.workflowId),
        createdAt: sku.createdAt,
        updatedAt: sku.updatedAt,
      },
    };
  });

  // PUT /api/skus/:id - Update SKU
  fastify.put('/skus/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id } = SKUParamsSchema.parse(request.params);
    const input = UpdateSKUSchema.parse(request.body);

    // Check existing SKU and access
    const existing = await prisma.sKU.findUnique({
      where: { id },
      include: {
        workflows: {
          include: {
            workflow: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'SKU not found' });
    }

    const hasAccess = existing.workflows.some((w) => w.workflow.userId === userId);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const updated = await prisma.sKU.update({
      where: { id },
      data: {
        ...(input.code !== undefined && { code: input.code }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.inputSchema !== undefined && { inputSchema: JSON.stringify(input.inputSchema) }),
      },
    });

    return {
      data: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        description: updated.description,
        inputSchema: JSON.parse(updated.inputSchema),
        workflowIds: existing.workflows.map((w) => w.workflowId),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  });

  // DELETE /api/skus/:id - Delete SKU
  fastify.delete('/skus/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id } = SKUParamsSchema.parse(request.params);

    // Check existing SKU and access
    const existing = await prisma.sKU.findUnique({
      where: { id },
      include: {
        workflows: {
          include: {
            workflow: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'SKU not found' });
    }

    const hasAccess = existing.workflows.some((w) => w.workflow.userId === userId);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    await prisma.sKU.delete({ where: { id } });
    return { success: true };
  });

  // POST /api/skus/:id/workflows - Add workflow to SKU
  fastify.post('/skus/:id/workflows', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id } = SKUWorkflowsParamsSchema.parse(request.params);
    const { workflowId } = AddWorkflowToSKUSchema.parse(request.body);

    try {
      // Check existing SKU and access
      const existingSku = await prisma.sKU.findUnique({
        where: { id },
        include: {
          workflows: {
            include: {
              workflow: {
                select: { userId: true },
              },
            },
          },
        },
      });

      if (!existingSku) {
        return reply.status(404).send({ error: 'SKU not found' });
      }

      const hasAccess = existingSku.workflows.some((w) => w.workflow.userId === userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Check workflow exists and belongs to user
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }

      if (workflow.userId !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Check if association already exists
      const existingAssociation = await prisma.sKUWorkflow.findUnique({
        where: {
          skuId_workflowId: {
            skuId: id,
            workflowId,
          },
        },
      });

      if (existingAssociation) {
        return reply.status(409).send({ error: 'Workflow already associated with SKU' });
      }

      // Create association
      await prisma.sKUWorkflow.create({
        data: {
          skuId: id,
          workflowId,
        },
      });

      return {
        data: {
          skuId: id,
          workflowId,
          success: true,
        },
      };
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          return reply.status(404).send({ error: 'Resource not found' });
        }
        if (err.code === 'P2002') {
          return reply.status(409).send({ error: 'Workflow already associated with SKU' });
        }
      }
      throw err;
    }
  });

  // DELETE /api/skus/:id/workflows/:workflowId - Remove workflow from SKU
  fastify.delete('/skus/:id/workflows/:workflowId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const { id, workflowId } = SKUWorkflowsParamsSchema.parse(request.params);

    try {
      // Check existing SKU and access
      const existingSku = await prisma.sKU.findUnique({
        where: { id },
        include: {
          workflows: {
            include: {
              workflow: {
                select: { userId: true },
              },
            },
          },
        },
      });

      if (!existingSku) {
        return reply.status(404).send({ error: 'SKU not found' });
      }

      const hasAccess = existingSku.workflows.some((w) => w.workflow.userId === userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Delete association
      await prisma.sKUWorkflow.delete({
        where: {
          skuId_workflowId: {
            skuId: id,
            workflowId,
          },
        },
      });

      return { success: true };
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          return reply.status(404).send({ error: 'Resource not found' });
        }
      }
      throw err;
    }
  });
};

export default skuRoutes;
