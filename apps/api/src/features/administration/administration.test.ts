import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { InMemoryRateLimitStore } from '../../middleware/rate-limit.middleware';
import { createAdministrationRoutes } from './administration.routes';
import type { AdministrationService } from './administration.service';
import type { AuthService } from '../auth/auth.types';
import type { Principal } from '../../middleware/auth.middleware';

const admin: Principal = {
  userId: 'admin-user',
  email: 'admin@test.invalid',
  role: 'admin',
  customerId: null,
  vendorId: null,
};
const customer: Principal = {
  userId: 'customer-user',
  email: 'customer@test.invalid',
  role: 'customer',
  customerId: 'customer-id',
  vendorId: null,
};
const vendor: Principal = {
  userId: 'vendor-user',
  email: 'vendor@test.invalid',
  role: 'vendor',
  customerId: null,
  vendorId: 'vendor-id',
};
function harness() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const service = {
    listVendors: async (...args: unknown[]) => {
      calls.push({ method: 'listVendors', args });
      return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    },
    createVendor: async (input: unknown) => {
      calls.push({ method: 'createVendor', args: [input] });
      return { id: 'vendor-id', ...(input as object), status: 'pending', accountLinked: false };
    },
    applyAsVendor: async (input: unknown) => {
      calls.push({ method: 'applyAsVendor', args: [input] });
      return { id: 'vendor-application', ...(input as object), status: 'pending' };
    },
    updateVendor: async (id: string, input: unknown) => {
      calls.push({ method: 'updateVendor', args: [id, input] });
      return { id, ...(input as object) };
    },
    linkVendorAccount: async (id: string, email: string) => {
      calls.push({ method: 'linkVendorAccount', args: [id, email] });
      return { id, accountLinked: true };
    },
    adminOverview: async () => ({ customers: 2, vendors: 1, products: 3, ordersByStatus: [] }),
    adminAnalytics: async () => ({
      customers: 2,
      vendors: 1,
      products: 3,
      orders: 10,
      totalRevenue: '1500.00',
      averageOrderValue: '150.00',
      ordersByStatus: [],
    }),
    listAdminOrders: async (...args: unknown[]) => {
      calls.push({ method: 'listAdminOrders', args });
      return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    },
    getAdminOrder: async (id: string) => {
      calls.push({ method: 'getAdminOrder', args: [id] });
      return null;
    },
    vendorSummary: async (id: string) => {
      calls.push({ method: 'vendorSummary', args: [id] });
      return { products: 2, orderLines: 1 };
    },
    vendorLedger: async (...args: unknown[]) => {
      calls.push({ method: 'vendorLedger', args });
      return {
        data: [],
        balance: '0.00',
        currency: 'BDT',
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      };
    },
    recordVendorPayout: async (input: unknown) => {
      calls.push({ method: 'recordVendorPayout', args: [input] });
      return { id: 'payout-entry' };
    },
    vendorProducts: async (...args: unknown[]) => {
      calls.push({ method: 'vendorProducts', args });
      return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    },
    vendorOrderLines: async (...args: unknown[]) => {
      calls.push({ method: 'vendorOrderLines', args });
      return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    },
    vendorShipmentLines: async (...args: unknown[]) => {
      calls.push({ method: 'vendorShipmentLines', args });
      return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    },
    listCoupons: async (...args: unknown[]) => {
      calls.push({ method: 'listCoupons', args });
      return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    },
    getCoupon: async (id: string) => {
      calls.push({ method: 'getCoupon', args: [id] });
      return null;
    },
    createCoupon: async (input: unknown) => {
      calls.push({ method: 'createCoupon', args: [input] });
      return { id: 'coupon-1', ...(input as object), timesUsed: 0 };
    },
    updateCoupon: async (id: string, input: unknown) => {
      calls.push({ method: 'updateCoupon', args: [id, input] });
      return { id, ...(input as object) };
    },
    deleteCoupon: async (id: string) => {
      calls.push({ method: 'deleteCoupon', args: [id] });
      return { id };
    },
    getStoreSettings: async () => ({ storeName: 'Anonna Mart', vatPercent: 5 }),
    updateStoreSettings: async (input: unknown) => ({
      storeName: 'Anonna Mart Premium',
      ...(input as object),
    }),
    getFeaturedProductIds: async () => ['10000000-0000-4000-8000-000000000001'],
    setFeaturedProductIds: async (ids: string[]) => ids,
  } as unknown as AdministrationService;
  const principals = new Map([
    ['admin-token', admin],
    ['customer-token', customer],
    ['vendor-token', vendor],
  ]);
  const auth = {
    resolveSession: async (token: string) => principals.get(token) ?? null,
  } as AuthService;
  const routes = createAdministrationRoutes(service, auth, new InMemoryRateLimitStore());
  return {
    app: new Hono()
      .route('/admin', routes.admin)
      .route('/vendor', routes.vendor)
      .route('/vendor-applications', routes.vendorApplications),
    calls,
  };
}
const cookie = (token: string) => ({ cookie: `anonna_session=${token}` });

