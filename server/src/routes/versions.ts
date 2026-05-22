import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import authMiddleware from '../middleware/auth.js';

const VersionParamsSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
});

const VersionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const DiffQuerySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const RollbackBodySchema = z.object({
  versionId: z.string().min(1),
  newVersion: z.string().optional(),
});

const versionRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const getCurrentUserId = (request: FastifyRequest): string => {
    return request.user.userId;
  };

  // GET /api/workflows/:id/versions - List versions
  fastify.get('/workflows/:id/versions', { onRequest: [fastify.authenticate] }, async (request: any, reply: any) => {
    const userId = getCurrentUserId(request);
    const { id } = VersionParamsSchema.parse(request.params);
    const query = VersionQuerySchema.parse(request.query);
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (workflow.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [versions, total] = await Promise.all([
      prisma.workflowVersion.findMany({
        where: { workflowId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          version: true,
          createdBy: true,
          createdAt: true,
        },
      }),
      prisma.workflowVersion.count({ where: { workflowId: id } }),
    ]);

    return {
      data: versions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // GET /api/workflows/:id/versions/:versionId - Get specific version content
  fastify.get('/workflows/:id/versions/:versionId', { onRequest: [fastify.authenticate] }, async (request: any, reply: any) => {
    const userId = getCurrentUserId(request);
    const { id, versionId } = VersionParamsSchema.parse(request.params);

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (workflow.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const version = await prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.workflowId !== id) {
      return reply.status(404).send({ error: 'Version not found' });
    }

    return { data: version };
  });

  // POST /api/workflows/:id/rollback - Rollback to a specific version
  fastify.post('/workflows/:id/rollback', { onRequest: [fastify.authenticate] }, async (request: any, reply: any) => {
    const userId = getCurrentUserId(request);
    const { id } = VersionParamsSchema.parse(request.params);
    const { versionId, newVersion: customVersion } = RollbackBodySchema.parse(request.body);

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (workflow.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const targetVersion = await prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });
    if (!targetVersion || targetVersion.workflowId !== id) {
      return reply.status(404).send({ error: 'Version not found' });
    }

    // Use Prisma transaction: create new version + update workflow
    const result = await prisma.$transaction(async (tx) => {
      // Generate rollback version string (increment minor, reset patch)
      const currentParts = workflow.version.split('.');
      const major = parseInt(currentParts[0] || '1', 10);
      const minor = parseInt(currentParts[1] || '0', 10);
      const rollbackVersionStr = customVersion || `${major}.${minor + 1}.0`;

      // Create a new version recording the rollback
      const rollbackVersion = await tx.workflowVersion.create({
        data: {
          workflowId: id,
          version: rollbackVersionStr,
          content: targetVersion.content,
          createdBy: userId,
        },
      });

      // Update workflow with rolled-back content and new version
      const updatedWorkflow = await tx.workflow.update({
        where: { id },
        data: {
          content: targetVersion.content,
          version: rollbackVersionStr,
        },
      });

      return { rollbackVersion, workflow: updatedWorkflow };
    });

    return { data: result.workflow };
  });

  // GET /api/workflows/:id/diff - Compare two versions
  fastify.get('/workflows/:id/diff', { onRequest: [fastify.authenticate] }, async (request: any, reply: any) => {
    const userId = getCurrentUserId(request);
    const { id } = VersionParamsSchema.parse(request.params);
    const { from: fromId, to: toId } = DiffQuerySchema.parse(request.query);

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    if (workflow.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [fromVersion, toVersion] = await Promise.all([
      prisma.workflowVersion.findUnique({ where: { id: fromId } }),
      prisma.workflowVersion.findUnique({ where: { id: toId } }),
    ]);

    if (!fromVersion || fromVersion.workflowId !== id) {
      return reply.status(404).send({ error: `From version not found` });
    }
    if (!toVersion || toVersion.workflowId !== id) {
      return reply.status(404).send({ error: `To version not found` });
    }

    const diff = computeWorkflowDiff(fromVersion, toVersion);
    return {
      data: {
        from: {
          id: fromVersion.id,
          version: fromVersion.version,
          createdAt: fromVersion.createdAt,
        },
        to: {
          id: toVersion.id,
          version: toVersion.version,
          createdAt: toVersion.createdAt,
        },
        ...diff,
      },
    };
  });
};

function computeWorkflowDiff(
  from: { content: string; version: string; createdAt: Date },
  to: { content: string; version: string; createdAt: Date }
) {
  let fromData: any;
  let toData: any;

  try {
    fromData = JSON.parse(from.content);
    toData = JSON.parse(to.content);
  } catch {
    return {
      nodes: { added: [], removed: [], modified: [] },
      connections: { added: [], removed: [], modified: [] },
    };
  }

  const fromNodes: Record<string, any> = {};
  const toNodes: Record<string, any> = {};
  const fromNodeIds = new Set<string>();
  const toNodeIds = new Set<string>();

  if (fromData.nodes) {
    for (const node of fromData.nodes) {
      fromNodes[node.id] = node;
      fromNodeIds.add(node.id);
    }
  }
  if (toData.nodes) {
    for (const node of toData.nodes) {
      toNodes[node.id] = node;
      toNodeIds.add(node.id);
    }
  }

  const added: any[] = [];
  const removed: any[] = [];
  const modified: any[] = [];

  // Find added nodes (in to but not in from)
  for (const id of toNodeIds) {
    if (!fromNodeIds.has(id)) {
      added.push(toNodes[id]);
    }
  }

  // Find removed nodes (in from but not in to)
  for (const id of fromNodeIds) {
    if (!toNodeIds.has(id)) {
      removed.push(fromNodes[id]);
    }
  }

  // Find modified nodes (exist in both but different)
  for (const id of fromNodeIds) {
    if (toNodeIds.has(id)) {
      const beforeStr = JSON.stringify(fromNodes[id]);
      const afterStr = JSON.stringify(toNodes[id]);
      if (beforeStr !== afterStr) {
        modified.push({
          id,
          type: toNodes[id].type,
          before: fromNodes[id],
          after: toNodes[id],
        });
      }
    }
  }

  // Connections diff
  const fromConns: Record<string, any> = {};
  const toConns: Record<string, any> = {};
  const fromConnIds = new Set<string>();
  const toConnIds = new Set<string>();

  const connKey = (c: any) =>
    `${c.sourceId || c.from}_${c.sourcePort || c.fromPort}_${c.targetId || c.to}_${c.targetPort || c.toPort}`;

  if (fromData.connections) {
    for (const conn of fromData.connections) {
      const key = connKey(conn);
      fromConns[key] = conn;
      fromConnIds.add(key);
    }
  }
  if (toData.connections) {
    for (const conn of toData.connections) {
      const key = connKey(conn);
      toConns[key] = conn;
      toConnIds.add(key);
    }
  }

  const connAdded: any[] = [];
  const connRemoved: any[] = [];
  const connModified: any[] = [];

  for (const id of toConnIds) {
    if (!fromConnIds.has(id)) {
      connAdded.push(toConns[id]);
    }
  }
  for (const id of fromConnIds) {
    if (!toConnIds.has(id)) {
      connRemoved.push(fromConns[id]);
    }
  }
  for (const id of fromConnIds) {
    if (toConnIds.has(id)) {
      const beforeStr = JSON.stringify(fromConns[id]);
      const afterStr = JSON.stringify(toConns[id]);
      if (beforeStr !== afterStr) {
        connModified.push({
          before: fromConns[id],
          after: toConns[id],
        });
      }
    }
  }

  return {
    nodes: { added, removed, modified },
    connections: { added: connAdded, removed: connRemoved, modified: connModified },
  };
}

export default versionRoutes;
