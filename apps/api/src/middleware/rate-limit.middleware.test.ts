import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import {
  clientAddress,
  createRateLimitMiddleware,
  FallbackRateLimitStore,
  HttpSharedRateLimitStore,
  InMemoryRateLimitStore,
  type SharedRateLimitStore,
} from './rate-limit.middleware';

class SharedCounter implements SharedRateLimitStore {
  readonly counts = new Map<string, number>();
  async consume(key: string, limit: number) {
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return count <= limit
      ? { allowed: true as const }
      : { allowed: false as const, retryAfterSeconds: 30 };
  }
}

test('shared counter blocks across separate middleware instances', async () => {
  const shared = new SharedCounter();
  const makeApp = () => {
    const app = new Hono();
    app.post(
      '/',
      createRateLimitMiddleware(shared, 1, 60_000, 'auth:login', {
        peerAddress: () => '192.0.2.10',
      }),
      (c) => c.text('ok')
    );
    return app;
  };
  assert.equal((await makeApp().request('/', { method: 'POST' })).status, 200);
  const blocked = await makeApp().request('/', { method: 'POST' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '30');
});

test('limiter backend failures fail closed with a generic 503', async () => {
  const app = new Hono();
  app.post(
    '/',
    createRateLimitMiddleware(
      {
        consume: async () => {
          throw new Error('sensitive backend details');
        },
      },
      1,
      1000,
      'auth:test'
    ),
    (c) => c.text('ok')
  );
  const response = await app.request('/', { method: 'POST' });
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.deepEqual(JSON.parse(body), {
    success: false,
    error: 'Authentication temporarily unavailable',
  });
  assert.doesNotMatch(body, /sensitive/);
});

test('local fallback limits requests and reports recovery when the shared store returns', async () => {
  let available = false;
  const changes: boolean[] = [];
  const store = new FallbackRateLimitStore(
    {
      consume: async () => {
        if (!available) throw new Error('limiter unavailable');
        return { allowed: true };
      },
    },
    new InMemoryRateLimitStore(),
    (degraded) => changes.push(degraded)
  );
  assert.equal(store.status, 'unverified');
  assert.deepEqual(await store.consume('auth:login:192.0.2.1', 1, 60_000), { allowed: true });
  assert.equal(store.status, 'local-fallback');
  assert.deepEqual(await store.consume('auth:login:192.0.2.1', 1, 60_000), {
    allowed: false,
    retryAfterSeconds: 60,
  });
  available = true;
  assert.deepEqual(await store.consume('auth:login:192.0.2.1', 1, 60_000), { allowed: true });
  assert.equal(store.status, 'shared');
  assert.deepEqual(changes, [true, false]);
});

test('untrusted forwarded headers cannot choose the rate-limit identity', () => {
  const trusted = new Set(['10.0.0.5']);
  assert.equal(
    clientAddress('198.51.100.7', '203.0.113.1', '203.0.113.2', trusted),
    '198.51.100.7'
  );
  assert.equal(clientAddress('10.0.0.5', '203.0.113.1', undefined, trusted), '203.0.113.1');
  assert.equal(clientAddress('10.0.0.5', undefined, '203.0.113.2', trusted), '203.0.113.2');
  assert.equal(
    clientAddress('10.0.0.5', '203.0.113.1, 198.51.100.9', '203.0.113.2', trusted),
    '203.0.113.2'
  );
  assert.equal(clientAddress('10.0.0.5', undefined, 'not-an-ip', trusted), '10.0.0.5');
});

test('middleware keys trusted proxy requests by the validated forwarded client address', async () => {
  const keys: string[] = [];
  const app = new Hono();
  app.post(
    '/',
    createRateLimitMiddleware(
      {
        consume: async (key) => {
          keys.push(key);
          return { allowed: true };
        },
      },
      10,
      60_000,
      'auth:login',
      {
        trustedProxyIps: new Set(['10.0.0.5']),
        peerAddress: () => '10.0.0.5',
      }
    ),
    (c) => c.text('ok')
  );

  assert.equal(
    (
      await app.request('/', {
        method: 'POST',
        headers: { 'X-Forwarded-For': '198.51.100.8', 'X-Real-IP': '198.51.100.9' },
      })
    ).status,
    200
  );
  assert.equal(
    (
      await app.request('/', {
        method: 'POST',
        headers: { 'X-Real-IP': '198.51.100.10' },
      })
    ).status,
    200
  );
  assert.deepEqual(keys, ['auth:login:198.51.100.8', 'auth:login:198.51.100.10']);
});

test('HTTP limiter requires configuration and sends only a keyed digest', async () => {
  const missing = new HttpSharedRateLimitStore({ NODE_ENV: 'test' } as NodeJS.ProcessEnv);
  await assert.rejects(missing.consume('private-client-key', 2, 1000));
  let requestBody = '';
  const store = new HttpSharedRateLimitStore(
    {
      AUTH_RATE_LIMIT_URL: 'https://limiter.example/v1/consume',
      AUTH_RATE_LIMIT_TOKEN: 'test-token',
      NODE_ENV: 'test',
    } as NodeJS.ProcessEnv,
    async (_input, init) => {
      requestBody = String(init?.body);
      return Response.json({ allowed: true });
    }
  );
  assert.deepEqual(await store.consume('private-client-key', 2, 1000), { allowed: true });
  assert.doesNotMatch(requestBody, /private-client-key/);
});
