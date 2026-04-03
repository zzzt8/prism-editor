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

const authMiddleware: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = await request.jwtVerify<AuthUser>();

      if (payload.type !== 'access') {
        return reply.status(401).send({ error: 'Invalid token type, expected access token' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
};

export default authMiddleware;