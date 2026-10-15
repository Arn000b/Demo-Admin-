import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createHealthRoutes } from './health.routes';

test('liveness remains healthy without checking database readiness', async () => {
  let readinessChecks = 0;
  const app = new Hono().route('/', createHealthRoutes(async () => {
    readinessChecks += 1;
    return true;
  }));

  const response = await app.request('/health');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
  assert.equal(readinessChecks, 0);
});

test('readiness returns success when the database check succeeds', async () => {
  const app = new Hono().route('/', createHealthRoutes(async () => true));
  const response = await app.request('/ready');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ready' });
});

test('readiness fails closed and hides database errors', async () => {
  const unavailable = new Hono().route('/', createHealthRoutes(async () => false));
  const failed = new Hono().route('/', createHealthRoutes(async () => {
    throw new Error('postgresql://secret:password@host/database');
  }));

  for (const app of [unavailable, failed]) {
    const response = await app.request('/ready');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: 'unavailable' });
  }
});
