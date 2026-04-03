import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { app, errorHandler } from './app.js';
import authRoutes from './routes/auth.js';

const fastify = Fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024, // 10MB
});

await fastify.register(cors, {
  origin: true,
});

await fastify.register(cookie);

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

await fastify.register(jwt, {
  secret: jwtSecret,
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

await fastify.register(app, { prefix: '/api' });
await fastify.register(authRoutes, { prefix: '/api' });

fastify.setErrorHandler(errorHandler);

fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ error: 'Not found' });
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
