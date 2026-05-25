import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fs from 'fs/promises';
import path from 'path';

const assetsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/assets/renders/:filename - Serve rendered files
  fastify.get<{ Params: { filename: string } }>(
    '/assets/renders/:filename',
    async (request, reply) => {
      const { filename } = request.params;

      // Validate filename to prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return reply.status(400).send({ error: 'Invalid filename' });
      }

      const filePath = path.resolve(process.cwd(), 'assets', 'renders', filename);

      try {
        const fileHandle = await fs.open(filePath, 'r');
        const stats = await fileHandle.stat();
        const stream = fileHandle.createReadStream();
        await fileHandle.close();

        // Determine content type based on extension
        const ext = path.extname(filename).toLowerCase();
        const contentTypes: Record<string, string> = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.json': 'application/json',
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';

        reply.header('Content-Type', contentType);
        reply.header('Content-Length', stats.size);
        reply.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

        return reply.send(stream);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          return reply.status(404).send({ error: 'File not found' });
        }
        throw err;
      }
    }
  );
};

export default assetsRoutes;
