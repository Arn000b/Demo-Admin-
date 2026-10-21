import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateCheckoutTax, calculateTaxAtRate, checkoutTaxRatePercent } from './tax';

test('checkout tax uses the configured tax-exclusive BDT rate with half-up cent rounding', () => {
  assert.equal(checkoutTaxRatePercent, process.env.CHECKOUT_TAX_RATE_PERCENT ?? '0');
  assert.equal(calculateCheckoutTax(0n), 0n);
  assert.equal(calculateTaxAtRate(10000n, 550n), 550n);
  assert.equal(calculateTaxAtRate(1n, 5000n), 1n);
  const [whole, fraction = ''] = checkoutTaxRatePercent.split('.');
  const rateHundredths = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  assert.equal(calculateCheckoutTax(10000n), (10000n * rateHundredths + 5000n) / 10000n);
});

test('checkout tax rejects negative taxable values', () => {
  assert.throws(() => calculateCheckoutTax(-1n), RangeError);
  assert.throws(() => calculateTaxAtRate(1n, 10001n), RangeError);
});
