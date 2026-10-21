import { createHash } from 'node:crypto';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@repo/db';
import {
  couponUses,
  orderItems,
  orderReservations,
  orders,
  paymentWebhooks,
  payments,
  refunds,
  vendorLedgerEntries,
  vendors,
} from '@repo/db/schema';
import { ApiError } from '../../lib/api-error';
import { paymentProvider, type BkashPaymentProvider } from './payment.provider';
import {
  canTransitionPayment,
  isDuplicatePaymentEvent,
  refundCapacityStatuses,
  refundFitsCapturedAmount,
} from './refund.rules';
import { netVendorProceedsCents } from './vendor-ledger.rules';

export type PaymentEvent = {
  eventId: string;
  paymentId: string;
  transactionId: string;
  gatewayTransactionId?: string;
  amount: string;
  status: 'authorized' | 'captured' | 'failed' | 'cancelled';
};
const validMoney = (v: string) => /^(?:0|[1-9]\d{0,9})\.\d{2}$/.test(v);
const cents = (v: string) => BigInt(v.replace('.', ''));
const money = (v: bigint) => `${v / 100n}.${String(v % 100n).padStart(2, '0')}`;

export class PaymentService {
  constructor(private readonly provider: BkashPaymentProvider = paymentProvider) {}

  async createAttempt(customerId: string, orderId: string) {
    const payment = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
        .for('update')
        .limit(1);
      if (!order) throw new ApiError(404, 'Order not found');
      if (order.status !== 'pending') throw new ApiError(409, 'Order is not awaiting payment');
      const [active] = await tx
        .select({ id: orderReservations.id })
        .from(orderReservations)
        .innerJoin(orderItems, eq(orderItems.id, orderReservations.orderItemId))
        .where(
          and(
            eq(orderItems.orderId, orderId),
            eq(orderReservations.status, 'reserved'),
            sql`${orderReservations.expiresAt} > now()`
          )
        )
        .limit(1);
      if (!active) throw new ApiError(409, 'Order reservation has expired');
      const [existing] = await tx
        .select({ id: payments.id })
        .from(payments)
        .where(
          and(eq(payments.orderId, orderId), inArray(payments.status, ['pending', 'authorized']))
        )
        .limit(1);
      if (existing) throw new ApiError(409, 'A payment attempt is already active');
      const [row] = await tx
        .insert(payments)
        .values({
          orderId,
          amount: order.grandTotal,
          paymentMethod: 'bkash',
        })
        .returning({ id: payments.id, amount: payments.amount, status: payments.status });
      return row;
    });
    try {
      const checkout = await this.provider.createCheckout({
        amount: payment.amount,
        payerReference: payment.id,
        merchantInvoiceNumber: `ANONNA-${payment.id.replaceAll('-', '')}`,
      });
      await db
        .update(payments)
        .set({
          transactionId: checkout.paymentId,
          nextReconciliationAt: new Date(Date.now() + 60_000),
        })
        .where(eq(payments.id, payment.id));
      return { ...payment, checkoutUrl: checkout.redirectUrl };
    } catch {
      await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, payment.id));
      throw new ApiError(503, 'Payment gateway is temporarily unavailable');
    }
  }

  async acceptBkashCallback(providerPaymentId: string, callbackStatus: string) {
    const [payment] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(eq(payments.transactionId, providerPaymentId), eq(payments.paymentMethod, 'bkash'))
      )
      .limit(1);
    if (!payment) throw new ApiError(404, 'Payment not found');
    if (!['success', 'failure', 'cancel'].includes(callbackStatus)) {
      throw new ApiError(400, 'Invalid payment callback');
    }
    const eventId = `bkash-${createHash('sha256')
      .update(`${providerPaymentId}:${callbackStatus}`)
      .digest('hex')}`;
    const [event] = await db
      .insert(paymentWebhooks)
      .values({
        provider: 'bkash',
        eventId,
        paymentId: payment.id,
        providerPaymentId,
        eventType: `checkout_${callbackStatus}`,
        payload: { status: callbackStatus },
      })
      .onConflictDoNothing({ target: paymentWebhooks.eventId })
      .returning({ id: paymentWebhooks.id });
    return { accepted: true, duplicate: !event };
  }

  async flagWebhookExecuteAttempt(eventId: string) {
    const [event] = await db
      .update(paymentWebhooks)
      .set({
        payload: sql`${paymentWebhooks.payload} || '{"executeAttempted":true}'::jsonb`,
      })
      .where(
        and(
          eq(paymentWebhooks.id, eventId),
          sql`not (${paymentWebhooks.payload} ? 'executeAttempted')`
        )
      )
      .returning({ id: paymentWebhooks.id });
    return Boolean(event);
  }
  async listPayments(customerId: string, orderId: string) {
    const [owned] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
      .limit(1);
    if (!owned) return null;
    return db
      .select({
        id: payments.id,
        amount: payments.amount,
        paymentMethod: payments.paymentMethod,
        status: payments.status,
        paymentDate: payments.paymentDate,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.orderId, orderId));
  }
  async applyWebhook(e: PaymentEvent) {
    if (!validMoney(e.amount)) throw new ApiError(400, 'Invalid payment amount');
    return db.transaction(async (tx) => {
      const [initial] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, e.paymentId))
        .limit(1);
      if (!initial) throw new ApiError(404, 'Payment not found');
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, initial.orderId))
        .for('update')
        .limit(1);
      const [p] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, e.paymentId))
        .for('update')
        .limit(1);
      if (!order || !p || p.transactionId !== e.transactionId || p.amount !== e.amount)
        throw new ApiError(409, 'Payment event does not match the payment attempt');
      if (isDuplicatePaymentEvent(p.status as import('./refund.rules').PaymentStatus, e.status))
        return { duplicate: true };
      if (!canTransitionPayment(p.status as import('./refund.rules').PaymentStatus, e.status))
        throw new ApiError(409, 'Payment cannot transition from its current state');
      if (e.status !== 'captured') {
        await tx
          .update(payments)
          .set({
            status: e.status,
            gatewayTransactionId: e.gatewayTransactionId,
          })
          .where(eq(payments.id, p.id));
        return { duplicate: false };
      }
      const [sum] = await tx
        .select({ amount: sql<string>`coalesce(sum(${payments.amount}),0)::text` })
        .from(payments)
        .where(
          and(
            eq(payments.orderId, order.id),
            inArray(payments.status, ['captured', 'partially_refunded', 'refunded'])
          )
        );
      if (cents(sum.amount) + cents(e.amount) > cents(order.grandTotal))
        throw new ApiError(409, 'Captured payments would exceed the order total');
      const allocs = await tx
        .select({
          id: orderReservations.id,
          itemId: orderReservations.orderItemId,
          qty: orderReservations.quantity,
          expires: orderReservations.expiresAt,
          status: orderReservations.status,
        })
        .from(orderReservations)
        .innerJoin(orderItems, eq(orderItems.id, orderReservations.orderItemId))
        .where(eq(orderItems.orderId, order.id))
        .for('update', { of: orderReservations });
      const items = await tx
        .select({ id: orderItems.id, qty: orderItems.quantity })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))
        .for('update');
      const fulfillable =
        order.status === 'pending' &&
        allocs.every((a) => a.status === 'reserved' && a.expires > new Date()) &&
        items.every(
          (i) => allocs.filter((a) => a.itemId === i.id).reduce((n, a) => n + a.qty, 0) === i.qty
        );
      await tx
        .update(payments)
        .set({
          status: 'captured',
          paymentDate: new Date(),
          gatewayTransactionId: e.gatewayTransactionId,
        })
        .where(eq(payments.id, p.id));
      if (fulfillable) {
        await tx
          .update(orderReservations)
          .set({ status: 'confirmed', updatedAt: new Date() })
          .where(
            and(
              inArray(
                orderReservations.id,
                allocs.map((a) => a.id)
              ),
              eq(orderReservations.status, 'reserved')
            )
          );
        await tx
          .update(orders)
          .set({ status: 'confirmed', updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        await this.recordVendorSales(tx, p.id, order.id, order.itemsTotal, order.discountTotal);
      } else
        await tx
          .insert(refunds)
          .values({
            paymentId: p.id,
            amount: p.amount,
            reason: 'Captured after order reservation expired or order became unavailable',
            status: 'pending',
          });
      return { duplicate: false, captured: true, requiresRefundReview: !fulfillable };
    });
  }

  private async recordVendorSales(
    tx: typeof db,
    paymentId: string,
    orderId: string,
    itemsTotal: string,
    discountTotal: string
  ) {
    const rows = await tx
      .select({
        vendorId: orderItems.sellerId,
        commissionRate: vendors.commissionRate,
        lineValue: sql<string>`${orderItems.purchasedPrice} * ${orderItems.quantity}`,
      })
      .from(orderItems)
      .innerJoin(vendors, eq(vendors.id, orderItems.sellerId))
      .where(eq(orderItems.orderId, orderId));
    const grouped = new Map<string, { commissionRate: string; value: bigint }>();
    for (const row of rows) {
      const current = grouped.get(row.vendorId) ?? {
        commissionRate: row.commissionRate,
        value: 0n,
      };
      current.value += cents(row.lineValue);
      grouped.set(row.vendorId, current);
    }
    const ordered = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
    const subtotal = cents(itemsTotal);
    let discountRemaining = cents(discountTotal);
    for (const [vendorId, vendor] of ordered) {
      const allocatedDiscount =
        vendorId === ordered.at(-1)?.[0]
          ? discountRemaining
          : (cents(discountTotal) * vendor.value + subtotal / 2n) / subtotal;
      const boundedDiscount =
        allocatedDiscount < discountRemaining ? allocatedDiscount : discountRemaining;
      discountRemaining -= boundedDiscount;
      const netSale = vendor.value - boundedDiscount;
      const payout = netVendorProceedsCents(netSale, cents(vendor.commissionRate));
      if (payout <= 0n) continue;
      await tx
        .insert(vendorLedgerEntries)
        .values({
          vendorId,
          orderId,
          paymentId,
          entryType: 'sale',
          amount: money(payout),
          currency: 'BDT',
          referenceKey: `sale:${paymentId}:${vendorId}`,
          memo: 'Net order proceeds after vendor commission',
        })
        .onConflictDoNothing({ target: vendorLedgerEntries.referenceKey });
    }
  }

  async requestRefund(customerId: string, paymentId: string, amount: string, reason: string) {
    if (!validMoney(amount)) throw new ApiError(400, 'Invalid refund amount');
    return db.transaction(async (tx) => {
      const [joined] = await tx
        .select()
        .from(payments)
        .innerJoin(orders, eq(orders.id, payments.orderId))
        .where(and(eq(payments.id, paymentId), eq(orders.customerId, customerId)))
        .for('update', { of: payments })
        .limit(1);
      const p = joined?.payments;
      if (!p || !['captured', 'partially_refunded'].includes(p.status))
        throw new ApiError(404, 'Captured payment not found');
      const [sum] = await tx
        .select({ amount: sql<string>`coalesce(sum(${refunds.amount}),0)::text` })
        .from(refunds)
        .where(
          and(
            eq(refunds.paymentId, paymentId),
            inArray(refunds.status, ['pending', 'approved', 'processed'])
          )
        );
      if (!refundFitsCapturedAmount(p.amount, sum.amount, amount))
        throw new ApiError(409, 'Refund requests exceed the captured amount');
      const [row] = await tx
        .insert(refunds)
        .values({ paymentId, amount, reason: reason.trim() })
        .returning({ id: refunds.id, amount: refunds.amount, status: refunds.status });
      return row;
    });
  }
  async listRefunds(status?: 'pending' | 'approved' | 'rejected' | 'processed') {
    return status
      ? db.select().from(refunds).where(eq(refunds.status, status)).orderBy(refunds.createdAt)
      : db.select().from(refunds).orderBy(refunds.createdAt);
  }
  async decideRefund(userId: string, id: string, decision: 'approved' | 'rejected') {
    return db.transaction(async (tx) => {
      const [r] = await tx.select().from(refunds).where(eq(refunds.id, id)).for('update').limit(1);
      if (!r || r.status !== 'pending') throw new ApiError(404, 'Pending refund not found');
      if (decision === 'approved') {
        const [p] = await tx
          .select()
          .from(payments)
          .where(eq(payments.id, r.paymentId))
          .for('update')
          .limit(1);
        const [sum] = await tx
          .select({ amount: sql<string>`coalesce(sum(${refunds.amount}),0)::text` })
          .from(refunds)
          .where(
            and(
              eq(refunds.paymentId, r.paymentId),
              inArray(refunds.status, [...refundCapacityStatuses])
            )
          );
        // Pending rows reserve refund capacity; the current request is included in this sum.
        if (
          !p ||
          !['captured', 'partially_refunded'].includes(p.status) ||
          !refundFitsCapturedAmount(p.amount, sum.amount)
        )
          throw new ApiError(409, 'Refund is not eligible for approval');
      }
      const [row] = await tx
        .update(refunds)
        .set({
          status: decision,
          approvedByUserId: userId,
          nextAttemptAt: decision === 'approved' ? new Date() : null,
        })
        .where(eq(refunds.id, id))
        .returning();
      return row;
    });
  }
  async processRefund(id: string) {
    const [updated] = await db
      .update(refunds)
      .set({
        nextAttemptAt: sql`coalesce(${refunds.nextAttemptAt}, now())`,
        attemptCount: sql`case when ${refunds.nextAttemptAt} is null then 0 else ${refunds.attemptCount} end`,
      })
      .where(and(eq(refunds.id, id), eq(refunds.status, 'approved')))
      .returning();
    if (!updated) throw new ApiError(404, 'Approved refund not found');
    return { id: updated.id, status: updated.status, queued: true };
  }
}
export const paymentService = new PaymentService();
