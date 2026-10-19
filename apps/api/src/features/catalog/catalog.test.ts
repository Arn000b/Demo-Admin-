import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createCatalogRoutes } from './catalog.routes';
import type { CatalogService } from './catalog.service';
import type { AuthService } from '../auth/auth.types';
import type { Principal } from '../../middleware/auth.middleware';
import { ApiError, normalizeDatabaseError } from '../../lib/api-error';
import { assertNoCategoryCycle, priceIntervalsOverlap } from './catalog.rules';

const ids = {
  category: '10000000-0000-4000-8000-000000000001',
  product: '20000000-0000-4000-8000-000000000001',
  variant: '30000000-0000-4000-8000-000000000001',
  warehouse: '40000000-0000-4000-8000-000000000001',
  vendor: '50000000-0000-4000-8000-000000000001',
};
const customer: Principal = { userId: 'u1', email: 'customer@test.invalid', role: 'customer', customerId: 'c1', vendorId: null };
const admin: Principal = { userId: 'u2', email: 'admin@test.invalid', role: 'admin', customerId: null, vendorId: null };
const vendor: Principal = { userId: 'u3', email: 'vendor@test.invalid', role: 'vendor', customerId: null, vendorId: ids.vendor };

function createHarness(principal: Principal = admin) {
  const categoryRows = new Map<string, { id: string; name: string; webSlug: string; parentCategoryId?: string | null }>();
  const productRows = new Map<string, { id: string; categoryId: string; vendorId: string; name: string }>();
  const variantRows = new Map<string, { id: string; productId: string; sku: string }>();
  const warehouseRows = new Map<string, { id: string; name: string; location: string }>();
  const prices: Array<{ variantId: string; validFrom: Date; validUntil: Date | null; listPrice: string }> = [];
  let available = 4;
  let reserved = 0;
  let lock: Promise<void> = Promise.resolve();
  const service = {
    listCategories: async () => ({ data: [...categoryRows.values()], meta: { page: 1, pageSize: 20, total: categoryRows.size, totalPages: 1 } }),
    getCategory: async (id: string) => categoryRows.get(id) ?? null,
    createCategory: async (input: { name: string; webSlug: string; parentCategoryId?: string | null }) => {
      if (input.parentCategoryId && !categoryRows.has(input.parentCategoryId)) throw new ApiError(404, 'Parent category not found');
      const row = { id: ids.category, ...input }; categoryRows.set(row.id, row); return row;
    },
    updateCategory: async (id: string, input: { name?: string; webSlug?: string; parentCategoryId?: string | null }) => {
      const existing = categoryRows.get(id); if (!existing) return null;
      const row = { ...existing, ...input }; categoryRows.set(id, row); return row;
    },
    deleteCategory: async (id: string) => { const row = categoryRows.get(id); categoryRows.delete(id); return row ?? null; },
    listProducts: async () => ({ data: [...productRows.values()], meta: { page: 1, pageSize: 20, total: productRows.size, totalPages: 1 } }),
    getProduct: async (id: string) => productRows.get(id) ?? null,
    getProductVendorId: async (id: string) => productRows.get(id)?.vendorId ?? null,
    createProduct: async (input: { categoryId: string; vendorId: string; name: string }) => {
      if (!categoryRows.has(input.categoryId)) throw new ApiError(404, 'Category not found');
      const row = { id: ids.product, ...input }; productRows.set(row.id, row); return row;
    },
    updateProduct: async (id: string, input: { name?: string }) => { const old = productRows.get(id); if (!old) return null; const row = { ...old, ...input }; productRows.set(id, row); return row; },
    deleteProduct: async (id: string) => { const row = productRows.get(id); productRows.delete(id); return row ?? null; },
    listVariants: async (productId: string) => [...variantRows.values()].filter((v) => v.productId === productId),
    getVariant: async (id: string) => variantRows.get(id) ?? null,
    getVariantVendorId: async (id: string) => productRows.get(variantRows.get(id)?.productId ?? '')?.vendorId ?? null,
    createVariant: async (input: { productId: string; sku: string }) => {
      if ([...variantRows.values()].some((row) => row.sku === input.sku)) throw normalizeDatabaseError({ code: '23505' });
      const row = { id: ids.variant, ...input }; variantRows.set(row.id, row); return row;
    },
    updateVariant: async (id: string, input: { sku?: string }) => { const old = variantRows.get(id); if (!old) return null; const row = { ...old, ...input }; variantRows.set(id, row); return row; },
    deleteVariant: async (id: string) => { const row = variantRows.get(id); variantRows.delete(id); return row ?? null; },
    listPrices: async (variantId: string) => prices.filter((row) => row.variantId === variantId),
    createPrice: async (input: { variantId: string; listPrice: string; validFrom: Date; validUntil?: Date | null }) => {
      if (!variantRows.has(input.variantId)) throw new ApiError(404, 'Variant not found');
      const end = input.validUntil ?? null;
      if (end && end <= input.validFrom) throw new ApiError(400, 'Price end must be later than its start');
      if (prices.some((row) => row.variantId === input.variantId && priceIntervalsOverlap(input.validFrom, end, row.validFrom, row.validUntil))) {
        throw normalizeDatabaseError({ code: '23P01' });
      }
      const row = { ...input, validUntil: end }; prices.push(row); return row;
    },
    listWarehouses: async () => ({ data: [...warehouseRows.values()], meta: { page: 1, pageSize: 20, total: warehouseRows.size, totalPages: 1 } }),
    getWarehouse: async (id: string) => warehouseRows.get(id) ?? null,
    createWarehouse: async (input: { name: string; location: string }) => { const row = { id: ids.warehouse, ...input }; warehouseRows.set(row.id, row); return row; },
    updateWarehouse: async (id: string, input: { name?: string }) => { const old = warehouseRows.get(id); if (!old) return null; const row = { ...old, ...input }; warehouseRows.set(id, row); return row; },
    deleteWarehouse: async (id: string) => { const row = warehouseRows.get(id); warehouseRows.delete(id); return row ?? null; },
    listStock: async () => [{ variantId: ids.variant, warehouseId: ids.warehouse, onHandQty: available, reservedQty: reserved, availableQty: available - reserved }],
    getStockOwner: async (variantId: string) => productRows.get(variantRows.get(variantId)?.productId ?? '')?.vendorId ?? null,
    adjustStock: async (input: { delta: number }) => { if (available + input.delta < reserved) throw new ApiError(409, 'Invalid quantity'); available += input.delta; return { availableQty: available }; },
    reserveStock: async (input: { quantity: number }) => {
      let unlock!: () => void;
      const previous = lock;
      lock = new Promise<void>((resolve) => { unlock = resolve; });
      await previous;
      try {
        if (available - reserved < input.quantity) throw new ApiError(409, 'Insufficient available stock');
        reserved += input.quantity;
        return { onHandQty: available, reservedQty: reserved, availableQty: available - reserved };
      } finally { unlock(); }
    },
    releaseStock: async (input: { quantity: number }) => { if (reserved < input.quantity) throw new ApiError(409, 'Release exceeds reserved stock'); reserved -= input.quantity; return { onHandQty: available, reservedQty: reserved, availableQty: available - reserved }; },
  };
  const authService = { resolveSession: async (token: string) => token === 'valid' ? principal : null } as AuthService;
  const app = new Hono();
  const routes = createCatalogRoutes(service as unknown as CatalogService, authService);
  app.route('/categories', routes.categories).route('/products', routes.products).route('/variants', routes.variants)
    .route('/warehouses', routes.warehouses).route('/inventory', routes.inventory);
  app.onError((error, c) => {
    if (error instanceof ApiError) return c.json({ success: false, error: error.message }, error.status);
    const mapped = normalizeDatabaseError(error);
    if (mapped) return c.json({ success: false, error: mapped.message }, mapped.status);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  });
  const request = (path: string, init: RequestInit = {}) => app.request(path, { ...init, headers: { Cookie: 'anonna_session=valid', ...(init.headers as Record<string, string> | undefined) } });
  return { app, request, state: { categoryRows, productRows, variantRows, warehouseRows, prices, service, get reserved() { return reserved; } } };
}

