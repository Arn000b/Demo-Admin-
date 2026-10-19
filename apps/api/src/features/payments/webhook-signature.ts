import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyPaymentWebhook(raw: string, timestamp: string, signature: string, secret: string, now = Date.now()): boolean {
  if (secret.length < 32 || !/^\d{10}$/.test(timestamp) || !/^[a-f\d]{64}$/i.test(signature) || Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest();
  const actual = Buffer.from(signature, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
