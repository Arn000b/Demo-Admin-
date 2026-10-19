import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createAdministrationRoutes } from './administration.routes';
import type { AdministrationService } from './administration.service';
import type { AuthService } from '../auth/auth.types';
import type { Principal } from '../../middleware/auth.middleware';

const admin: Principal = { userId: 'admin-user', email: 'admin@test.invalid', role: 'admin', customerId: null, vendorId: null };
const customer: Principal = { userId: 'customer-user', email: 'customer@test.invalid', role: 'customer', customerId: 'customer-id', vendorId: null };
const vendor: Principal = { userId: 'vendor-user', email: 'vendor@test.invalid', role: 'vendor', customerId: null, vendorId: 'vendor-id' };
function harness() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const service = {
    listVendors: async (...args: unknown[]) => { calls.push({ method: 'listVendors', args }); return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }; },
    createVendor: async (input: unknown) => { calls.push({ method: 'createVendor', args: [input] }); return { id: 'vendor-id', ...(input as object), status: 'pending', accountLinked: false }; },
    updateVendor: async (id: string, input: unknown) => { calls.push({ method: 'updateVendor', args: [id, input] }); return { id, ...(input as object) }; },
    linkVendorAccount: async (id: string, email: string) => { calls.push({ method: 'linkVendorAccount', args: [id, email] }); return { id, accountLinked: true }; },
    adminOverview: async () => ({ customers: 2, vendors: 1, products: 3, ordersByStatus: [] }),
    listAdminOrders: async (...args: unknown[]) => { calls.push({ method: 'listAdminOrders', args }); return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }; },
    getAdminOrder: async (id: string) => { calls.push({ method: 'getAdminOrder', args: [id] }); return null; },
    vendorSummary: async (id: string) => { calls.push({ method: 'vendorSummary', args: [id] }); return { products: 2, orderLines: 1 }; },
    vendorProducts: async (...args: unknown[]) => { calls.push({ method: 'vendorProducts', args }); return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }; },
    vendorOrderLines: async (...args: unknown[]) => { calls.push({ method: 'vendorOrderLines', args }); return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }; },
    vendorShipmentLines: async (...args: unknown[]) => { calls.push({ method: 'vendorShipmentLines', args }); return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }; },
  } as unknown as AdministrationService;
  const principals = new Map([['admin-token', admin], ['customer-token', customer], ['vendor-token', vendor]]);
  const auth = { resolveSession: async (token: string) => principals.get(token) ?? null } as AuthService;
  const routes = createAdministrationRoutes(service, auth);
  return { app: new Hono().route('/admin', routes.admin).route('/vendor', routes.vendor), calls };
}
const cookie = (token: string) => ({ cookie: `anonna_session=${token}` });

test('admin can manage vendor profiles but cannot assign a user role or account link', async () => {
  const { app, calls } = harness();
  const create = await app.request('/admin/vendors', { method: 'POST', headers: { ...cookie('admin-token'), 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Demo Seller', email: 'SELLER@example.test', commissionRate: '5.00' }) });
  assert.equal(create.status, 201);
  const output = await create.json();
  assert.equal(output.data.email, 'seller@example.test');
  assert.equal(output.data.status, 'pending');
  assert.equal(output.data.accountLinked, false);
  assert.deepEqual(calls.find((x) => x.method === 'createVendor')?.args[0], { name: 'Demo Seller', email: 'seller@example.test', commissionRate: '5.00' });
  const privileged = await app.request('/admin/vendors', { method: 'POST', headers: { ...cookie('admin-token'), 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Seller', email: 'seller2@example.test', userId: 'attacker-id', status: 'active' }) });
  assert.equal(privileged.status, 400);
  const linked = await app.request('/admin/vendors/10000000-0000-4000-8000-000000000001/account', { method: 'PUT', headers: { ...cookie('admin-token'), 'content-type': 'application/json' }, body: JSON.stringify({ email: 'VENDOR@example.test' }) });
  assert.equal(linked.status, 200);
  assert.deepEqual(calls.find((x) => x.method === 'linkVendorAccount')?.args, ['10000000-0000-4000-8000-000000000001', 'vendor@example.test']);
  assert.equal((await app.request('/admin/orders?page=2&pageSize=10&status=delivered', { headers: cookie('admin-token') })).status, 200);
  assert.deepEqual(calls.find((x) => x.method === 'listAdminOrders')?.args, [2, 10, 'delivered']);
});

test('vendor endpoints require an authenticated vendor and scope queries to the session vendor', async () => {
  const { app, calls } = harness();
  assert.equal((await app.request('/vendor/summary')).status, 401);
  assert.equal((await app.request('/vendor/summary', { headers: cookie('customer-token') })).status, 403);
  assert.equal((await app.request('/admin/vendors', { headers: cookie('customer-token') })).status, 403);
  assert.equal((await app.request('/admin/orders', { headers: cookie('customer-token') })).status, 403);
  assert.equal((await app.request('/vendor/summary', { headers: cookie('vendor-token') })).status, 200);
  assert.equal((await app.request('/vendor/products?page=4&pageSize=12&vendorId=attacker-controlled', { headers: cookie('vendor-token') })).status, 200);
  assert.equal((await app.request('/vendor/orders?page=2&pageSize=10&status=confirmed&vendorId=attacker-controlled', { headers: cookie('vendor-token') })).status, 200);
  assert.equal((await app.request('/vendor/shipments?page=3&pageSize=15', { headers: cookie('vendor-token') })).status, 200);
  assert.deepEqual(calls.filter((x) => x.method === 'vendorSummary')[0]?.args, ['vendor-id']);
  assert.deepEqual(calls.find((x) => x.method === 'vendorProducts')?.args, ['vendor-id', 4, 12]);
  assert.deepEqual(calls.find((x) => x.method === 'vendorOrderLines')?.args, ['vendor-id', 2, 10, 'confirmed']);
  assert.deepEqual(calls.find((x) => x.method === 'vendorShipmentLines')?.args, ['vendor-id', 3, 15]);
});
