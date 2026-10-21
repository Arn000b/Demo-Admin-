import Redis from 'ioredis';
import { logger } from '../../lib/logger';
import type {
  RateLimitDecision,
  SharedRateLimitStore,
} from '../../middleware/rate-limit.middleware';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  if (!redisInstance) {
    try {
      redisInstance = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times) {
          // Bounded exponential backoff up to 3s
          return Math.min(times * 200, 3000);
        },
      });

      redisInstance.on('error', (err) => {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          '[Redis] Connection error'
        );
      });

      redisInstance.on('connect', () => {
        logger.info('[Redis] Connected successfully');
      });
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        '[Redis] Initialization failed'
      );
      return null;
    }
  }

  return redisInstance;
}

const RATE_LIMIT_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])

local current = redis.call('INCR', key)
if current == 1 then
  redis.call('PEXPIRE', key, windowMs)
end

local pttl = redis.call('PTTL', key)
return {current, pttl}
`;

export class RedisRateLimitStore implements SharedRateLimitStore {
  constructor(private readonly client: Redis | null = getRedisClient()) {}

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    const client = this.client ?? getRedisClient();
    if (!client) {
      throw new Error('Redis rate limiter unavailable: REDIS_URL not configured');
    }

    const redisKey = `ratelimit:${key}`;
    const [rawCurrent, rawPttl] = (await client.eval(
      RATE_LIMIT_LUA,
      1,
      redisKey,
      String(limit),
      String(windowMs)
    )) as [number, number];

    const current = Number(rawCurrent);
    const pttl = Number(rawPttl);

    if (current <= limit) {
      return { allowed: true };
    }

    const retryAfterSeconds = Math.max(1, Math.ceil(pttl / 1000));
    return { allowed: false, retryAfterSeconds };
  }
}

// ─── Simple Cache Helpers ───────────────────────────────────────────────────

export async function getCache(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch (err) {
    logger.warn(
      { key, err: err instanceof Error ? err.message : String(err) },
      '[Redis] getCache failed'
    );
    return null;
  }
}

export async function setCache(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (err) {
    logger.warn(
      { key, err: err instanceof Error ? err.message : String(err) },
      '[Redis] setCache failed'
    );
    return false;
  }
}

export async function delCache(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    logger.warn(
      { key, err: err instanceof Error ? err.message : String(err) },
      '[Redis] delCache failed'
    );
    return false;
  }
}
