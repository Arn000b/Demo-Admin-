import { Hono } from 'hono';
import { z } from 'zod';
import { createAuthMiddleware, type AuthEnv } from '../../middleware/auth.middleware';
import { paginationSchema } from '../../lib/pagination';
import type { AuthService } from '../auth/auth.types';
import type { CommerceService } from './commerce.service';

type CommerceApi = Pick<CommerceService,
  'getCart' | 'addCartItem' | 'updateCartItem' | 'removeCartItem' |
  'listWishlists' | 'getWishlist' | 'createWishlist' | 'deleteWishlist' | 'addWishlistItem' | 'removeWishlistItem' |
  'checkout' | 'listOrders' | 'getOrder' | 'cancelOrder' | 'validateCoupon'>;

const uuid = z.string().uuid();
const quantity = z.number().int().min(1).max(1_000_000);
const page = paginationSchema;
const shippingAddress = z.object({
  recipientName: z.string().trim().min(1).max(200), phone: z.string().trim().min(1).max(32),
  division: z.string().trim().min(1).max(100), district: z.string().trim().min(1).max(100),
  addressLine: z.string().trim().min(1).max(10_000),
}).strict();
const checkout = z.object({ shippingAddress, couponCode: z.string().trim().min(1).max(80).optional(), idempotencyKey: z.string().trim().min(16).max(100).regex(/^[A-Za-z0-9._:-]+$/) }).strict();
const customerOnly = (principal: { role: string; customerId: string | null }) => principal.role === 'customer' ? principal.customerId : null;
const bad = (c: { json: (body: object, status?: 400) => Response }) => c.json({ success: false, error: 'Invalid request data' }, 400);

export function createCommerceRoutes(service: CommerceApi, authService: AuthService) {
  const auth = createAuthMiddleware((token) => authService.resolveSession(token));
  const cart = new Hono<AuthEnv>(); cart.use('*', auth);
  cart.get('/', async (c) => { const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403); return c.json({ success: true, data: await service.getCart(id) }); });
  cart.post('/items', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    const p = z.object({ variantId: uuid, quantity }).strict().safeParse(await c.req.json().catch(() => null)); if (!p.success) return bad(c);
    return c.json({ success: true, data: await service.addCartItem(id, p.data.variantId, p.data.quantity) }, 201);
  });
  cart.patch('/items/:itemId', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('itemId')).success) return bad(c);
    const p = z.object({ quantity }).strict().safeParse(await c.req.json().catch(() => null)); if (!p.success) return bad(c);
    const row = await service.updateCartItem(id, c.req.param('itemId'), p.data.quantity);
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Cart item not found' }, 404);
  });
  cart.delete('/items/:itemId', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('itemId')).success) return bad(c);
    return await service.removeCartItem(id, c.req.param('itemId')) ? c.json({ success: true }) : c.json({ success: false, error: 'Cart item not found' }, 404);
  });

  const wishlists = new Hono<AuthEnv>(); wishlists.use('*', auth);
  wishlists.get('/', async (c) => { const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403); return c.json({ success: true, data: await service.listWishlists(id) }); });
  wishlists.post('/', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    const p = z.object({ name: z.string().trim().min(1).max(120) }).strict().safeParse(await c.req.json().catch(() => null)); if (!p.success) return bad(c);
    return c.json({ success: true, data: await service.createWishlist(id, p.data.name) }, 201);
  });
  wishlists.get('/:wishlistId', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('wishlistId')).success) return bad(c);
    const row = await service.getWishlist(id, c.req.param('wishlistId'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Wishlist not found' }, 404);
  });
  wishlists.delete('/:wishlistId', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('wishlistId')).success) return bad(c);
    return await service.deleteWishlist(id, c.req.param('wishlistId')) ? c.json({ success: true }) : c.json({ success: false, error: 'Wishlist not found' }, 404);
  });
  wishlists.post('/:wishlistId/items', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('wishlistId')).success) return bad(c);
    const p = z.object({ productId: uuid.optional(), variantId: uuid.optional() }).strict().refine((x) => Boolean(x.productId) !== Boolean(x.variantId)).safeParse(await c.req.json().catch(() => null)); if (!p.success) return bad(c);
    const row = await service.addWishlistItem(id, c.req.param('wishlistId'), p.data);
    return row ? c.json({ success: true, data: row }, 201) : c.json({ success: false, error: 'Wishlist not found' }, 404);
  });
  wishlists.delete('/:wishlistId/items/:itemId', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('wishlistId')).success || !uuid.safeParse(c.req.param('itemId')).success) return bad(c);
    return await service.removeWishlistItem(id, c.req.param('wishlistId'), c.req.param('itemId')) ? c.json({ success: true }) : c.json({ success: false, error: 'Wishlist item not found' }, 404);
  });

  const orders = new Hono<AuthEnv>(); orders.use('*', auth);
  orders.post('/checkout', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    const p = checkout.safeParse(await c.req.json().catch(() => null)); if (!p.success) return bad(c);
    return c.json({ success: true, data: await service.checkout(id, p.data) }, 201);
  });
  orders.get('/', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    const p = page.safeParse(c.req.query()); if (!p.success) return bad(c);
    return c.json({ success: true, ...(await service.listOrders(id, p.data.page, p.data.pageSize)) });
  });
  orders.get('/:orderId', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('orderId')).success) return bad(c);
    const row = await service.getOrder(id, c.req.param('orderId'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Order not found' }, 404);
  });
  orders.post('/:orderId/cancel', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('orderId')).success) return bad(c);
    const row = await service.cancelOrder(id, c.req.param('orderId'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Order not found' }, 404);
  });

  const coupon = new Hono<AuthEnv>(); coupon.use('*', auth);
  coupon.post('/validate', async (c) => {
    const id = customerOnly(c.get('principal')); if (!id) return c.json({ success: false, error: 'Forbidden' }, 403);
    const p = z.object({ code: z.string().trim().min(1).max(80) }).strict().safeParse(await c.req.json().catch(() => null)); if (!p.success) return bad(c);
    return c.json({ success: true, data: await service.validateCoupon(id, p.data.code) });
  });
  return { cart, wishlists, orders, coupon };
}
