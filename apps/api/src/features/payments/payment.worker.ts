import { and, asc, eq, inArray, isNull, lte, lt, or, sql } from 'drizzle-orm';
import { db } from '@repo/db';
import {
  authActionTokens,
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
import { paymentProvider, PaymentGatewayError, type BkashTransaction } from './payment.provider';
import { PaymentService } from './payment.service';
import { commerceService } from '../commerce/commerce.service';

const paymentService = new PaymentService();
const maximumAttempts = 12;
const maximumBackoffMs = 60 * 60 * 1000;
const webhookLeaseMs = 60_000;
const refundRetryWindowMs = 10 * 60 * 1000;

function retryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** Math.min(attempt, 12), maximumBackoffMs);
}

function errorMessage(error: unknown): string {
  return error instanceof PaymentGatewayError ? error.message : 'Payment gateway operation failed';
}

function workerLog(
  level: 'info' | 'warn' | 'error',
  event: string,
  fields: Record<string, string | number> = {}
) {
  const output = JSON.stringify({ level, event, ...fields });
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
}

function normalizeAmount(amount: string): string {
  const match = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) throw new PaymentGatewayError('Payment gateway returned an invalid amount', false);
  return `${match[1]}.${(match[2] ?? '').padEnd(2, '0')}`;
}

function eventPaymentStatus(status: string): 'captured' | 'failed' | 'cancelled' | null {
  if (status === 'Completed') return 'captured';
  if (status === 'Failed') return 'failed';
  if (status === 'Cancelled' || status === 'Canceled') return 'cancelled';
  return null;
}

async function applyVerifiedTransaction(
  payment: {
    id: string;
    transactionId: string | null;
    amount: string;
  },
  transaction: BkashTransaction,
  sourceId: string
) {
  if (
    transaction.paymentId !== payment.transactionId ||
    transaction.currency !== 'BDT' ||
    normalizeAmount(transaction.amount) !== normalizeAmount(payment.amount)
  ) {
    throw new PaymentGatewayError(
      'Payment gateway details do not match the recorded payment',
      false
    );
  }
  const status = eventPaymentStatus(transaction.transactionStatus);
  if (!status) return;
  if (status === 'captured' && !transaction.trxId) {
    throw new PaymentGatewayError('Completed gateway payment is missing its transaction ID', true);
  }
  await paymentService.applyWebhook({
    eventId: sourceId,
    paymentId: payment.id,
    transactionId: transaction.paymentId,
    gatewayTransactionId: transaction.trxId,
    amount: normalizeAmount(transaction.amount),
    status,
  });
}

async function claimWebhook() {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(paymentWebhooks)
      .where(
        or(
          and(eq(paymentWebhooks.status, 'pending'), lte(paymentWebhooks.nextAttemptAt, now)),
          and(eq(paymentWebhooks.status, 'processing'), lte(paymentWebhooks.lockedUntil, now))
        )
      )
      .orderBy(asc(paymentWebhooks.nextAttemptAt))
      .for('update', { skipLocked: true })
      .limit(1);
    if (!event) return null;
    const [claimed] = await tx
      .update(paymentWebhooks)
      .set({
        status: 'processing',
        attemptCount: event.attemptCount + 1,
        lockedUntil: new Date(now.getTime() + webhookLeaseMs),
      })
      .where(eq(paymentWebhooks.id, event.id))
      .returning();
    return claimed;
  });
}

async function processWebhook(event: NonNullable<Awaited<ReturnType<typeof claimWebhook>>>) {
  if (!event.paymentId)
    throw new PaymentGatewayError('Payment callback has no linked payment', false);
  const [payment] = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      transactionId: payments.transactionId,
    })
    .from(payments)
    .where(eq(payments.id, event.paymentId))
    .limit(1);
  if (!payment?.transactionId)
    throw new PaymentGatewayError('Payment reference is unavailable', false);

  let transaction = await paymentProvider.queryPayment(event.providerPaymentId);
  if (transaction.transactionStatus === 'Completed') {
    await applyVerifiedTransaction(payment, transaction, event.eventId);
    return;
  }

  const callbackStatus = event.payload.status;
  if (
    callbackStatus === 'success' &&
    transaction.verificationStatus === 'Complete' &&
    event.payload.executeAttempted !== true
  ) {
    if (await paymentService.flagWebhookExecuteAttempt(event.id)) {
      transaction = await paymentProvider.executePayment(event.providerPaymentId);
      if (transaction.transactionStatus !== 'Completed') {
        transaction = await paymentProvider.queryPayment(event.providerPaymentId);
      }
      if (transaction.transactionStatus === 'Completed') {
        await applyVerifiedTransaction(payment, transaction, event.eventId);
      }
    }
  }
}

