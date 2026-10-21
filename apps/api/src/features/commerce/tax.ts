const configuredRate = process.env.CHECKOUT_TAX_RATE_PERCENT ?? '0';
if (!/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/.test(configuredRate) || Number(configuredRate) > 100) {
  throw new Error(
    'CHECKOUT_TAX_RATE_PERCENT must be a percentage from 0 to 100 with at most two decimals'
  );
}

export const checkoutTaxRatePercent = configuredRate;
export const checkoutTaxRateHundredths =
  BigInt(configuredRate.split('.')[0]!) * 100n +
  BigInt((configuredRate.split('.')[1] ?? '').padEnd(2, '0'));

export function calculateCheckoutTax(taxableCents: bigint): bigint {
  return calculateTaxAtRate(taxableCents, checkoutTaxRateHundredths);
}

export function calculateTaxAtRate(taxableCents: bigint, rateHundredths: bigint): bigint {
  if (taxableCents < 0n) throw new RangeError('Taxable amount cannot be negative');
  if (rateHundredths < 0n || rateHundredths > 10000n)
    throw new RangeError('Tax rate must be from 0 to 100 percent');
  return (taxableCents * rateHundredths + 5000n) / 10000n;
}
