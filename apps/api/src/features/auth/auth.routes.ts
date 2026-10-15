import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { Hono } from 'hono';
import { z } from 'zod';
import { createAuthMiddleware, SESSION_COOKIE, type AuthEnv } from '../../middleware/auth.middleware';
import { createRateLimitMiddleware, configuredTrustedProxyIps, type SharedRateLimitStore } from '../../middleware/rate-limit.middleware';
import type { AuthService, PublicAccount } from './auth.types';

const registerSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(32).optional(),
}).strict();
const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

function issueCookie(c: Parameters<typeof setCookie>[0], token: string, expiresAt: Date) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api',
    expires: expiresAt,
  });
}

const safeAccount = (account: PublicAccount) => ({
  id: account.userId,
  email: account.email,
  role: account.role,
  customerId: account.customerId,
  vendorId: account.vendorId,
});

function parseFrontendOrigin(raw: string | undefined): string {
  if (!raw) return 'http://localhost:3000';
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export function createAuthRoutes(service: AuthService, rateLimitStore: SharedRateLimitStore) {
  const auth = createAuthMiddleware((token) => service.resolveSession(token));
  const routes = new Hono<AuthEnv>();
  const expectedOrigin = parseFrontendOrigin(process.env.FRONTEND_URL);
  routes.use('*', async (c, next) => {
    const origin = c.req.header('origin');
    if (origin && expectedOrigin && origin !== expectedOrigin) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }
    await next();
  });

  const trustedProxyIps = configuredTrustedProxyIps();
  routes.post('/register', createRateLimitMiddleware(rateLimitStore, 5, 60 * 60 * 1000, 'auth:register', { trustedProxyIps }), async (c) => {
    const parsed = registerSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ success: false, error: 'Invalid registration details' }, 400);
    const result = await service.register(parsed.data);
    if (!result) return c.json({ success: false, error: 'An account with this email already exists' }, 409);
    issueCookie(c, result.token, result.expiresAt);
    return c.json({ success: true, data: { user: safeAccount(result.account), expiresAt: result.expiresAt.toISOString() } }, 201);
  });

  routes.post('/login', createRateLimitMiddleware(rateLimitStore, 10, 15 * 60 * 1000, 'auth:login', { trustedProxyIps }), async (c) => {
    const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ success: false, error: 'Invalid email or password' }, 400);
    const result = await service.login(parsed.data.email, parsed.data.password);
    if (!result) return c.json({ success: false, error: 'Invalid email or password' }, 401);
    issueCookie(c, result.token, result.expiresAt);
    return c.json({ success: true, data: { user: safeAccount(result.account), expiresAt: result.expiresAt.toISOString() } });
  });

  routes.post('/logout', async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await service.revokeSession(token);
    deleteCookie(c, SESSION_COOKIE, { path: '/api', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict' });
    return c.json({ success: true });
  });

  routes.get('/me', auth, (c) => c.json({ success: true, data: { user: safeAccount(c.get('principal')) } }));
  return routes;
}
