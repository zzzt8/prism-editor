import type { FastifyRequest, FastifyReply } from 'fastify';

const MALL_API_SECRET = process.env.PRISM_API_SECRET || 'dev-secret';

const PUBLIC_ENDPOINTS = ['/api/health'];

function isPublicEndpoint(url: string): boolean {
  return PUBLIC_ENDPOINTS.some((ep) => url.startsWith(ep));
}

export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.url.startsWith('/api/')) return;
  if (isPublicEndpoint(request.url)) return;

  const secret = request.headers['x-prism-secret'];
  if (secret !== MALL_API_SECRET) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