test('admin can manage vendor profiles but cannot assign a user role or account link', async () => {
  const { app, calls } = harness();
  const create = await app.request('/admin/vendors', {
    method: 'POST',
    headers: { ...cookie('admin-token'), 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Demo Seller',
      email: 'SELLER@example.test',
      commissionRate: '5.00',
    }),
  });
  assert.equal(create.status, 201);
  const output = await create.json();
  assert.equal(output.data.email, 'seller@example.test');
  assert.equal(output.data.status, 'pending');
  assert.equal(output.data.accountLinked, false);
  assert.deepEqual(calls.find((x) => x.method === 'createVendor')?.args[0], {
    name: 'Demo Seller',
    email: 'seller@example.test',
    commissionRate: '5.00',
  });
  const privileged = await app.request('/admin/vendors', {
    method: 'POST',
    headers: { ...cookie('admin-token'), 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Seller',
      email: 'seller2@example.test',
      userId: 'attacker-id',
      status: 'active',
    }),
  });
  assert.equal(privileged.status, 400);
  const linked = await app.request('/admin/vendors/10000000-0000-4000-8000-000000000001/account', {
    method: 'PUT',
    headers: { ...cookie('admin-token'), 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'VENDOR@example.test' }),
  });
  assert.equal(linked.status, 200);
  assert.deepEqual(calls.find((x) => x.method === 'linkVendorAccount')?.args, [
    '10000000-0000-4000-8000-000000000001',
    'vendor@example.test',
  ]);
  assert.equal(
    (
      await app.request('/admin/orders?page=2&pageSize=10&status=delivered', {
        headers: cookie('admin-token'),
      })
    ).status,
    200
  );
  assert.deepEqual(calls.find((x) => x.method === 'listAdminOrders')?.args, [2, 10, 'delivered']);
});

test('vendor endpoints require an authenticated vendor and scope queries to the session vendor', async () => {
  const { app, calls } = harness();
  assert.equal((await app.request('/vendor/summary')).status, 401);
  assert.equal(
    (await app.request('/vendor/summary', { headers: cookie('customer-token') })).status,
    403
  );
  assert.equal(
    (await app.request('/admin/vendors', { headers: cookie('customer-token') })).status,
    403
  );
  const summary = await app.request('/vendor/summary', { headers: cookie('vendor-token') });
  assert.equal(summary.status, 200);
  assert.deepEqual(calls.find((call) => call.method === 'vendorSummary')?.args, ['vendor-id']);
  assert.equal(
    (await app.request('/vendor/products?page=1&pageSize=10', { headers: cookie('vendor-token') }))
      .status,
    200
  );
  assert.deepEqual(calls.find((call) => call.method === 'vendorProducts')?.args, [
    'vendor-id',
    1,
    10,
  ]);
  assert.equal(
    (
      await app.request('/vendor/orders?page=1&pageSize=10&status=confirmed', {
        headers: cookie('vendor-token'),
      })
    ).status,
    200
  );
  assert.deepEqual(calls.find((call) => call.method === 'vendorOrderLines')?.args, [
    'vendor-id',
    1,
    10,
    'confirmed',
  ]);
  assert.equal(
    (await app.request('/vendor/shipments?page=1&pageSize=10', { headers: cookie('vendor-token') }))
      .status,
    200
  );
  assert.deepEqual(calls.find((call) => call.method === 'vendorShipmentLines')?.args, [
    'vendor-id',
    1,
    10,
  ]);
});

