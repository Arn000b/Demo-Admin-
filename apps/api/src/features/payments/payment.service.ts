import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@repo/db';
import { orderItems, orderReservations, orders, payments, refunds } from '@repo/db/schema';
import { ApiError } from '../../lib/api-error';
import { paymentProvider } from './payment.provider';
import { canTransitionPayment, isDuplicatePaymentEvent, refundCapacityStatuses, refundFitsCapturedAmount } from './refund.rules';

export type PaymentEvent = { eventId: string; paymentId: string; transactionId: string; amount: string; status: 'authorized' | 'captured' | 'failed' | 'cancelled' };
const validMoney = (v: string) => /^(?:0|[1-9]\d{0,9})\.\d{2}$/.test(v);
const cents = (v: string) => BigInt(v.replace('.', ''));

export class PaymentService {
  async createAttempt(customerId: string, orderId: string) {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerId, customerId))).for('update').limit(1);
      if (!order) throw new ApiError(404, 'Order not found');
      if (order.status !== 'pending') throw new ApiError(409, 'Order is not awaiting payment');
      const [active] = await tx.select({ id: orderReservations.id }).from(orderReservations).innerJoin(orderItems, eq(orderItems.id, orderReservations.orderItemId)).where(and(eq(orderItems.orderId, orderId), eq(orderReservations.status, 'reserved'), sql`${orderReservations.expiresAt} > now()`)).limit(1);
      if (!active) throw new ApiError(409, 'Order reservation has expired');
      const [existing] = await tx.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, orderId), inArray(payments.status, ['pending', 'authorized']))).limit(1);
      if (existing) throw new ApiError(409, 'A payment attempt is already active');
      const [row] = await tx.insert(payments).values({ orderId, amount: order.grandTotal, paymentMethod: 'mock', transactionId: await paymentProvider.createPaymentReference() }).returning({ id: payments.id, amount: payments.amount, status: payments.status });
      return row;
    });
  }
  async listPayments(customerId: string, orderId: string) {
    const [owned] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.id, orderId), eq(orders.customerId, customerId))).limit(1);
    if (!owned) return null;
    return db.select({ id: payments.id, amount: payments.amount, paymentMethod: payments.paymentMethod, status: payments.status, paymentDate: payments.paymentDate, createdAt: payments.createdAt }).from(payments).where(eq(payments.orderId, orderId));
  }
  async applyWebhook(e: PaymentEvent) {
    if (!validMoney(e.amount)) throw new ApiError(400, 'Invalid payment amount');
    return db.transaction(async (tx) => {
      const [initial] = await tx.select().from(payments).where(eq(payments.id, e.paymentId)).limit(1);
      if (!initial) throw new ApiError(404, 'Payment not found');
      const [order] = await tx.select().from(orders).where(eq(orders.id, initial.orderId)).for('update').limit(1);
      const [p] = await tx.select().from(payments).where(eq(payments.id, e.paymentId)).for('update').limit(1);
      if (!order || !p || p.transactionId !== e.transactionId || p.amount !== e.amount) throw new ApiError(409, 'Payment event does not match the payment attempt');
      if (isDuplicatePaymentEvent(p.status as import('./refund.rules').PaymentStatus, e.status)) return { duplicate: true };
      if (!canTransitionPayment(p.status as import('./refund.rules').PaymentStatus, e.status)) throw new ApiError(409, 'Payment cannot transition from its current state');
      if (e.status !== 'captured') {
        await tx.update(payments).set({ status: e.status }).where(eq(payments.id, p.id)); return { duplicate: false };
      }
      const [sum] = await tx.select({ amount: sql<string>`coalesce(sum(${payments.amount}),0)::text` }).from(payments).where(and(eq(payments.orderId, order.id), inArray(payments.status, ['captured', 'partially_refunded', 'refunded'])));
      if (cents(sum.amount) + cents(e.amount) > cents(order.grandTotal)) throw new ApiError(409, 'Captured payments would exceed the order total');
      const allocs = await tx.select({ id: orderReservations.id, itemId: orderReservations.orderItemId, qty: orderReservations.quantity, expires: orderReservations.expiresAt, status: orderReservations.status }).from(orderReservations).innerJoin(orderItems, eq(orderItems.id, orderReservations.orderItemId)).where(eq(orderItems.orderId, order.id)).for('update', { of: orderReservations });
      const items = await tx.select({ id: orderItems.id, qty: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, order.id)).for('update');
      const fulfillable = order.status === 'pending' && allocs.every((a) => a.status === 'reserved' && a.expires > new Date()) && items.every((i) => allocs.filter((a) => a.itemId === i.id).reduce((n, a) => n + a.qty, 0) === i.qty);
      await tx.update(payments).set({ status: 'captured', paymentDate: new Date() }).where(eq(payments.id, p.id));
      if (fulfillable) {
        await tx.update(orderReservations).set({ status: 'confirmed', updatedAt: new Date() }).where(and(inArray(orderReservations.id, allocs.map((a) => a.id)), eq(orderReservations.status, 'reserved')));
        await tx.update(orders).set({ status: 'confirmed', updatedAt: new Date() }).where(eq(orders.id, order.id));
      } else await tx.insert(refunds).values({ paymentId: p.id, amount: p.amount, reason: 'Captured after order reservation expired or order became unavailable', status: 'pending' });
      return { duplicate: false, captured: true, requiresRefundReview: !fulfillable };
    });
  }
  async requestRefund(customerId: string, paymentId: string, amount: string, reason: string) {
    if (!validMoney(amount)) throw new ApiError(400, 'Invalid refund amount');
    return db.transaction(async (tx) => {
      const [joined] = await tx.select().from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(and(eq(payments.id, paymentId), eq(orders.customerId, customerId))).for('update', { of: payments }).limit(1);
      const p = joined?.payments;
      if (!p || !['captured', 'partially_refunded'].includes(p.status)) throw new ApiError(404, 'Captured payment not found');
      const [sum] = await tx.select({ amount: sql<string>`coalesce(sum(${refunds.amount}),0)::text` }).from(refunds).where(and(eq(refunds.paymentId, paymentId), inArray(refunds.status, ['pending', 'approved', 'processed'])));
      if (!refundFitsCapturedAmount(p.amount, sum.amount, amount)) throw new ApiError(409, 'Refund requests exceed the captured amount');
      const [row] = await tx.insert(refunds).values({ paymentId, amount, reason: reason.trim() }).returning({ id: refunds.id, amount: refunds.amount, status: refunds.status }); return row;
    });
  }
  async listRefunds(status?: 'pending' | 'approved' | 'rejected' | 'processed') { return status ? db.select().from(refunds).where(eq(refunds.status, status)).orderBy(refunds.createdAt) : db.select().from(refunds).orderBy(refunds.createdAt); }
  async decideRefund(userId: string, id: string, decision: 'approved' | 'rejected') {
    return db.transaction(async (tx) => {
      const [r] = await tx.select().from(refunds).where(eq(refunds.id, id)).for('update').limit(1);
      if (!r || r.status !== 'pending') throw new ApiError(404, 'Pending refund not found');
      if (decision === 'approved') {
        const [p] = await tx.select().from(payments).where(eq(payments.id, r.paymentId)).for('update').limit(1);
        const [sum] = await tx.select({ amount: sql<string>`coalesce(sum(${refunds.amount}),0)::text` }).from(refunds).where(and(eq(refunds.paymentId, r.paymentId), inArray(refunds.status, [...refundCapacityStatuses])));
        // Pending rows reserve refund capacity; the current request is included in this sum.
        if (!p || !['captured', 'partially_refunded'].includes(p.status) || !refundFitsCapturedAmount(p.amount, sum.amount)) throw new ApiError(409, 'Refund is not eligible for approval');
      }
      const [row] = await tx.update(refunds).set({ status: decision, approvedByUserId: userId }).where(eq(refunds.id, id)).returning(); return row;
    });
  }
  async processRefund(id: string) {
    const [candidate] = await db.select().from(refunds).where(and(eq(refunds.id, id), eq(refunds.status, 'approved'))).limit(1);
    if (!candidate) throw new ApiError(404, 'Approved refund not found');
    const [p0] = await db.select().from(payments).where(eq(payments.id, candidate.paymentId)).limit(1);
    if (!p0?.transactionId) throw new ApiError(409, 'Refund payment reference is unavailable');
    await paymentProvider.refund(p0.transactionId, candidate.amount, candidate.id);
    return db.transaction(async (tx) => {
      const [r] = await tx.select().from(refunds).where(eq(refunds.id, id)).for('update').limit(1);
      if (!r || r.status !== 'approved') throw new ApiError(409, 'Refund is no longer approved');
      const [p] = await tx.select().from(payments).where(eq(payments.id, r.paymentId)).for('update').limit(1);
      if (!p) throw new ApiError(404, 'Payment not found');
      const [updated] = await tx.update(refunds).set({ status: 'processed' }).where(eq(refunds.id, id)).returning();
      const [sum] = await tx.select({ amount: sql<string>`coalesce(sum(${refunds.amount}),0)::text` }).from(refunds).where(and(eq(refunds.paymentId, p.id), inArray(refunds.status, ['approved', 'processed'])));
      await tx.update(payments).set({ status: cents(sum.amount) >= cents(p.amount) ? 'refunded' : 'partially_refunded' }).where(eq(payments.id, p.id)); return updated;
    });
  }
}
export const paymentService = new PaymentService();
