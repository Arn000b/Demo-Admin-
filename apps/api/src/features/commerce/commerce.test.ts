import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Hono } from 'hono';
import { ApiError, normalizeDatabaseError } from '../../lib/api-error';
import { createCommerceRoutes } from './commerce.routes';
import type { AuthService, PublicAccount } from '../auth/auth.types';

const account: PublicAccount = {
  userId: 'user-1',
  email: 'customer@example.test',
  role: 'customer',
  customerId: 'customer-1',
  vendorId: null,
};
const vendor: PublicAccount = {
  ...account,
  role: 'vendor',
  customerId: null,
  vendorId: 'vendor-1',
};
const auth: AuthService = {
  register: async () => null,
  login: async () => null,
  revokeSession: async () => undefined,
  resolveSession: async (token) =>
    token === 'customer-token' ? account : token === 'vendor-token' ? vendor : null,
  requestPasswordReset: async () => null,
  resetPassword: async () => false,
  requestEmailVerification: async () => null,
  verifyEmail: async () => false,
};
const calls: Array<{ method: string; args: unknown[] }> = [];
let checkoutFailure: Error | null = null;
const service = {
  getCart: async (...args: [string]) => {
    calls.push({ method: 'getCart', args });
    return { id: 'cart-1', items: [] };
  },
  addCartItem: async (...args: [string, string, number]) => {
    calls.push({ method: 'addCartItem', args });
    return { id: 'item-1', quantity: args[2] };
  },
  updateCartItem: async (...args: [string, string, number]) => {
    calls.push({ method: 'updateCartItem', args });
    return null;
  },
  removeCartItem: async (...args: [string, string]) => {
    calls.push({ method: 'removeCartItem', args });
    return false;
  },
  listWishlists: async (...args: [string]) => {
    calls.push({ method: 'listWishlists', args });
    return [];
  },
  getWishlist: async (...args: [string, string]) => {
    calls.push({ method: 'getWishlist', args });
    return null;
  },
  createWishlist: async (...args: [string, string]) => {
    calls.push({ method: 'createWishlist', args });
    return { id: 'wish-1', name: args[1] };
  },
  deleteWishlist: async (...args: [string, string]) => {
    calls.push({ method: 'deleteWishlist', args });
    return false;
  },
  addWishlistItem: async (
    ...args: [string, string, { productId?: string; variantId?: string }]
  ) => {
    calls.push({ method: 'addWishlistItem', args });
    return { id: 'wish-item-1' };
  },
  removeWishlistItem: async (...args: [string, string, string]) => {
    calls.push({ method: 'removeWishlistItem', args });
    return false;
  },
  checkout: async (
    ...args: [
      string,
      {
        shippingAddress: {
          recipientName: string;
          phone: string;
          division: string;
          district: string;
          addressLine: string;
        };
        couponCode?: string;
        idempotencyKey: string;
      },
    ]
  ) => {
    calls.push({ method: 'checkout', args });
    if (checkoutFailure) throw checkoutFailure;
    return { id: 'order-1', status: 'pending', grandTotal: '10.00' };
  },
  listOrders: async (...args: [string, number, number]) => {
    calls.push({ method: 'listOrders', args });
    return { data: [], meta: { page: args[1], pageSize: args[2], total: 0, totalPages: 0 } };
  },
  getOrder: async (...args: [string, string]) => {
    calls.push({ method: 'getOrder', args });
    return null;
  },
  cancelOrder: async (...args: [string, string]) => {
    calls.push({ method: 'cancelOrder', args });
    return null;
  },
  validateCoupon: async (...args: [string, string]) => {
    calls.push({ method: 'validateCoupon', args });
    throw new ApiError(409, 'Coupon is invalid or not applicable');
  },
};
const app = new Hono();
const routes = createCommerceRoutes(
  service as unknown as Parameters<typeof createCommerceRoutes>[0],
  auth
);
app.route('/cart', routes.cart);
app.route('/wishlists', routes.wishlists);
app.route('/orders', routes.orders);
app.route('/coupons', routes.coupon);
app.onError((error, c) => {
  if (error instanceof ApiError)
    return c.json({ success: false, error: error.message }, error.status);
  const databaseError = normalizeDatabaseError(error);
  if (databaseError)
    return c.json({ success: false, error: databaseError.message }, databaseError.status);
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});
const customerCookie = 'anonna_session=customer-token';
const vendorCookie = 'anonna_session=vendor-token';
const post = (path: string, body: unknown, cookie = customerCookie) =>
  app.request(path, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('cart operations use the authenticated customer and reject client ownership fields', async () => {
  calls.length = 0;
  const ok = await post('/cart/items', {
    variantId: '00000000-0000-4000-8000-000000000001',
    quantity: 2,
  });
  assert.equal(ok.status, 201);
  assert.deepEqual(calls.at(-1), {
    method: 'addCartItem',
    args: ['customer-1', '00000000-0000-4000-8000-000000000001', 2],
  });
  const forged = await post('/cart/items', {
    customerId: 'someone-else',
    variantId: '00000000-0000-4000-8000-000000000001',
    quantity: 2,
  });
  assert.equal(forged.status, 400);
});

test('unauthenticated, vendor, and malformed wishlist mutations are denied before service access', async () => {
  calls.length = 0;
  const noSession = await app.request('/wishlists', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"name":"x"}',
  });
  assert.equal(noSession.status, 401);
  const vendorResponse = await post('/wishlists', { name: 'Saved' }, vendorCookie);
  assert.equal(vendorResponse.status, 403);
  const invalidTarget = await post('/wishlists/00000000-0000-4000-8000-000000000001/items', {});
  assert.equal(invalidTarget.status, 400);
  assert.equal(calls.length, 0);
});

