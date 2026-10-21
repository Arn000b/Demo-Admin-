export function netVendorProceedsCents(
  grossAfterDiscountCents: bigint,
  commissionRateHundredths: bigint
): bigint {
  if (grossAfterDiscountCents < 0n) throw new RangeError('Vendor sale amount cannot be negative');
  if (commissionRateHundredths < 0n || commissionRateHundredths > 10000n) {
    throw new RangeError('Vendor commission rate must be from 0 to 100 percent');
  }
  const commission = (grossAfterDiscountCents * commissionRateHundredths + 5000n) / 10000n;
  return grossAfterDiscountCents - commission;
}
