import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db/client.js';

interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  jti: string;
}

interface AccessTokenPayload {
  userId: string;
  type: 'access';
  jti: string;
}

export type { AccessTokenPayload, RefreshTokenPayload };

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const revoked = await prisma.revokedToken.findUnique({ where: { jti } });
  return revoked !== null;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: AccessTokenPayload | RefreshTokenPayload;
  }
}

async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<AccessTokenPayload>();

    if (payload.type !== 'access') {
      return reply.status(401).send({ error: 'Invalid token type, expected access token' });
    }

    if (await isTokenBlacklisted(payload.jti)) {
      return reply.status(401).send({ error: 'Token has been revoked' });
    }

    request.user = payload;
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

const authMiddleware: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorate('authenticate', authenticate);
};

export { authenticate };
export default authMiddleware;
