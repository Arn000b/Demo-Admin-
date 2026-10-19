import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { clientAddress, createRateLimitMiddleware, HttpSharedRateLimitStore, type SharedRateLimitStore } from './rate-limit.middleware';

class SharedCounter implements SharedRateLimitStore {
  readonly counts = new Map<string, number>();
  async consume(key: string, limit: number) {
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return count <= limit ? { allowed: true as const } : { allowed: false as const, retryAfterSeconds: 30 };
  }
}

test('shared counter blocks across separate middleware instances', async () => {
  const shared = new SharedCounter();
  const makeApp = () => {
    const app = new Hono();
    app.post('/', createRateLimitMiddleware(shared, 1, 60_000, 'auth:login', { peerAddress: () => '192.0.2.10' }), (c) => c.text('ok'));
    return app;
  };
  assert.equal((await makeApp().request('/', { method: 'POST' })).status, 200);
  const blocked = await makeApp().request('/', { method: 'POST' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '30');
});

test('limiter backend failures fail closed with a generic 503', async () => {
  const app = new Hono();
  app.post('/', createRateLimitMiddleware({ consume: async () => { throw new Error('sensitive backend details'); } }, 1, 1000, 'auth:test'), (c) => c.text('ok'));
  const response = await app.request('/', { method: 'POST' });
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.deepEqual(JSON.parse(body), { success: false, error: 'Authentication temporarily unavailable' });
  assert.doesNotMatch(body, /sensitive/);
});

test('untrusted forwarded headers cannot choose the rate-limit identity', () => {
  const trusted = new Set(['10.0.0.5']);
  assert.equal(clientAddress('198.51.100.7', '203.0.113.1', trusted), '198.51.100.7');
  assert.equal(clientAddress('10.0.0.5', '203.0.113.1', trusted), '203.0.113.1');
  assert.equal(clientAddress('10.0.0.5', '203.0.113.1, 198.51.100.9', trusted), '10.0.0.5');
});

test('HTTP limiter requires configuration and sends only a keyed digest', async () => {
  const missing = new HttpSharedRateLimitStore({ NODE_ENV: 'test' } as NodeJS.ProcessEnv);
  await assert.rejects(missing.consume('private-client-key', 2, 1000));
  let requestBody = '';
  const store = new HttpSharedRateLimitStore({ AUTH_RATE_LIMIT_URL: 'https://limiter.example/v1/consume', AUTH_RATE_LIMIT_TOKEN: 'test-token', NODE_ENV: 'test' } as NodeJS.ProcessEnv, async (_input, init) => {
    requestBody = String(init?.body);
    return Response.json({ allowed: true });
  });
  assert.deepEqual(await store.consume('private-client-key', 2, 1000), { allowed: true });
  assert.doesNotMatch(requestBody, /private-client-key/);
});
