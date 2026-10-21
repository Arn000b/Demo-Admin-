import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createPaymentRoutes } from './payment.routes';
import type { PaymentService } from './payment.service';
import type { AuthService } from '../auth/auth.types';
import type { Principal } from '../../middleware/auth.middleware';

const customer: Principal = {
  userId: 'u',
  email: 'a@b.test',
  role: 'customer',
  customerId: 'c',
  vendorId: null,
};
function harness(role: Principal = customer) {
  let eventCalls = 0;
  const callbacks = new Set<string>();
  const service = {
    createAttempt: async () => ({
      id: 'p',
      amount: '10.00',
      status: 'pending',
      checkoutUrl: 'https://sandbox.payment.bkash.com/',
    }),
    listPayments: async () => [{ id: 'p', amount: '10.00', status: 'captured' }],
    acceptBkashCallback: async (paymentId: string, status: string) => {
      const eventId = `${paymentId}:${status}`;
      const duplicate = callbacks.has(eventId);
      callbacks.add(eventId);
      if (!duplicate) eventCalls += 1;
      return { accepted: true, duplicate };
    },
    requestRefund: async () => ({ id: 'r' }),
    listRefunds: async () => [],
    decideRefund: async () => ({ id: 'r' }),
    processRefund: async () => ({ id: 'r' }),
  } as unknown as PaymentService;
  const auth = {
    resolveSession: async (token: string) => (token === 'valid' ? role : null),
  } as AuthService;
  const app = new Hono().route('/payments', createPaymentRoutes(service, auth));
  return { app, calls: () => eventCalls };
}

test('payment endpoints require customer ownership and omit provider transaction references', async () => {
  const { app } = harness();
  const noAuth = await app.request(
    '/payments/orders/10000000-0000-4000-8000-000000000001/payments',
    { method: 'POST' }
  );
  assert.equal(noAuth.status, 401);
  const response = await app.request(
    '/payments/orders/10000000-0000-4000-8000-000000000001/payments',
    { headers: { cookie: 'anonna_session=valid' } }
  );
  assert.equal(response.status, 200);
  assert.equal((await response.text()).includes('transactionId'), false);
});

test('bKash return callback is validated and persisted for asynchronous verification', async () => {
  const { app, calls } = harness();
  const malformed = await app.request(
    '/payments/bkash/callback?paymentID=provider-id&status=unknown'
  );
  assert.equal(malformed.status, 400);
  assert.equal(calls(), 0);
  const accepted = await app.request(
    '/payments/bkash/callback?paymentID=provider-id&status=success'
  );
  assert.equal(accepted.status, 202);
  assert.equal((await accepted.json()).data.status, 'verification_pending');
  assert.equal(calls(), 1);
  const duplicate = await app.request(
    '/payments/bkash/callback?paymentID=provider-id&status=success'
  );
  assert.equal((await duplicate.json()).data.duplicate, true);
  assert.equal(calls(), 1);
});

test('administrative refund actions are forbidden to customers', async () => {
  const { app } = harness();
  const response = await app.request('/payments/admin/refunds', {
    headers: { cookie: 'anonna_session=valid' },
  });
  assert.equal(response.status, 403);
});
