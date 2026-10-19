export const refundCapacityStatuses = ['pending', 'approved', 'processed'] as const;

const cents = (value: string) => BigInt(value.replace('.', ''));

export function refundFitsCapturedAmount(capturedAmount: string, activeRefundAmount: string, requestedAmount = '0.00'): boolean {
  return cents(activeRefundAmount) + cents(requestedAmount) <= cents(capturedAmount);
}

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded';
export type PaymentEventStatus = 'authorized' | 'captured' | 'failed' | 'cancelled';
export function isDuplicatePaymentEvent(current: PaymentStatus, incoming: PaymentEventStatus): boolean {
  return current === incoming ||
    (['captured', 'partially_refunded', 'refunded'].includes(current) && ['captured', 'authorized'].includes(incoming)) ||
    (['failed', 'cancelled'].includes(current) && ['failed', 'cancelled'].includes(incoming));
}
export function canTransitionPayment(current: PaymentStatus, incoming: PaymentEventStatus): boolean {
  const allowed: Record<PaymentStatus, PaymentEventStatus[]> = {
    pending: ['authorized', 'captured', 'failed', 'cancelled'],
    authorized: ['captured', 'failed', 'cancelled'],
    failed: ['captured'], cancelled: ['captured'],
    captured: [], partially_refunded: [], refunded: [],
  };
  return allowed[current].includes(incoming);
}
