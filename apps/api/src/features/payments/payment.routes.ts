import { Hono } from 'hono';
import { z } from 'zod';
import { createAuthMiddleware, type AuthEnv } from '../../middleware/auth.middleware';
import type { AuthService } from '../auth/auth.types';
import type { PaymentService } from './payment.service';

const uuid = z.string().uuid();
const money = z.string().regex(/^(?:0|[1-9]\d{0,9})\.\d{2}$/);
const fail = (c: { json: (x: object, s?: 400) => Response }) =>
  c.json({ success: false, error: 'Invalid request data' }, 400);
export function createPaymentRoutes(service: PaymentService, authService: AuthService) {
  const auth = createAuthMiddleware((token) => authService.resolveSession(token));
  const routes = new Hono<AuthEnv>();
  routes.get('/bkash/callback', async (c) => {
    const providerPaymentId = c.req.query('paymentID') ?? '';
    const callbackStatus = c.req.query('status') ?? '';
    if (
      providerPaymentId.length < 1 ||
      providerPaymentId.length > 200 ||
      !['success', 'failure', 'cancel'].includes(callbackStatus)
    )
      return fail(c);
    const result = await service.acceptBkashCallback(providerPaymentId, callbackStatus);
    return c.json({ success: true, data: { ...result, status: 'verification_pending' } }, 202);
  });
  routes.post('/orders/:orderId/payments', auth, async (c) => {
    const p = c.get('principal');
    if (p.role !== 'customer' || !p.customerId)
      return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('orderId')).success) return fail(c);
    return c.json(
      { success: true, data: await service.createAttempt(p.customerId, c.req.param('orderId')) },
      201
    );
  });
  routes.get('/orders/:orderId/payments', auth, async (c) => {
    const p = c.get('principal');
    if (p.role !== 'customer' || !p.customerId)
      return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('orderId')).success) return fail(c);
    const rows = await service.listPayments(p.customerId, c.req.param('orderId'));
    return rows
      ? c.json({ success: true, data: rows })
      : c.json({ success: false, error: 'Order not found' }, 404);
  });
  routes.post('/refunds', auth, async (c) => {
    const p = c.get('principal');
    if (p.role !== 'customer' || !p.customerId)
      return c.json({ success: false, error: 'Forbidden' }, 403);
    const input = z
      .object({ paymentId: uuid, amount: money, reason: z.string().trim().min(1).max(2000) })
      .strict()
      .safeParse(await c.req.json().catch(() => null));
    if (!input.success) return fail(c);
    return c.json(
      {
        success: true,
        data: await service.requestRefund(
          p.customerId,
          input.data.paymentId,
          input.data.amount,
          input.data.reason
        ),
      },
      201
    );
  });
  routes.get('/admin/refunds', auth, async (c) => {
    if (c.get('principal').role !== 'admin')
      return c.json({ success: false, error: 'Forbidden' }, 403);
    const status = z
      .enum(['pending', 'approved', 'rejected', 'processed'])
      .optional()
      .safeParse(c.req.query('status'));
    if (!status.success) return fail(c);
    return c.json({ success: true, data: await service.listRefunds(status.data) });
  });
  routes.post('/admin/refunds/:id/:decision', auth, async (c) => {
    const p = c.get('principal');
    if (p.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    const id = uuid.safeParse(c.req.param('id')),
      decision = z.enum(['approve', 'reject', 'process']).safeParse(c.req.param('decision'));
    if (!id.success || !decision.success) return fail(c);
    const result =
      decision.data === 'process'
        ? await service.processRefund(id.data)
        : await service.decideRefund(
            p.userId,
            id.data,
            decision.data === 'approve' ? 'approved' : 'rejected'
          );
    return c.json({ success: true, data: result });
  });
  return routes;
}