async function completeWebhook(id: string) {
  await db
    .update(paymentWebhooks)
    .set({
      status: 'processed',
      processedAt: new Date(),
      lockedUntil: null,
      lastError: null,
    })
    .where(eq(paymentWebhooks.id, id));
}

async function failWebhook(
  event: NonNullable<Awaited<ReturnType<typeof claimWebhook>>>,
  error: unknown
) {
  const terminal =
    event.attemptCount >= maximumAttempts ||
    (error instanceof PaymentGatewayError && !error.retryable);
  const delay = retryDelay(event.attemptCount);
  await db
    .update(paymentWebhooks)
    .set({
      status: terminal ? 'failed' : 'pending',
      nextAttemptAt: new Date(Date.now() + delay),
      lockedUntil: null,
      lastError: errorMessage(error),
    })
    .where(eq(paymentWebhooks.id, event.id));
  workerLog(
    terminal ? 'error' : 'warn',
    terminal ? 'payment.webhook.failed' : 'payment.webhook.retry',
    {
      attempt: event.attemptCount,
    }
  );
}

async function processNextWebhook(): Promise<boolean> {
  const event = await claimWebhook();
  if (!event) return false;
  try {
    await processWebhook(event);
    await completeWebhook(event.id);
  } catch (error) {
    await failWebhook(event, error);
  }
  return true;
}

async function reconcilePendingPayments() {
  for (let index = 0; index < 20; index += 1) {
    const now = new Date();
    const payment = await db.transaction(async (tx) => {
      const [candidate] = await tx
        .select({
          id: payments.id,
          orderId: payments.orderId,
          amount: payments.amount,
          status: payments.status,
          transactionId: payments.transactionId,
          reconciliationAttempts: payments.reconciliationAttempts,
        })
        .from(payments)
        .where(
          and(
            inArray(payments.status, ['pending', 'authorized']),
            sql`${payments.transactionId} is not null`,
            or(
              lte(payments.nextReconciliationAt, now),
              and(
                isNull(payments.nextReconciliationAt),
                lte(payments.createdAt, new Date(now.getTime() - 60_000))
              )
            )
          )
        )
        .orderBy(asc(payments.nextReconciliationAt))
        .for('update', { skipLocked: true })
        .limit(1);
      if (!candidate) return null;
      const [claimed] = await tx
        .update(payments)
        .set({
          reconciliationAttempts: candidate.reconciliationAttempts + 1,
          nextReconciliationAt: new Date(
            now.getTime() + retryDelay(candidate.reconciliationAttempts + 1)
          ),
        })
        .where(eq(payments.id, candidate.id))
        .returning();
      return claimed;
    });
    if (!payment?.transactionId) return;
    try {
      const transaction = await paymentProvider.queryPayment(payment.transactionId);
      await applyVerifiedTransaction(
        payment,
        transaction,
        `reconcile:${payment.id}:${transaction.trxId ?? transaction.transactionStatus}`
      );
    } catch (error) {
      workerLog('warn', 'payment.reconciliation.retry', {
        attempt: payment.reconciliationAttempts + 1,
      });
    }
  }
}

async function claimRefund() {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(refunds)
      .where(
        and(
          eq(refunds.status, 'approved'),
          lt(refunds.attemptCount, maximumAttempts),
          or(lte(refunds.nextAttemptAt, now), isNull(refunds.nextAttemptAt))
        )
      )
      .orderBy(asc(refunds.nextAttemptAt), asc(refunds.createdAt))
      .for('update', { skipLocked: true })
      .limit(1);
    if (!candidate) return null;
    const [claimed] = await tx
      .update(refunds)
      .set({
        attemptCount: candidate.attemptCount + 1,
        nextAttemptAt: new Date(now.getTime() + webhookLeaseMs),
        lastAttemptAt: candidate.lastAttemptAt ?? now,
      })
      .where(eq(refunds.id, candidate.id))
      .returning();
    return claimed;
  });
}

