import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { app, errorHandler } from './app.js';
import { prisma } from './db/client.js';
import { apiKeyAuth } from './middleware/api-key.js';

const fastify = Fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024, // 10MB
});

const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

await fastify.register(cors, {
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await fastify.register(cookie);

await fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 100, // max 100 files
  },
});

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

// Same payload as /health — dev-tool MigrationStorageAdapter checks /api/health (Vite proxies /api → this server).
fastify.get('/api/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

// API Key authentication for all /api routes
fastify.addHook('preHandler', apiKeyAuth);

await fastify.register(app, { prefix: '/api' });

fastify.setErrorHandler(errorHandler);

fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ error: 'Not found' });
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);

    // Graceful shutdown: close Fastify first, then disconnect Prisma
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      await fastify.close();
      await prisma.$disconnect();
      console.log('Shutdown complete.');
      process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
