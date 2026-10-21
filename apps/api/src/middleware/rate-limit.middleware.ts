import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { MiddlewareHandler } from 'hono';

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };
export interface SharedRateLimitStore {
  consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision>;
}

export class InMemoryRateLimitStore implements SharedRateLimitStore {
  private readonly windows = new Map<string, { count: number; expiresAt: number }>();
  private nextCleanupAt = 0;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maximumKeys = 50_000
  ) {}

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    const now = this.now();
    if (now >= this.nextCleanupAt) {
      for (const [entryKey, window] of this.windows) {
        if (now >= window.expiresAt) this.windows.delete(entryKey);
      }
      this.nextCleanupAt = now + 60_000;
    }

    const current = this.windows.get(key);
    if (current && now < current.expiresAt) {
      current.count += 1;
      return current.count <= limit
        ? { allowed: true }
        : {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
          };
    }

    if (this.windows.size >= this.maximumKeys) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)) };
    }
    this.windows.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true };
  }
}

export class FallbackRateLimitStore implements SharedRateLimitStore {
  private currentStatus: 'unverified' | 'shared' | 'local-fallback' = 'unverified';

  constructor(
    private readonly shared: SharedRateLimitStore,
    private readonly fallback: SharedRateLimitStore,
    private readonly onDegraded: (degraded: boolean) => void = () => {}
  ) {}

  get status(): 'unverified' | 'shared' | 'local-fallback' {
    return this.currentStatus;
  }

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    try {
      const decision = await this.shared.consume(key, limit, windowMs);
      if (this.currentStatus === 'local-fallback') {
        this.onDegraded(false);
      }
      this.currentStatus = 'shared';
      return decision;
    } catch {
      if (this.currentStatus !== 'local-fallback') {
        this.onDegraded(true);
      }
      this.currentStatus = 'local-fallback';
      return this.fallback.consume(key, limit, windowMs);
    }
  }
}

/** Atomic HTTP adapter contract: the configured service must atomically increment a fixed-window key. */
export class HttpSharedRateLimitStore implements SharedRateLimitStore {
  private readonly endpoint: URL | null;
  private readonly token: string | null;
  private readonly keySecret: string | null;

  constructor(
    env: NodeJS.ProcessEnv = process.env,
    private readonly fetcher: typeof fetch = fetch
  ) {
    const endpoint = env.AUTH_RATE_LIMIT_URL?.trim();
    const token = env.AUTH_RATE_LIMIT_TOKEN?.trim();
    this.endpoint = endpoint ? new URL(endpoint) : null;
    this.token = token || null;
    this.keySecret = token || null;
    if (this.endpoint && env.NODE_ENV === 'production' && this.endpoint.protocol !== 'https:') {
      throw new Error('AUTH_RATE_LIMIT_URL must use HTTPS in production');
    }
  }

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    if (!this.endpoint || !this.token || !this.keySecret)
      throw new Error('Shared rate limiter is not configured');
    const digest = createHmac('sha256', this.keySecret).update(key).digest('hex');
    const response = await this.fetcher(this.endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ key: digest, limit, windowMs }),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) throw new Error('Shared rate limiter request failed');
    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== 'object' ||
      !('allowed' in result) ||
      typeof result.allowed !== 'boolean'
    ) {
      throw new Error('Invalid shared rate limiter response');
    }
    if (result.allowed) return { allowed: true };
    const retry = 'retryAfterSeconds' in result ? result.retryAfterSeconds : undefined;
    if (typeof retry !== 'number' || !Number.isFinite(retry) || retry < 0)
      throw new Error('Invalid shared rate limiter response');
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retry)) };
  }
}

function normalizedIp(value: string | undefined): string | null {
  if (!value) return null;
  const ip = value.trim().replace(/^\[|\]$/g, '');
  if (isIP(ip) === 0) return null;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

export function clientAddress(
  peerAddress: string | undefined,
  forwardedFor: string | undefined,
  realIp: string | undefined,
  trustedProxyIps: ReadonlySet<string>
): string {
  const peer = normalizedIp(peerAddress);
  if (!peer) return 'unknown';
  if (!trustedProxyIps.has(peer)) return peer;
  // The ingress must overwrite these headers; never select an entry from a client-controlled chain.
  if (forwardedFor && !forwardedFor.includes(',')) {
    const forwarded = normalizedIp(forwardedFor);
    if (forwarded) return forwarded;
  }
  if (realIp && !realIp.includes(',')) return normalizedIp(realIp) ?? peer;
  return peer;
}

function peerAddressFromHono(c: Parameters<MiddlewareHandler>[0]): string | undefined {
  const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return env?.incoming?.socket?.remoteAddress;
}

export function createRateLimitMiddleware(
  store: SharedRateLimitStore,
  limit: number,
  windowMs: number,
  scope: string,
  options: {
    trustedProxyIps?: ReadonlySet<string>;
    peerAddress?: (c: Parameters<MiddlewareHandler>[0]) => string | undefined;
  } = {}
): MiddlewareHandler {
  return async (c, next) => {
    const address = clientAddress(
      (options.peerAddress ?? peerAddressFromHono)(c),
      c.req.header('x-forwarded-for'),
      c.req.header('x-real-ip'),
      options.trustedProxyIps ?? new Set()
    );
    try {
      const decision = await store.consume(`${scope}:${address}`, limit, windowMs);
      if (!decision.allowed) {
        c.header('Retry-After', String(decision.retryAfterSeconds));
        return c.json({ success: false, error: 'Too many requests' }, 429);
      }
    } catch {
      return c.json({ success: false, error: 'Authentication temporarily unavailable' }, 503);
    }
    await next();
  };
}

export function configuredTrustedProxyIps(
  raw = process.env.TRUSTED_PROXY_IPS ?? ''
): ReadonlySet<string> {
  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const parsed = values.map(normalizedIp);
  if (parsed.some((ip) => ip === null))
    throw new Error('TRUSTED_PROXY_IPS must contain exact IP addresses');
  return new Set(parsed as string[]);
}
