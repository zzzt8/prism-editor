import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/client.js';
import {
  CreateNodePackageSchema,
  UpdateNodePackageSchema,
  NodePackageParamsSchema,
  NodePackageQuerySchema,
} from '../schemas/node-package.js';

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

const nodeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const defaultUserId = await getOrCreateDefaultUser();

  // GET /api/nodes - List node packages
  fastify.get('/nodes', async (request) => {
    const query = NodePackageQuerySchema.parse(request.query);
    const { category, search, sort, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
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

  // POST /api/nodes - Upload a node package
  fastify.post('/nodes', async (request, reply) => {
    const input = CreateNodePackageSchema.parse(request.body);
    const manifestJson = JSON.stringify(input.manifest);

    try {
      const nodePackage = await prisma.nodePackage.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          latestVersion: input.version,
          latestManifest: manifestJson,
          storageType: 'database',
          authorId: defaultUserId,
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

  // GET /api/nodes/:id - Get node package detail
  fastify.get('/nodes/:id', async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);
    const nodePackage = await prisma.nodePackage.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!nodePackage) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    return { data: nodePackage };
  });

  // PUT /api/nodes/:id - Update node package
  fastify.put('/nodes/:id', async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);
    const input = UpdateNodePackageSchema.parse(request.body);

    const existing = await prisma.nodePackage.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    // Only the author can update
    if (existing.authorId !== defaultUserId) {
      return reply.status(403).send({ error: 'You are not the author of this node package' });
    }

    const updateData: Parameters<typeof prisma.nodePackage.update>[0]['data'] = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.version !== undefined) updateData.latestVersion = input.version;
    if (input.manifest !== undefined) {
      updateData.latestManifest = JSON.stringify(input.manifest);
    }

    // Create a new version if manifest or version changed
    if (input.manifest && input.version) {
      await prisma.nodePackageVersion.create({
        data: {
          packageId: id,
          version: input.version,
          manifest: JSON.stringify(input.manifest),
          storageType: 'database',
        },
      });
    }

    const nodePackage = await prisma.nodePackage.update({
      where: { id },
      data: updateData,
    });

    return { data: nodePackage };
  });

  // DELETE /api/nodes/:id - Delete node package
  fastify.delete('/nodes/:id', async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);

    const existing = await prisma.nodePackage.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    // Only the author can delete
    if (existing.authorId !== defaultUserId) {
      return reply.status(403).send({ error: 'You are not the author of this node package' });
    }

    await prisma.nodePackage.delete({ where: { id } });
    return { success: true };
  });

  // GET /api/nodes/:id/versions - Get version history
  fastify.get('/nodes/:id/versions', async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);

    const existing = await prisma.nodePackage.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    const versions = await prisma.nodePackageVersion.findMany({
      where: { packageId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        version: true,
        manifest: false, // exclude full manifest for list
        storageType: true,
        createdAt: true,
      },
    });

    return { data: versions };
  });

  // GET /api/nodes/:id/download - Download node package manifest
  fastify.get('/nodes/:id/download', async (request, reply) => {
    const { id } = NodePackageParamsSchema.parse(request.params);

    const nodePackage = await prisma.nodePackage.findUnique({ where: { id } });
    if (!nodePackage) {
      return reply.status(404).send({ error: 'Node package not found' });
    }

    const safeName = nodePackage.name.replace(/"/g, '\\"').replace(/[\r\n]/g, '');
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="${safeName}.json"`);

    return JSON.parse(nodePackage.latestManifest);
  });
};

export default nodeRoutes;
