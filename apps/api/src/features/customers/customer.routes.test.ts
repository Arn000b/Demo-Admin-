import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createCustomerRoutes } from './customer.routes';
import type { CustomerService } from './customer.controller';
import type { AuthService } from '../auth/auth.types';
import type { Principal } from '../../middleware/auth.middleware';

const admin: Principal = { userId: 'admin-user', email: 'admin@example.test', role: 'admin', customerId: null, vendorId: null };
const customer: Principal = { userId: 'customer-user', email: 'customer@example.test', role: 'customer', customerId: 'customer-1', vendorId: null };

function harness(principal: Principal) {
  const calls: Array<{ method: string; input?: unknown }> = [];
  const service = {
    findAll: async () => ({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
    findById: async () => null,
    create: async (input: unknown) => { calls.push({ method: 'create', input }); return { id: 'new-customer' }; },
    update: async (_id: string, input: unknown) => { calls.push({ method: 'update', input }); return { id: 'customer-1' }; },
    remove: async () => null,
  } as unknown as CustomerService;
  const auth = { resolveSession: async (token: string) => token === 'session' ? principal : null } as AuthService;
  return { app: new Hono().route('/customers', createCustomerRoutes(service, auth)), calls };
}

const headers = { cookie: 'anonna_session=session', 'content-type': 'application/json' };

test('customer creation is admin-only, normalizes email, and rejects unknown role fields', async () => {
  const customerHarness = harness(customer);
  const forbidden = await customerHarness.app.request('/customers', { method: 'POST', headers, body: JSON.stringify({ name: 'Person', email: 'person@example.test' }) });
  assert.equal(forbidden.status, 403);
  assert.equal(customerHarness.calls.length, 0);

  const adminHarness = harness(admin);
  const rejected = await adminHarness.app.request('/customers', { method: 'POST', headers, body: JSON.stringify({ name: 'Person', email: 'person@example.test', role: 'admin' }) });
  assert.equal(rejected.status, 400);
  const accepted = await adminHarness.app.request('/customers', { method: 'POST', headers, body: JSON.stringify({ name: ' Person ', email: ' PERSON@EXAMPLE.TEST ' }) });
  assert.equal(accepted.status, 201);
  assert.deepEqual(adminHarness.calls, [{ method: 'create', input: { name: 'Person', email: 'person@example.test' } }]);
});

test('customers can edit only their own profile and cannot change status or role', async () => {
  const own = harness(customer);
  const roleAttempt = await own.app.request('/customers/customer-1', { method: 'PATCH', headers, body: JSON.stringify({ role: 'admin' }) });
  assert.equal(roleAttempt.status, 400);
  const statusAttempt = await own.app.request('/customers/customer-1', { method: 'PATCH', headers, body: JSON.stringify({ status: 'suspended' }) });
  assert.equal(statusAttempt.status, 403);
  const other = await own.app.request('/customers/customer-2', { method: 'PATCH', headers, body: JSON.stringify({ name: 'Changed' }) });
  assert.equal(other.status, 403);
  assert.equal(own.calls.length, 0);

  const ownUpdate = await own.app.request('/customers/customer-1', { method: 'PATCH', headers, body: JSON.stringify({ name: ' Updated ' }) });
  assert.equal(ownUpdate.status, 200);
  assert.deepEqual(own.calls, [{ method: 'update', input: { name: 'Updated' } }]);
});
