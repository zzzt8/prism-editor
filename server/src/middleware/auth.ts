import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

interface AuthUser {
  userId: string;
  type: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<AuthUser>();

    if (payload.type !== 'access') {
      return reply.status(401).send({ error: 'Invalid token type, expected access token' });
    }
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

const authMiddleware: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorate('authenticate', authenticate);
};

export { authenticate };
export default authMiddleware;