function parseGatewayTime(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function markRefundProcessed(
  refundId: string,
  paymentId: string,
  gatewayRefundId: string,
  refundAmount: string
) {
  await db.transaction(async (tx) => {
    const [updatedRefund] = await tx
      .update(refunds)
      .set({
        status: 'processed',
        gatewayRefundId,
        nextAttemptAt: null,
        lastError: null,
      })
      .where(and(eq(refunds.id, refundId), eq(refunds.status, 'approved')))
      .returning({ id: refunds.id });
    if (!updatedRefund) return;
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .for('update')
      .limit(1);
    if (!payment) return;
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .for('update')
      .limit(1);
    if (!order) return;
    const [processedForOrder] = await tx
      .select({
        amount: sql<string>`coalesce(sum(${refunds.amount}), 0)::text`,
      })
      .from(refunds)
      .innerJoin(payments, eq(payments.id, refunds.paymentId))
      .where(and(eq(payments.orderId, order.id), eq(refunds.status, 'processed')));
    const cumulative = BigInt(processedForOrder.amount.replace('.', ''));
    const current = BigInt(refundAmount.replace('.', ''));
    const previousCumulative = cumulative - current;
    const orderTotal = BigInt(order.grandTotal.replace('.', ''));
    const saleEntries = await tx
      .select({
        vendorId: vendorLedgerEntries.vendorId,
        amount: sql<string>`sum(${vendorLedgerEntries.amount})::text`,
      })
      .from(vendorLedgerEntries)
      .where(
        and(eq(vendorLedgerEntries.orderId, order.id), eq(vendorLedgerEntries.entryType, 'sale'))
      )
      .groupBy(vendorLedgerEntries.vendorId);
    for (const sale of saleEntries) {
      await tx
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.id, sale.vendorId))
        .for('update');
      const saleCents = BigInt(sale.amount.replace('.', ''));
      const previousShare = (saleCents * previousCumulative) / orderTotal;
      const cumulativeShare = (saleCents * cumulative) / orderTotal;
      const debit = cumulativeShare - previousShare;
      if (debit <= 0n) continue;
      await tx
        .insert(vendorLedgerEntries)
        .values({
          vendorId: sale.vendorId,
          orderId: order.id,
          paymentId,
          entryType: 'refund',
          amount: `-${(debit / 100n).toString()}.${String(debit % 100n).padStart(2, '0')}`,
          currency: 'BDT',
          referenceKey: `refund:${refundId}:${sale.vendorId}`,
          memo: 'Vendor proceeds reversed for customer refund',
        })
        .onConflictDoNothing({ target: vendorLedgerEntries.referenceKey });
    }
    const [sum] = await tx
      .select({
        amount: sql<string>`coalesce(sum(${refunds.amount}), 0)::text`,
      })
      .from(refunds)
      .where(and(eq(refunds.paymentId, paymentId), eq(refunds.status, 'processed')));
    await tx
      .update(payments)
      .set({
        status:
          BigInt(sum.amount.replace('.', '')) >= BigInt(payment.amount.replace('.', ''))
            ? 'refunded'
            : 'partially_refunded',
      })
      .where(eq(payments.id, paymentId));
    const [captured] = await tx
      .select({
        amount: sql<string>`coalesce(sum(${payments.amount}), 0)::text`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.orderId, order.id),
          inArray(payments.status, ['captured', 'partially_refunded', 'refunded'])
        )
      );
    const [processed] = await tx
      .select({
        amount: sql<string>`coalesce(sum(${refunds.amount}), 0)::text`,
      })
      .from(refunds)
      .innerJoin(payments, eq(payments.id, refunds.paymentId))
      .where(and(eq(payments.orderId, order.id), eq(refunds.status, 'processed')));
    if (
      BigInt(processed.amount.replace('.', '')) >= BigInt(captured.amount.replace('.', '')) &&
      BigInt(captured.amount.replace('.', '')) > 0n
    ) {
      await tx
        .update(orders)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      await tx
        .update(couponUses)
        .set({ usageReleasedAt: new Date() })
        .where(and(eq(couponUses.orderId, order.id), isNull(couponUses.usageReleasedAt)));
    }
  });
}

