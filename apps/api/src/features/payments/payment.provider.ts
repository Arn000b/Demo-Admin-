import { randomUUID } from 'node:crypto';

export interface PaymentProvider {
  createPaymentReference(): Promise<string>;
  refund(transactionId: string, amount: string, idempotencyKey: string): Promise<void>;
}

/** Local mock only. It does not contact a gateway or claim that a payment succeeded. */
export class MockPaymentProvider implements PaymentProvider {
  async createPaymentReference() {
    return `mock_${randomUUID()}`;
  }

  async refund(_transactionId: string, _amount: string, _idempotencyKey: string) {
    // The stable refund idempotency key is passed through the same interface a real gateway uses.
  }
}

export const paymentProvider = new MockPaymentProvider();
