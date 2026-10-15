import { Hono } from 'hono';
import { z } from 'zod';
import { createAuthMiddleware, type AuthEnv } from '../../middleware/auth.middleware';
import type { AuthService } from '../auth/auth.types';
import type { FulfillmentService } from './fulfillment.service';
const uuid = z.string().uuid();
export function createFulfillmentRoutes(service: FulfillmentService, authService: AuthService) {
  const auth = createAuthMiddleware((token) => authService.resolveSession(token));
  const routes = new Hono<AuthEnv>(); routes.use('*', auth);
  routes.post('/orders/:orderId/shipments', async (c) => {
    const principal = c.get('principal'); if (!['admin', 'vendor'].includes(principal.role)) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('orderId')).success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    const p = z.object({ courierName: z.string().trim().min(1).max(120).optional(), trackingNumber: z.string().trim().min(1).max(120).optional(), items: z.array(z.object({ orderItemId: uuid, quantity: z.number().int().min(1).max(1_000_000) }).strict()).min(1).max(100) }).strict().safeParse(await c.req.json().catch(() => null));
    if (!p.success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    return c.json({ success: true, data: await service.createShipment(principal, c.req.param('orderId'), p.data) }, 201);
  });
  routes.get('/orders/:orderId/shipments', async (c) => {
    const p = c.get('principal'); if (!['admin', 'vendor', 'customer'].includes(p.role)) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('orderId')).success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    const rows = await service.listShipments(p, c.req.param('orderId')); return rows ? c.json({ success: true, data: rows }) : c.json({ success: false, error: 'Order not found' }, 404);
  });
  routes.patch('/shipments/:id/status', async (c) => {
    const p = c.get('principal'); if (!['admin', 'vendor'].includes(p.role)) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('id')).success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    const body = z.object({ status: z.enum(['shipped', 'in_transit', 'delivered']), courierName: z.string().trim().min(1).max(120).optional(), trackingNumber: z.string().trim().min(1).max(120).optional() }).strict().safeParse(await c.req.json().catch(() => null)); if (!body.success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    const row = await service.updateShipment(p, c.req.param('id'), body.data.status, body.data); return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Shipment not found' }, 404);
  });
  routes.post('/reviews', async (c) => {
    const p = c.get('principal'); if (p.role !== 'customer' || !p.customerId) return c.json({ success: false, error: 'Forbidden' }, 403);
    const body = z.object({ orderItemId: uuid, rating: z.number().int().min(1).max(5), comment: z.string().trim().max(10_000).optional() }).strict().safeParse(await c.req.json().catch(() => null)); if (!body.success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    return c.json({ success: true, data: await service.createReview(p.customerId, body.data.orderItemId, body.data.rating, body.data.comment) }, 201);
  });
  routes.get('/products/:productId/reviews', async (c) => {
    if (!uuid.safeParse(c.req.param('productId')).success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    return c.json({ success: true, data: await service.listReviews(c.req.param('productId')) });
  });
  routes.patch('/admin/reviews/:id', async (c) => {
    if (c.get('principal').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('id')).success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    const body = z.object({ approved: z.boolean() }).strict().safeParse(await c.req.json().catch(() => null)); if (!body.success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    const row = await service.moderateReview(c.req.param('id'), body.data.approved); return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Review not found' }, 404);
  });
  return routes;
}