async function processRefund(refund: NonNullable<Awaited<ReturnType<typeof claimRefund>>>) {
  const [payment] = await db
    .select({
      id: payments.id,
      transactionId: payments.transactionId,
      gatewayTransactionId: payments.gatewayTransactionId,
    })
    .from(payments)
    .where(eq(payments.id, refund.paymentId))
    .limit(1);
  if (!payment?.transactionId || !payment.gatewayTransactionId) {
    throw new PaymentGatewayError('Payment transaction reference is unavailable for refund', false);
  }
  const gatewayRefunds = await paymentProvider.refundStatus(
    payment.transactionId,
    payment.gatewayTransactionId
  );
  const baseline = new Set(refund.gatewayRefundBaseline ?? []);
  const minimumCompletionTime = (refund.lastAttemptAt ?? refund.createdAt).getTime() - 120_000;
  const completed = gatewayRefunds.find((item) => {
    const completedAt = parseGatewayTime(item.completedTime);
    return (
      !baseline.has(item.refundTrxId) &&
      item.refundTransactionStatus === 'Completed' &&
      normalizeAmount(item.refundAmount) === normalizeAmount(refund.amount) &&
      completedAt !== null &&
      completedAt >= minimumCompletionTime
    );
  });
  if (completed) {
    await markRefundProcessed(refund.id, payment.id, completed.refundTrxId, refund.amount);
    return;
  }

  if (refund.attemptCount === 1 && !refund.gatewayRefundBaseline) {
    await db
      .update(refunds)
      .set({
        gatewayRefundBaseline: gatewayRefunds.map((item) => item.refundTrxId),
      })
      .where(eq(refunds.id, refund.id));
  }
  const result = await paymentProvider.refund({
    paymentId: payment.transactionId,
    transactionId: payment.gatewayTransactionId,
    amount: refund.amount,
    refundId: refund.id,
    reason: refund.reason,
  });
  if (normalizeAmount(result.refundAmount) !== normalizeAmount(refund.amount)) {
    throw new PaymentGatewayError(
      'Payment gateway refund amount does not match the request',
      false
    );
  }
  await markRefundProcessed(refund.id, payment.id, result.refundTrxId, refund.amount);
}

async function failRefund(
  refund: NonNullable<Awaited<ReturnType<typeof claimRefund>>>,
  error: unknown
) {
  const terminal =
    refund.attemptCount >= maximumAttempts ||
    (error instanceof PaymentGatewayError && !error.retryable);
  const delay = Math.max(retryDelay(refund.attemptCount), refundRetryWindowMs);
  await db
    .update(refunds)
    .set({
      attemptCount: terminal ? maximumAttempts : refund.attemptCount,
      nextAttemptAt: terminal ? null : new Date(Date.now() + delay),
      lastError: errorMessage(error),
    })
    .where(eq(refunds.id, refund.id));
  workerLog(
    terminal ? 'error' : 'warn',
    terminal ? 'payment.refund.requires_review' : 'payment.refund.retry',
    {
      attempt: refund.attemptCount,
    }
  );
}

async function processDueRefunds() {
  for (let index = 0; index < 10; index += 1) {
    const refund = await claimRefund();
    if (!refund) return;
    try {
      await processRefund(refund);
    } catch (error) {
      await failRefund(refund, error);
    }
  }
}

export async function runPaymentWorkerOnce() {
  const expiredTokenRows = await db
    .delete(authActionTokens)
    .where(lte(authActionTokens.expiresAt, new Date()))
    .returning({ id: authActionTokens.id });
  if (expiredTokenRows.length) {
    workerLog('info', 'auth.action_tokens.expired', { deletedCount: expiredTokenRows.length });
  }
  const expiredReservationCount = await commerceService.expireReservationsDue();
  workerLog('info', 'inventory.reservations.expiry_cycle_complete', { expiredReservationCount });
  for (let index = 0; index < 50; index += 1) {
    if (!(await processNextWebhook())) break;
  }
  await reconcilePendingPayments();
  await processDueRefunds();
}
