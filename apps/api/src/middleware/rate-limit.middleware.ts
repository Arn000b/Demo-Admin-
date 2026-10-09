import { Context, Next } from 'hono';

/**
 * Request rate limiter stub.
 * Replace with a real implementation using e.g. @hono/rate-limiter or upstash/ratelimit.
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  // TODO: Implement rate limiting
  await next();
}
