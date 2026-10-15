import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canTransitionPayment, isDuplicatePaymentEvent, refundCapacityStatuses, refundFitsCapturedAmount } from './refund.rules';

test('pending, approved, and processed refunds all consume captured refund capacity', () => {
  assert.deepEqual(refundCapacityStatuses, ['pending', 'approved', 'processed']);
  assert.equal(refundFitsCapturedAmount('100.00', '80.00', '20.00'), true);
  assert.equal(refundFitsCapturedAmount('100.00', '80.01', '20.00'), false);
  assert.equal(refundFitsCapturedAmount('100.00', '100.00'), true);
});

test('payment event replay and out-of-order state rules are explicit', () => {
  assert.equal(isDuplicatePaymentEvent('captured', 'captured'), true);
  assert.equal(isDuplicatePaymentEvent('partially_refunded', 'captured'), true);
  assert.equal(canTransitionPayment('failed', 'captured'), true); // late capture is reconciled by refund review when needed
  assert.equal(canTransitionPayment('failed', 'authorized'), false);
  assert.equal(canTransitionPayment('cancelled', 'authorized'), false);
  assert.equal(canTransitionPayment('refunded', 'failed'), false);
});
