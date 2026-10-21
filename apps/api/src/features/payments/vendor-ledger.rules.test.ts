import assert from 'node:assert/strict';
import { test } from 'node:test';
import { netVendorProceedsCents } from './vendor-ledger.rules';

test('vendor proceeds deduct commission from discounted item value with cent rounding', () => {
  assert.equal(netVendorProceedsCents(10000n, 1000n), 9000n);
  assert.equal(netVendorProceedsCents(10001n, 1250n), 8751n);
  assert.equal(netVendorProceedsCents(1n, 5000n), 0n);
});

test('vendor proceeds reject negative amounts and out-of-range commission rates', () => {
  assert.throws(() => netVendorProceedsCents(-1n, 1000n), RangeError);
  assert.throws(() => netVendorProceedsCents(1n, 10001n), RangeError);
});