test('category, product, variant, and warehouse CRUD routes round trip', async () => {
  const h = createHarness();
  const category = await h.request('/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Food', webSlug: 'food' }) });
  assert.equal(category.status, 201);
  assert.equal((await h.request(`/categories/${ids.category}`)).status, 200);
  assert.equal((await h.request(`/categories/${ids.category}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Groceries' }) })).status, 200);

  const product = await h.request('/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: ids.category, vendorId: ids.vendor, name: 'Rice' }) });
  assert.equal(product.status, 201);
  assert.equal((await h.request(`/products/${ids.product}`)).status, 200);
  assert.equal((await h.request(`/products/${ids.product}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Basmati Rice' }) })).status, 200);
  assert.equal((await h.request(`/products/${ids.product}/variants`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: ' rice-1 ' }) })).status, 201);
  assert.equal((await h.request(`/variants/${ids.variant}`)).status, 200);
  assert.equal((await h.request(`/variants/${ids.variant}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: 'RICE-2' }) })).status, 200);

  const warehouse = await h.request('/warehouses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Main', location: 'Dhaka' }) });
  assert.equal(warehouse.status, 201);
  assert.equal((await h.request(`/warehouses/${ids.warehouse}`)).status, 200);
  assert.equal((await h.request(`/warehouses/${ids.warehouse}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Central' }) })).status, 200);
  assert.equal((await h.request(`/variants/${ids.variant}`, { method: 'DELETE' })).status, 200);
  assert.equal((await h.request(`/products/${ids.product}`, { method: 'DELETE' })).status, 200);
  assert.equal((await h.request(`/categories/${ids.category}`, { method: 'DELETE' })).status, 200);
  assert.equal((await h.request(`/warehouses/${ids.warehouse}`, { method: 'DELETE' })).status, 200);
});

test('invalid foreign keys, duplicate SKUs, and price interval conflicts return safe client errors', async () => {
  const h = createHarness();
  const invalidProduct = await h.request('/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: ids.category, vendorId: ids.vendor, name: 'Missing category' }) });
  assert.equal(invalidProduct.status, 404);
  await h.request('/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Food', webSlug: 'food' }) });
  await h.request('/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: ids.category, vendorId: ids.vendor, name: 'Rice' }) });
  const variantInput = { sku: 'SKU-1' };
  assert.equal((await h.request(`/products/${ids.product}/variants`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(variantInput) })).status, 201);
  assert.equal((await h.request(`/products/${ids.product}/variants`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(variantInput) })).status, 409);
  const priceBody = { listPrice: '5.00', validFrom: '2026-01-01T00:00:00Z', validUntil: '2026-02-01T00:00:00Z' };
  assert.equal((await h.request(`/variants/${ids.variant}/prices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(priceBody) })).status, 201);
  assert.equal((await h.request(`/variants/${ids.variant}/prices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...priceBody, validFrom: '2026-01-15T00:00:00Z' }) })).status, 409);
  assert.equal(normalizeDatabaseError({ code: '23503' })?.status, 400);
});