test('public vendor applications enter pending review and payouts are admin-only ledger entries', async () => {
  const { app, calls } = harness();
  const application = await app.request('/vendor-applications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'New Vendor',
      email: 'owner@example.test',
      phone: '+880123',
      address: 'Dhaka',
    }),
  });
  assert.equal(application.status, 202);
  assert.equal((await application.json()).data.status, 'pending');
  assert.deepEqual(calls.find((call) => call.method === 'applyAsVendor')?.args[0], {
    name: 'New Vendor',
    email: 'owner@example.test',
    phone: '+880123',
    address: 'Dhaka',
  });

  const denied = await app.request('/admin/vendors/10000000-0000-4000-8000-000000000001/payouts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cookie('customer-token') },
    body: JSON.stringify({ amount: '10.00', idempotencyKey: 'manual-payout-001' }),
  });
  assert.equal(denied.status, 403);
  const payout = await app.request('/admin/vendors/10000000-0000-4000-8000-000000000001/payouts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cookie('admin-token') },
    body: JSON.stringify({ amount: '10.00', idempotencyKey: 'manual-payout-001' }),
  });
  assert.equal(payout.status, 201);
  assert.equal(
    (
      calls.find((call) => call.method === 'recordVendorPayout')?.args[0] as {
        recordedByUserId: string;
      }
    ).recordedByUserId,
    'admin-user'
  );
  assert.equal(
    (await app.request('/vendor/ledger', { headers: cookie('vendor-token') })).status,
    200
  );
});

test('public vendor applications are limited by the shared rate-limit store', async () => {
  const { app } = harness();
  const submit = () =>
    app.request('/vendor-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New Vendor', email: 'owner@example.test' }),
    });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await submit()).status, 202);
  }
  assert.equal((await submit()).status, 429);
});

test('admin can manage coupons and view analytics', async () => {
  const { app, calls } = harness();

  // Non-admins forbidden
  assert.equal(
    (await app.request('/admin/coupons', { headers: cookie('customer-token') })).status,
    403
  );
  assert.equal(
    (await app.request('/admin/analytics', { headers: cookie('customer-token') })).status,
    403
  );

  // List coupons
  const list = await app.request('/admin/coupons?page=1&pageSize=10', {
    headers: cookie('admin-token'),
  });
  assert.equal(list.status, 200);
  assert.deepEqual(calls.find((c) => c.method === 'listCoupons')?.args, [
    1,
    10,
    undefined,
    undefined,
  ]);

  // Create coupon
  const create = await app.request('/admin/coupons', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cookie('admin-token') },
    body: JSON.stringify({
      code: 'SUMMER25',
      discountType: 'percentage',
      discountValue: '25.00',
      minOrderAmount: '500.00',
      usageLimit: 100,
      isActive: true,
    }),
  });
  assert.equal(create.status, 201);
  assert.equal((await create.json()).data.code, 'SUMMER25');

  // Update coupon
  const update = await app.request('/admin/coupons/10000000-0000-4000-8000-000000000001', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...cookie('admin-token') },
    body: JSON.stringify({ isActive: false }),
  });
  assert.equal(update.status, 200);

  // Delete coupon
  const del = await app.request('/admin/coupons/10000000-0000-4000-8000-000000000001', {
    method: 'DELETE',
    headers: cookie('admin-token'),
  });
  assert.equal(del.status, 200);

  // Analytics
  const analytics = await app.request('/admin/analytics', { headers: cookie('admin-token') });
  assert.equal(analytics.status, 200);
  const data = (await analytics.json()).data;
  assert.equal(data.totalRevenue, '1500.00');
  assert.equal(data.orders, 10);
});

test('admin can manage store settings and featured product IDs', async () => {
  const { app } = harness();

  // Settings
  const getSettings = await app.request('/admin/settings', { headers: cookie('admin-token') });
  assert.equal(getSettings.status, 200);
  assert.equal((await getSettings.json()).data.storeName, 'Anonna Mart');

  const updateSettings = await app.request('/admin/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...cookie('admin-token') },
    body: JSON.stringify({ storeName: 'Anonna Mart Premium', vatPercent: 7.5 }),
  });
  assert.equal(updateSettings.status, 200);

  // Featured products
  const getFeatured = await app.request('/admin/featured-products', {
    headers: cookie('admin-token'),
  });
  assert.equal(getFeatured.status, 200);

  const updateFeatured = await app.request('/admin/featured-products', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...cookie('admin-token') },
    body: JSON.stringify({ productIds: ['10000000-0000-4000-8000-000000000001'] }),
  });
  assert.equal(updateFeatured.status, 200);
});
