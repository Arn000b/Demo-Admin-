import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';

export type AccountRole = 'customer' | 'admin' | 'vendor';
export interface Principal {
  userId: string;
  email: string;
  role: AccountRole;
  customerId: string | null;
  vendorId: string | null;
}
export type AuthEnv = { Variables: { principal: Principal } };
export type SessionResolver = (token: string) => Promise<Principal | null>;

export const SESSION_COOKIE = 'anonna_session';

export function createAuthMiddleware(resolve: SessionResolver): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token || token.length > 200) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const principal = await resolve(token);
    if (!principal) return c.json({ success: false, error: 'Unauthorized' }, 401);
    c.set('principal', principal);
    await next();
  };
}

export function createOptionalAuthMiddleware(
  resolve: SessionResolver
): MiddlewareHandler<{ Variables: { principal?: Principal } }> {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token && token.length <= 200) {
      try {
        const principal = await resolve(token);
        if (principal) c.set('principal', principal);
      } catch {
        // guest request proceeds without principal
      }
    }
    await next();
  };
}

export function requireRole(...roles: AccountRole[]): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    if (!roles.includes(c.get('principal').role)) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }
    await next();
  };
}

export function requireCustomerOwner(param = 'id'): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const principal = c.get('principal');
    if (
      principal.role !== 'admin' &&
      (principal.role !== 'customer' || principal.customerId !== c.req.param(param))
    ) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }
    await next();
  };
}

export function requireVendorOwner(
  resolveVendorId: (resourceId: string) => Promise<string | null>,
  param = 'id'
): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const principal = c.get('principal');
    if (principal.role === 'admin') return next();
    if (principal.role !== 'vendor' || !principal.vendorId)
      return c.json({ success: false, error: 'Forbidden' }, 403);
    const resourceId = c.req.param(param);
    if (!resourceId) return c.json({ success: false, error: 'Forbidden' }, 403);
    const ownerId = await resolveVendorId(resourceId);
    if (ownerId !== principal.vendorId) return c.json({ success: false, error: 'Forbidden' }, 403);
    await next();
  };
}