test('checkout accepts only address, coupon and idempotency key and never accepts client totals', async () => {
  calls.length = 0;
  const response = await post('/orders/checkout', {
    shippingAddress: {
      recipientName: 'A Customer',
      phone: '0123456789',
      division: 'Dhaka',
      district: 'Dhaka',
      addressLine: '1 Example Road',
    },
    idempotencyKey: 'request-key-123456',
    itemsTotal: '0.01',
    grandTotal: '0.01',
    customerId: 'forged',
    vendorId: 'forged',
  });
  assert.equal(response.status, 400);
  const shippingAddress = {
    recipientName: 'A Customer',
    phone: '0123456789',
    division: 'Dhaka',
    district: 'Dhaka',
    addressLine: '1 Example Road',
  };
  const valid = await post('/orders/checkout', {
    shippingAddress,
    idempotencyKey: 'request-key-123456',
  });
  assert.equal(valid.status, 201);
  assert.deepEqual(calls.at(-1), {
    method: 'checkout',
    args: ['customer-1', { shippingAddress, idempotencyKey: 'request-key-123456' }],
  });
});

test('coupon errors are safe and do not expose database or credential details', async () => {
  const response = await post('/coupons/validate', { code: 'TEST' });
  assert.equal(response.status, 409);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, 'Coupon is invalid or not applicable');
  assert.equal(JSON.stringify(body).includes('password'), false);
});

test('order history passes only the authenticated customer to ownership-scoped reads', async () => {
  calls.length = 0;
  const response = await app.request('/orders/00000000-0000-4000-8000-000000000002', {
    headers: { cookie: customerCookie },
  });
  assert.equal(response.status, 404);
  assert.deepEqual(calls.at(-1), {
    method: 'getOrder',
    args: ['customer-1', '00000000-0000-4000-8000-000000000002'],
  });
});

test('checkout transaction failures map to a safe conflict response', async () => {
  checkoutFailure = new ApiError(409, 'Insufficient inventory for one or more items');
  const response = await post('/orders/checkout', {
    shippingAddress: {
      recipientName: 'A',
      phone: '0123456789',
      division: 'Dhaka',
      district: 'Dhaka',
      addressLine: '1 Example Road',
    },
    idempotencyKey: 'request-key-123456',
  });
  checkoutFailure = null;
  assert.equal(response.status, 409);
  const body = (await response.json()) as { error: string };
  assert.deepEqual(body, { success: false, error: 'Insufficient inventory for one or more items' });
});

test('database reservation conflict is normalized without exposing the database message', async () => {
  checkoutFailure = Object.assign(new Error('sensitive internal SQL detail'), {
    code: 'P0001',
    constraint: 'order_reservation_stock_conflict',
  });
  const response = await post('/orders/checkout', {
    shippingAddress: {
      recipientName: 'A',
      phone: '0123456789',
      division: 'Dhaka',
      district: 'Dhaka',
      addressLine: '1 Example Road',
    },
    idempotencyKey: 'request-key-123456',
  });
  checkoutFailure = null;
  assert.equal(response.status, 409);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, 'Inventory changed during checkout; retry the request');
  assert.equal(JSON.stringify(body).includes('SQL'), false);
});
