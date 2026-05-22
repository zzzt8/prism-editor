import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/client.js';
import {
  CreateNodePackageSchema,
  UpdateNodePackageSchema,
  NodePackageParamsSchema,
  NodePackageQuerySchema,
} from '../schemas/node-package.js';

const nodeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/nodes', { onRequest: [fastify.authenticate] }, async (request) => {
    const query = NodePackageQuerySchema.parse(request.query);
    const { category, search, sort, page, limit } = query;
    const skip = (page - 1) * limit;
    const userId = (request.user as { userId: string }).userId;

    const where: Record<string, unknown> = { authorId: userId };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const orderBy =
      sort === 'name' ? { name: 'asc' as const } : { createdAt: 'desc' as const };

    const [nodePackages, total] = await Promise.all([
      prisma.nodePackage.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          latestVersion: true,
          latestManifest: true,
          storageType: true,
          authorId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.nodePackage.count({ where }),
    ]);

    return {
      data: nodePackages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  fastify.post('/nodes', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const input = CreateNodePackageSchema.parse(request.body);
    const manifestJson = JSON.stringify(input.manifest);
    const userId = (request.user as { userId: string }).userId;

    try {
      const nodePackage = await prisma.nodePackage.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          latestVersion: input.version,
          latestManifest: manifestJson,
          storageType: 'database',
          authorId: userId,
          versions: {
            create: {
              version: input.version,
              manifest: manifestJson,
              storageType: 'database',
            },
          },
        },
      });

      return { data: nodePackage };
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        return reply.status(409).send({ error: 'Node package with this name already exists' });
      }
      throw error;
    }
  });

  fastify.get('/nodes/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);
    const userId = (request.user as { userId: string }).userId;

    const nodePackage = await prisma.nodePackage.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!nodePackage || nodePackage.authorId !== userId) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    return { data: nodePackage };
  });

  fastify.put('/nodes/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);
    const input = UpdateNodePackageSchema.parse(request.body);
    const userId = (request.user as { userId: string }).userId;

    const existing = await prisma.nodePackage.findUnique({ where: { id } });
    if (!existing || existing.authorId !== userId) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    const updateData: Parameters<typeof prisma.nodePackage.update>[0]['data'] = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.version !== undefined) updateData.latestVersion = input.version;
    if (input.manifest !== undefined) {
      updateData.latestManifest = JSON.stringify(input.manifest);
    }

    if (input.manifest && input.version) {
      const nodePackage = await prisma.$transaction(async (tx) => {
        await tx.nodePackageVersion.create({
          data: {
            packageId: id,
            version: input.version!,
            manifest: JSON.stringify(input.manifest!),
            storageType: 'database',
          },
        });
        return tx.nodePackage.update({
          where: { id },
          data: updateData,
        });
      });
      return { data: nodePackage };
    }

    const nodePackage = await prisma.nodePackage.update({
      where: { id },
      data: updateData,
    });

    return { data: nodePackage };
  });

  fastify.delete('/nodes/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);
    const userId = (request.user as { userId: string }).userId;

    const existing = await prisma.nodePackage.findUnique({ where: { id } });
    if (!existing || existing.authorId !== userId) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    await prisma.nodePackage.delete({ where: { id } });
    return { success: true };
  });

  fastify.get('/nodes/:id/versions', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);
    const userId = (request.user as { userId: string }).userId;

    const existing = await prisma.nodePackage.findUnique({ where: { id } });
    if (!existing || existing.authorId !== userId) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    const versions = await prisma.nodePackageVersion.findMany({
      where: { packageId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        version: true,
        manifest: true,
        storageType: true,
        createdAt: true,
      },
    });

    return { data: versions };
  });

  fastify.get('/nodes/:id/download', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);
    const userId = (request.user as { userId: string }).userId;

    const nodePackage = await prisma.nodePackage.findUnique({ where: { id } });
    if (!nodePackage || nodePackage.authorId !== userId) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    const safeName = nodePackage.name.replace(/"/g, '\\"').replace(/[\r\n]/g, '');
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="${safeName}.json"`);

    return JSON.parse(nodePackage.latestManifest);
  });
};

export default nodeRoutes;
