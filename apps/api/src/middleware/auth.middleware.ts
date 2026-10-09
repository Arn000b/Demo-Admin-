import { Context, Next } from 'hono';

/**
 * Authentication middleware — verify JWT / session before passing to handler.
 * Replace the stub logic below with your real auth provider (e.g., Better Auth, Clerk, Lucia).
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);

  // TODO: Validate token against your auth provider
  // const session = await validateToken(token);
  // if (!session) return c.json({ success: false, error: 'Unauthorized' }, 401);
  // c.set('user', session.user);

  await next();
}
