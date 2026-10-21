import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RedisRateLimitStore, getCache, setCache, delCache } from './redis';
import {
  FallbackRateLimitStore,
  InMemoryRateLimitStore,
} from '../../middleware/rate-limit.middleware';

test('RedisRateLimitStore throws cleanly when Redis client is unconfigured', async () => {
  const store = new RedisRateLimitStore(null);
  await assert.rejects(async () => {
    await store.consume('test-key', 5, 60_000);
  }, /Redis rate limiter unavailable/);
});

test('FallbackRateLimitStore seamlessly falls back to InMemory when Redis is unconfigured', async () => {
  let degradedReported = false;
  const fallbackStore = new FallbackRateLimitStore(
    new RedisRateLimitStore(null),
    new InMemoryRateLimitStore(),
    (degraded) => {
      if (degraded) degradedReported = true;
    }
  );

  // First request consumes and triggers fallback
  const first = await fallbackStore.consume('client-ip-key', 2, 60_000);
  assert.equal(first.allowed, true);
  assert.equal(degradedReported, true);
  assert.equal(fallbackStore.status, 'local-fallback');

  // Second request consumes within local limit
  const second = await fallbackStore.consume('client-ip-key', 2, 60_000);
  assert.equal(second.allowed, true);

  // Third request exceeds limit
  const third = await fallbackStore.consume('client-ip-key', 2, 60_000);
  assert.equal(third.allowed, false);
});

test('RedisRateLimitStore evaluates atomic Lua response with a mock client', async () => {
  const mockClient = {
    eval: async (
      _script: string,
      _numKeys: number,
      _key: string,
      limit: string,
      _windowMs: string
    ) => {
      // Mock within limit
      return [1, 55000];
    },
  } as unknown as import('ioredis').default;

  const store = new RedisRateLimitStore(mockClient);
  const decision = await store.consume('sample-key', 5, 60_000);
  assert.equal(decision.allowed, true);

  const mockExceededClient = {
    eval: async () => {
      // Mock exceeded limit (6 > 5), 45000ms left
      return [6, 45000];
    },
  } as unknown as import('ioredis').default;

  const exceededStore = new RedisRateLimitStore(mockExceededClient);
  const exceededDecision = await exceededStore.consume('sample-key', 5, 60_000);
  assert.equal(exceededDecision.allowed, false);
  if (!exceededDecision.allowed) {
    assert.equal(exceededDecision.retryAfterSeconds, 45);
  }
});

test('Cache helpers safely return null/false when REDIS_URL is unconfigured', async () => {
  assert.equal(await getCache('non-existent'), null);
  assert.equal(await setCache('test', 'value'), false);
  assert.equal(await delCache('test'), false);
});
