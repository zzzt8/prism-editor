import { FastifyInstance, FastifyPluginAsync, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import authMiddleware from './middleware/auth.js';
import workflowRoutes from './routes/workflow.js';
import publishedRoutes from './routes/published.js';
import nodeRoutes from './routes/nodes.js';
import versionRoutes from './routes/versions.js';
import renderRoutes from './routes/render.js';
import skuRoutes from './routes/sku.js';
import skuRenderRoutes from './routes/sku-render.js';
import assetsRoutes from './routes/assets.js';
import productTemplateRoutes from './routes/product-template.js';

const appPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(authMiddleware, async () => {
    await fastify.register(workflowRoutes);
    await fastify.register(publishedRoutes);
    await fastify.register(nodeRoutes);
    await fastify.register(versionRoutes);
    await fastify.register(renderRoutes);
    await fastify.register(skuRoutes);
    await fastify.register(skuRenderRoutes);
    await fastify.register(assetsRoutes);
    await fastify.register(productTemplateRoutes);
  });
};

// Global error handler for validation and Prisma errors
const errorHandler = (
  error: FastifyError & { code?: string },
  request: any,
  reply: any
) => {
  // Handle Zod/Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation failed',
      details: error.validation.map((v) => ({
        field: v.instancePath || v.params?.missingProperty,
        message: v.message,
      })),
    });
  }

  // Handle Prisma errors
  if (error.code?.startsWith('P')) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      return reply.status(409).send({
        error: 'Resource already exists',
        code: error.code,
      });
    }
    if (error.code === 'P2025') {
      // Record not found
      return reply.status(404).send({
        error: 'Resource not found',
        code: error.code,
      });
    }
    // Other Prisma errors
    request.log.error({ err: error }, 'Prisma error');
    return reply.status(500).send({
      error: 'Database error',
      code: error.code,
    });
  }

  // Handle known client errors (4xx)
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: error.message,
    });
  }

  // Unknown errors (5xx)
  request.log.error({ err: error }, 'Unhandled error');
  return reply.status(500).send({
    error: 'Internal server error',
  });
};

export { appPlugin as app, errorHandler };
