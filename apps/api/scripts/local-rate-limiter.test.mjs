import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLocalRateLimiter } from './local-rate-limiter.mjs';

const token = 'a'.repeat(64);
const input = (key = 'b'.repeat(64), extra = {}) => ({
  method: 'POST',
  path: '/v1/consume',
  authorization: `Bearer ${token}`,
  body: JSON.stringify({ key, limit: 2, windowMs: 10_000, ...extra }),
});

test('requires a high-entropy local service token', () => {
  assert.throws(() => createLocalRateLimiter({ token: 'short' }), /at least 32 bytes/);
});

test('requires the authenticated consume endpoint and validates request fields', () => {
  const handle = createLocalRateLimiter({ token });
  assert.equal(handle({ ...input(), authorization: 'Bearer wrong' }).status, 401);
  assert.equal(handle({ ...input(), path: '/wrong' }).status, 404);
  assert.equal(handle(input('not-a-digest')).status, 400);
  assert.equal(handle(input('b'.repeat(64), { limit: 0 })).status, 400);
});

test('enforces a shared fixed window from the first request and resets when it expires', () => {
  let currentTime = 1_000;
  const handle = createLocalRateLimiter({ token, now: () => currentTime });
  assert.deepEqual(handle(input()).body, { allowed: true });
  currentTime = 2_000;
  assert.deepEqual(handle(input()).body, { allowed: true });
  currentTime = 3_000;
  assert.deepEqual(handle(input()).body, { allowed: false, retryAfterSeconds: 8 });
  currentTime = 11_000;
  assert.deepEqual(handle(input()).body, { allowed: true });
});

test('fails closed when the in-memory key capacity is exhausted', () => {
  const handle = createLocalRateLimiter({ token, maximumKeys: 1, now: () => 1_000 });
  assert.equal(handle(input('b'.repeat(64))).status, 200);
  assert.equal(handle(input('c'.repeat(64))).status, 503);
});
