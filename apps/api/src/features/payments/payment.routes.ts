import { Hono } from 'hono';
import { z } from 'zod';
import { createAuthMiddleware, type AuthEnv } from '../../middleware/auth.middleware';
import type { AuthService } from '../auth/auth.types';
import type { PaymentService, PaymentEvent } from './payment.service';
import { verifyPaymentWebhook } from './webhook-signature';

const uuid = z.string().uuid();
const money = z.string().regex(/^(?:0|[1-9]\d{0,9})\.\d{2}$/);
const fail = (c: { json: (x: object, s?: 400) => Response }) => c.json({ success: false, error: 'Invalid request data' }, 400);
export function createPaymentRoutes(service: PaymentService, authService: AuthService) {
  const auth = createAuthMiddleware((token) => authService.resolveSession(token));
  const routes = new Hono<AuthEnv>();
  routes.post('/webhook', async (c) => {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? '';
    const raw = await c.req.text();
    if (raw.length > 16_384) return c.json({ success: false, error: 'Invalid webhook request' }, 400);
    if (!secret || !verifyPaymentWebhook(raw, c.req.header('x-payment-timestamp') ?? '', c.req.header('x-payment-signature') ?? '', secret)) return c.json({ success: false, error: 'Invalid webhook signature' }, 401);
    const schema = z.object({ eventId: z.string().min(1).max(200), paymentId: uuid, transactionId: z.string().min(1).max(200), amount: money, status: z.enum(['authorized', 'captured', 'failed', 'cancelled']) }).strict();
    let parsed: unknown; try { parsed = JSON.parse(raw); } catch { return fail(c); }
    const event = schema.safeParse(parsed); if (!event.success) return fail(c);
    return c.json({ success: true, data: await service.applyWebhook(event.data as PaymentEvent) });
  });
  routes.post('/orders/:orderId/payments', auth, async (c) => {
    const p = c.get('principal'); if (p.role !== 'customer' || !p.customerId) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('orderId')).success) return fail(c);
    return c.json({ success: true, data: await service.createAttempt(p.customerId, c.req.param('orderId')) }, 201);
  });
  routes.get('/orders/:orderId/payments', auth, async (c) => {
    const p = c.get('principal'); if (p.role !== 'customer' || !p.customerId) return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('orderId')).success) return fail(c);
    const rows = await service.listPayments(p.customerId, c.req.param('orderId'));
    return rows ? c.json({ success: true, data: rows }) : c.json({ success: false, error: 'Order not found' }, 404);
  });
  routes.post('/refunds', auth, async (c) => {
    const p = c.get('principal'); if (p.role !== 'customer' || !p.customerId) return c.json({ success: false, error: 'Forbidden' }, 403);
    const input = z.object({ paymentId: uuid, amount: money, reason: z.string().trim().min(1).max(2000) }).strict().safeParse(await c.req.json().catch(() => null)); if (!input.success) return fail(c);
    return c.json({ success: true, data: await service.requestRefund(p.customerId, input.data.paymentId, input.data.amount, input.data.reason) }, 201);
  });
  routes.get('/admin/refunds', auth, async (c) => {
    if (c.get('principal').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    const status = z.enum(['pending', 'approved', 'rejected', 'processed']).optional().safeParse(c.req.query('status')); if (!status.success) return fail(c);
    return c.json({ success: true, data: await service.listRefunds(status.data) });
  });
  routes.post('/admin/refunds/:id/:decision', auth, async (c) => {
    const p = c.get('principal'); if (p.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    const id = uuid.safeParse(c.req.param('id')), decision = z.enum(['approve', 'reject', 'process']).safeParse(c.req.param('decision')); if (!id.success || !decision.success) return fail(c);
    const result = decision.data === 'process' ? await service.processRefund(id.data) : await service.decideRefund(p.userId, id.data, decision.data === 'approve' ? 'approved' : 'rejected');
    return c.json({ success: true, data: result });
  });
  return routes;
}
