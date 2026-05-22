import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import rateLimit from '@fastify/rate-limit';
import { prisma } from '../db/client.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';
import type { AccessTokenPayload, RefreshTokenPayload } from '../middleware/auth.js';

const isDev = process.env.NODE_ENV !== 'production';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_COOKIE_NAME = 'refreshToken';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';


async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const revoked = await prisma.revokedToken.findUnique({ where: { jti } });
  return revoked !== null;
}

async function addToBlacklist(jti: string): Promise<void> {
  await prisma.revokedToken.upsert({
    where: { jti },
    create: { jti },
    update: {},
  });
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

async function isAdminRequest(email: string): Promise<boolean> {
  const normalized = email.toLowerCase();
  if (ADMIN_EMAILS.includes(normalized)) return true;
  const user = await prisma.user.findUnique({ where: { email: normalized }, select: { role: true } });
  return user?.role === 'admin';
}

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register rate limiting for auth endpoints
  // Dev: 120 req/15min (StrictMode doubles effect calls on mount)
  // Prod: 10 req/15min (brute-force protection)
  await fastify.register(rateLimit, {
    max: isDev ? 120 : 10,
    timeWindow: '15 minutes',
    keyGenerator: async (req) => {
      const body = req.body as Record<string, unknown> | undefined;
      const email = body?.email as string | undefined;
      if (email) {
        const admin = await isAdminRequest(email);
        if (admin) return `admin:${email}`;
      }
      return req.ip;
    },
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
      const payload = await fastify.jwt.verify<RefreshTokenPayload>(refreshToken);

      if (payload.type !== 'refresh') {
        return reply.status(401).send({ error: 'Invalid token type' });
      }

      if (await isTokenBlacklisted(payload.jti)) {
        return reply.status(401).send({ error: 'Token has been revoked' });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Revoke old refresh token
      await addToBlacklist(payload.jti);

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
        const payload = await fastify.jwt.verify<RefreshTokenPayload>(refreshToken);
        await addToBlacklist(payload.jti);
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
      const payload = await request.jwtVerify<AccessTokenPayload>();

      if (payload.type !== 'access') {
        return reply.status(401).send({ error: 'Invalid token type' });
      }

      if (await isTokenBlacklisted(payload.jti)) {
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
    { userId, type: 'access', jti } as AccessTokenPayload,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

  const refreshToken = await fastify.jwt.sign(
    { userId, type: 'refresh', jti } as RefreshTokenPayload,
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