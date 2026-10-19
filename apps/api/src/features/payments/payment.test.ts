import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createPaymentRoutes } from './payment.routes';
import type { PaymentService } from './payment.service';
import { verifyPaymentWebhook } from './webhook-signature';
import type { AuthService } from '../auth/auth.types';
import type { Principal } from '../../middleware/auth.middleware';

const customer: Principal = { userId: 'u', email: 'a@b.test', role: 'customer', customerId: 'c', vendorId: null };
function harness(role: Principal = customer) {
  let eventCalls = 0;
  const service = {
    createAttempt: async () => ({ id: 'p', amount: '10.00', status: 'pending' }),
    listPayments: async () => [{ id: 'p', amount: '10.00', status: 'captured' }],
    applyWebhook: async () => { eventCalls++; return { duplicate: true }; },
    requestRefund: async () => ({ id: 'r' }), listRefunds: async () => [],
    decideRefund: async () => ({ id: 'r' }), processRefund: async () => ({ id: 'r' }),
  } as unknown as PaymentService;
  const auth = { resolveSession: async (token: string) => token === 'valid' ? role : null } as AuthService;
  const app = new Hono().route('/payments', createPaymentRoutes(service, auth));
  return { app, calls: () => eventCalls };
}

test('webhook signatures enforce HMAC, timestamp freshness, and secret length', () => {
  const raw = '{"ok":true}', timestamp = String(Math.floor(Date.now() / 1000)), secret = 'x'.repeat(32);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  assert.equal(verifyPaymentWebhook(raw, timestamp, signature, secret), true);
  assert.equal(verifyPaymentWebhook(raw, timestamp, '0'.repeat(64), secret), false);
  assert.equal(verifyPaymentWebhook(raw, String(Number(timestamp) - 301), signature, secret), false);
  assert.equal(verifyPaymentWebhook(raw, timestamp, signature, 'short'), false);
});

test('payment endpoints require customer ownership and omit provider transaction references', async () => {
  const { app } = harness();
  const noAuth = await app.request('/payments/orders/10000000-0000-4000-8000-000000000001/payments', { method: 'POST' });
  assert.equal(noAuth.status, 401);
  const response = await app.request('/payments/orders/10000000-0000-4000-8000-000000000001/payments', { headers: { cookie: 'anonna_session=valid' } });
  assert.equal(response.status, 200);
  assert.equal((await response.text()).includes('transactionId'), false);
});

test('webhook rejects unsigned and malformed input before service mutation', async () => {
  const previousSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  process.env.PAYMENT_WEBHOOK_SECRET = 's'.repeat(32);
  const { app, calls } = harness();
  const badSig = await app.request('/payments/webhook', { method: 'POST', body: '{}', headers: { 'x-payment-timestamp': String(Math.floor(Date.now() / 1000)), 'x-payment-signature': '0'.repeat(64) } });
  assert.equal(badSig.status, 401);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET).update(`${timestamp}.{`).digest('hex');
  const malformed = await app.request('/payments/webhook', { method: 'POST', body: '{', headers: { 'x-payment-timestamp': timestamp, 'x-payment-signature': signature } });
  assert.equal(malformed.status, 400);
  assert.equal(calls(), 0);
  delete process.env.PAYMENT_WEBHOOK_SECRET;
  const missingSecret = await app.request('/payments/webhook', { method: 'POST', body: '{}', headers: { 'x-payment-timestamp': timestamp, 'x-payment-signature': '0'.repeat(64) } });
  assert.equal(missingSecret.status, 401);
  assert.equal(calls(), 0);
  if (previousSecret !== undefined) process.env.PAYMENT_WEBHOOK_SECRET = previousSecret;
});

test('administrative refund actions are forbidden to customers', async () => {
  const { app } = harness();
  const response = await app.request('/payments/admin/refunds', { headers: { cookie: 'anonna_session=valid' } });
  assert.equal(response.status, 403);
});