test('vendor ownership and customer mutation requests are denied', async () => {
  const mismatched = createHarness(vendor);
  mismatched.state.productRows.set(ids.product, { id: ids.product, categoryId: ids.category, vendorId: '60000000-0000-4000-8000-000000000001', name: 'Other vendor product' });
  assert.equal((await mismatched.request('/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: ids.category, vendorId: 'attacker', name: 'Rice' }) })).status, 400);
  assert.equal((await mismatched.request(`/products/${ids.product}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Hijack' }) })).status, 403);
  const customerHarness = createHarness(customer);
  assert.equal((await customerHarness.request('/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Food', webSlug: 'food' }) })).status, 403);
  assert.equal((await customerHarness.request('/inventory/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variantId: ids.variant, warehouseId: ids.warehouse, delta: 2 }) })).status, 403);
});

test('vendor cannot mutate another vendor variant, price history, or inventory; unauthenticated writes are denied', async () => {
  const h = createHarness(vendor);
  h.state.productRows.set(ids.product, { id: ids.product, categoryId: ids.category, vendorId: '60000000-0000-4000-8000-000000000001', name: 'Other vendor product' });
  h.state.variantRows.set(ids.variant, { id: ids.variant, productId: ids.product, sku: 'OTHER-1' });
  const json = { 'Content-Type': 'application/json' };
  assert.equal((await h.request(`/variants/${ids.variant}`, { method: 'PATCH', headers: json, body: JSON.stringify({ sku: 'CHANGED' }) })).status, 403);
  assert.equal((await h.request(`/variants/${ids.variant}/prices`, { method: 'POST', headers: json, body: JSON.stringify({ listPrice: '1.00', validFrom: '2026-01-01T00:00:00Z' }) })).status, 403);
  assert.equal((await h.request('/inventory/adjustments', { method: 'POST', headers: json, body: JSON.stringify({ variantId: ids.variant, warehouseId: ids.warehouse, delta: 1 }) })).status, 403);
  assert.equal((await h.app.request('/warehouses', { method: 'POST', headers: json, body: JSON.stringify({ name: 'Unauthorized', location: 'Nowhere' }) })).status, 401);
});

test('unexpected database errors return a generic response without sensitive details', async () => {
  const h = createHarness();
  h.state.service.createWarehouse = async () => { throw new Error('password_hash=secret session_token=secret'); };
  const response = await h.request('/warehouses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Main', location: 'Dhaka' }) });
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.match(body, /Internal Server Error/);
  assert.doesNotMatch(body, /password_hash|session_token|secret/);
});

test('price validation, negative adjustments, and reservation requests reject invalid quantities', async () => {
  const h = createHarness(vendor);
  h.state.productRows.set(ids.product, { id: ids.product, categoryId: ids.category, vendorId: ids.vendor, name: 'Rice' });
  h.state.variantRows.set(ids.variant, { id: ids.variant, productId: ids.product, sku: 'RICE-1' });
  const negative = await h.request('/inventory/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variantId: ids.variant, warehouseId: ids.warehouse, delta: 0 }) });
  assert.equal(negative.status, 400);
  const negativeReserve = await h.request('/inventory/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variantId: ids.variant, warehouseId: ids.warehouse, quantity: -1 }) });
  assert.equal(negativeReserve.status, 400);
  const invalidPrice = await h.request(`/variants/${ids.variant}/prices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listPrice: '1.00', salePrice: '2.00', validFrom: '2026-01-01T00:00:00Z' }) });
  assert.equal(invalidPrice.status, 400);
});

test('authorized stock adjustments and releases preserve reserved quantity bounds', async () => {
  const h = createHarness(vendor);
  h.state.productRows.set(ids.product, { id: ids.product, categoryId: ids.category, vendorId: ids.vendor, name: 'Rice' });
  h.state.variantRows.set(ids.variant, { id: ids.variant, productId: ids.product, sku: 'RICE-1' });
  const body = { variantId: ids.variant, warehouseId: ids.warehouse };
  assert.equal((await h.request('/inventory/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, delta: 1 }) })).status, 200);
  assert.equal((await h.request('/inventory/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, quantity: 2 }) })).status, 200);
  assert.equal((await h.request('/inventory/releases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, quantity: 1 }) })).status, 200);
  assert.equal((await h.request('/inventory/releases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, quantity: 5 }) })).status, 409);
  assert.equal((await h.request('/inventory/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, delta: -5 }) })).status, 409);
});

test('concurrent reservations cannot reserve more than the available quantity', async () => {
  const h = createHarness(vendor);
  h.state.productRows.set(ids.product, { id: ids.product, categoryId: ids.category, vendorId: ids.vendor, name: 'Rice' });
  h.state.variantRows.set(ids.variant, { id: ids.variant, productId: ids.product, sku: 'RICE-1' });
  const requests = Array.from({ length: 10 }, () => h.request('/inventory/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variantId: ids.variant, warehouseId: ids.warehouse, quantity: 1 }) }));
  const responses = await Promise.all(requests);
  assert.equal(responses.filter((response) => response.status === 200).length, 4);
  assert.equal(responses.filter((response) => response.status === 409).length, 6);
  assert.equal(h.state.reserved, 4);
});

test('category ancestry rejects cycles and missing parents; price intervals use half-open boundaries', async () => {
  const parents = new Map<string, string | null>([['a', null], ['b', 'a'], ['c', 'b']]);
  const findParent = async (id: string) => parents.get(id);
  await assert.rejects(() => assertNoCategoryCycle('a', 'c', findParent), { status: 400 });
  await assert.rejects(() => assertNoCategoryCycle('a', 'missing', findParent), { status: 404 });
  assert.equal(priceIntervalsOverlap(new Date('2026-01-01T00:00:00Z'), new Date('2026-02-01T00:00:00Z'), new Date('2026-02-01T00:00:00Z'), null), false);
  assert.equal(priceIntervalsOverlap(new Date('2026-01-01T00:00:00Z'), null, new Date('2026-02-01T00:00:00Z'), null), true);
});
