import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createFulfillmentRoutes } from './fulfillment.routes';
import type { FulfillmentService } from './fulfillment.service';
import type { AuthService } from '../auth/auth.types';
import type { Principal } from '../../middleware/auth.middleware';
import { shipmentQuantityFits } from './fulfillment.rules';

const vendor: Principal = { userId: 'v', email: 'v@t.test', role: 'vendor', customerId: null, vendorId: '50000000-0000-4000-8000-000000000001' };
const customer: Principal = { userId: 'c', email: 'c@t.test', role: 'customer', customerId: 'c1', vendorId: null };
function appFor(principal = vendor) {
  const calls: string[] = [];
  const service = {
    createShipment: async () => { calls.push('create'); return { id: 'shipment' }; },
    listShipments: async () => [], updateShipment: async () => ({ id: 'shipment' }),
    createReview: async (_customerId: string, _item: string, rating: number) => ({ id: 'review', rating, isApproved: false }),
    listReviews: async () => [], moderateReview: async () => ({ id: 'review' }),
  } as unknown as FulfillmentService;
  const auth = { resolveSession: async (token: string) => token === 'ok' ? principal : null } as AuthService;
  return { app: new Hono().route('/', createFulfillmentRoutes(service, auth)), calls };
}

test('customers cannot create shipments and invalid shipment quantities are rejected', async () => {
  const customerApp = appFor(customer);
  const forbidden = await customerApp.app.request('/orders/10000000-0000-4000-8000-000000000001/shipments', { method: 'POST', headers: { cookie: 'anonna_session=ok', 'content-type': 'application/json' }, body: JSON.stringify({ items: [{ orderItemId: '10000000-0000-4000-8000-000000000002', quantity: 1 }] }) });
  assert.equal(forbidden.status, 403);
  const vendorApp = appFor();
  const invalid = await vendorApp.app.request('/orders/10000000-0000-4000-8000-000000000001/shipments', { method: 'POST', headers: { cookie: 'anonna_session=ok', 'content-type': 'application/json' }, body: JSON.stringify({ items: [{ orderItemId: '10000000-0000-4000-8000-000000000002', quantity: -1 }] }) });
  assert.equal(invalid.status, 400);
  assert.deepEqual(vendorApp.calls, []);
});

test('vendor shipment mutation and customer review entry points enforce roles', async () => {
  const vendorApp = appFor();
  const shipment = await vendorApp.app.request('/orders/10000000-0000-4000-8000-000000000001/shipments', { method: 'POST', headers: { cookie: 'anonna_session=ok', 'content-type': 'application/json' }, body: JSON.stringify({ items: [{ orderItemId: '10000000-0000-4000-8000-000000000002', quantity: 1 }] }) });
  assert.equal(shipment.status, 201);
  const customerApp = appFor(customer);
  const review = await customerApp.app.request('/reviews', { method: 'POST', headers: { cookie: 'anonna_session=ok', 'content-type': 'application/json' }, body: JSON.stringify({ orderItemId: '10000000-0000-4000-8000-000000000002', rating: 5 }) });
  assert.equal(review.status, 201);
  assert.equal((await review.text()).includes('customerId'), false);
  const statusUpdate = await vendorApp.app.request('/shipments/10000000-0000-4000-8000-000000000003/status', { method: 'PATCH', headers: { cookie: 'anonna_session=ok', 'content-type': 'application/json' }, body: JSON.stringify({ status: 'shipped' }) });
  assert.equal(statusUpdate.status, 200);
  const forbiddenStatus = await customerApp.app.request('/shipments/10000000-0000-4000-8000-000000000003/status', { method: 'PATCH', headers: { cookie: 'anonna_session=ok', 'content-type': 'application/json' }, body: JSON.stringify({ status: 'shipped' }) });
  assert.equal(forbiddenStatus.status, 403);
});

test('shipment allocations cannot exceed the remaining purchased quantity', () => {
  assert.equal(shipmentQuantityFits(5, 0, 5), true);
  assert.equal(shipmentQuantityFits(5, 2, 3), true);
  assert.equal(shipmentQuantityFits(5, 2, 4), false);
  assert.equal(shipmentQuantityFits(5, 6, 1), false);
  assert.equal(shipmentQuantityFits(5, 0, 0), false);
});
