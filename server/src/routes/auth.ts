import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import rateLimit from '@fastify/rate-limit';
import { prisma } from '../db/client.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';

interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
  jti: string;
  iat?: number;
  exp?: number;
}

const REFRESH_COOKIE_NAME = 'refreshToken';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Token blacklist for revocation (in-memory)
const tokenBlacklist = new Set<string>();
const blacklistTimers = new Map<string, ReturnType<typeof setTimeout>>();

function addToBlacklist(jti: string, expiresInMs: number): void {
  tokenBlacklist.add(jti);
  const timer = setTimeout(() => {
    tokenBlacklist.delete(jti);
    blacklistTimers.delete(jti);
  }, expiresInMs);
  blacklistTimers.set(jti, timer);
}

function isTokenBlacklisted(jti: string): boolean {
  return tokenBlacklist.has(jti);
}

function safeParseInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // default 15 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register rate limiting for auth endpoints
  await fastify.register(rateLimit, {
    max: 10,
    timeWindow: '15 minutes',
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.after}`,
    }),
  });

  // POST /api/auth/register
  fastify.post('/auth/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name || null,
      },
    });

    const tokens = await generateTokens(fastify, user.id);

    setRefreshCookie(reply, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
    };
  });

  // POST /api/auth/login
  fastify.post('/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(input.password, user.password);

    if (!validPassword) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const tokens = await generateTokens(fastify, user.id);

    setRefreshCookie(reply, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
    };
  });

  // POST /api/auth/refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return reply.status(401).send({ error: 'No refresh token' });
    }

    try {
      const payload = await fastify.jwt.verify<TokenPayload>(refreshToken);

      if (payload.type !== 'refresh') {
        return reply.status(401).send({ error: 'Invalid token type' });
      }

      if (isTokenBlacklisted(payload.jti)) {
        return reply.status(401).send({ error: 'Token has been revoked' });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Revoke old refresh token
      const ttlMs = (payload.exp! * 1000) - Date.now();
      if (ttlMs > 0) {
        addToBlacklist(payload.jti, ttlMs);
      }

      const tokens = await generateTokens(fastify, user.id);

      setRefreshCookie(reply, tokens.refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        accessToken: tokens.accessToken,
      };
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // POST /api/auth/logout
  fastify.post('/auth/logout', async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      try {
        const payload = await fastify.jwt.verify<TokenPayload>(refreshToken);
        const ttlMs = (payload.exp! * 1000) - Date.now();
        if (ttlMs > 0) {
          addToBlacklist(payload.jti, ttlMs);
        }
      } catch {
        // Token invalid/expired, nothing to blacklist
      }
    }

    reply.clearCookie(REFRESH_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
    });

    return { success: true };
  });

  // GET /api/auth/me
  fastify.get('/auth/me', async (request, reply) => {
    try {
      const payload = await request.jwtVerify<TokenPayload>();

      if (payload.type !== 'access') {
        return reply.status(401).send({ error: 'Invalid token type' });
      }

      if (isTokenBlacklisted(payload.jti)) {
        return reply.status(401).send({ error: 'Token has been revoked' });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      return { user };
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
};

async function generateTokens(fastify: FastifyInstance, userId: string): Promise<AuthTokens> {
  const jti = crypto.randomUUID();

  const accessToken = await fastify.jwt.sign(
    { userId, type: 'access', jti } as any,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

  const refreshToken = await fastify.jwt.sign(
    { userId, type: 'refresh', jti } as any,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

function setRefreshCookie(reply: any, token: string): void {
  const maxAgeMs = parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN);

  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor(maxAgeMs / 1000),
  });
}

export default authRoutes;