import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BkashPaymentProvider, PaymentGatewayError } from './payment.provider';

const config = {
  baseUrl: 'https://tokenized.sandbox.bka.sh/v2/tokenized-checkout',
  username: 'merchant',
  password: 'password',
  appKey: 'app-key',
  appSecret: 'app-secret',
  callbackUrl: 'https://api.example.test/api/payments/bkash/callback',
  nodeEnv: 'test',
};

function memoryTokenCache() {
  let cached: { token: string; expiresAt: Date } | undefined;
  return {
    async getOrLoad(
      _accountKey: string,
      now: number,
      load: () => Promise<{ token: string; expiresAt: Date }>
    ) {
      if (cached && cached.expiresAt.getTime() > now + 60_000) return cached.token;
      cached = await load();
      return cached.token;
    },
  };
}

test('bKash adapter authenticates once and creates a BDT checkout with the expected contract', async () => {
  const requests: Array<{ url: string; headers: Headers; body: string }> = [];
  const provider = new BkashPaymentProvider(
    config,
    async (input, init) => {
      requests.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: String(init?.body ?? ''),
      });
      if (String(input).endsWith('/auth/grant-token')) {
        return Response.json({ statusCode: '0000', id_token: 'access-token', expires_in: 3600 });
      }
      return Response.json({
        statusCode: '0000',
        paymentID: 'bkash-payment-1',
        bKashURL: 'https://sandbox.payment.bkash.com/checkout',
      });
    },
    Date.now,
    memoryTokenCache()
  );

  const checkout = await provider.createCheckout({
    amount: '25.00',
    payerReference: 'payment-uuid',
    merchantInvoiceNumber: 'ANONNA-paymentuuid',
  });

  assert.deepEqual(checkout, {
    paymentId: 'bkash-payment-1',
    redirectUrl: 'https://sandbox.payment.bkash.com/checkout',
  });
  assert.equal(requests.length, 2);
  assert.equal(
    requests[0].url,
    'https://tokenized.sandbox.bka.sh/v2/tokenized-checkout/auth/grant-token'
  );
  assert.equal(
    requests[1].url,
    'https://tokenized.sandbox.bka.sh/v2/tokenized-checkout/payment/create'
  );
  assert.equal(requests[1].headers.get('authorization'), 'access-token');
  assert.deepEqual(JSON.parse(requests[1].body), {
    callbackURL: config.callbackUrl,
    payerReference: 'payment-uuid',
    amount: '25.00',
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: 'ANONNA-paymentuuid',
  });
});

test('missing merchant credentials fail only when gateway operations are attempted', async () => {
  const provider = new BkashPaymentProvider(
    {
      baseUrl: undefined,
      username: undefined,
      password: undefined,
      appKey: undefined,
      appSecret: undefined,
      callbackUrl: undefined,
    },
    fetch,
    Date.now,
    memoryTokenCache()
  );
  await assert.rejects(
    provider.queryPayment('payment-id'),
    (error: unknown) => error instanceof PaymentGatewayError && !error.retryable
  );
});

test('shared token caching requires the configured encryption key', async () => {
  const provider = new BkashPaymentProvider(
    {
      ...config,
      tokenEncryptionKey: undefined,
    },
    async () => {
      throw new Error('Gateway fetch must not run before validating token-cache configuration');
    }
  );
  await assert.rejects(
    provider.queryPayment('payment-id'),
    (error: unknown) =>
      error instanceof PaymentGatewayError &&
      !error.retryable &&
      error.message.includes('BKASH_TOKEN_ENCRYPTION_KEY')
  );
});

test('bKash execute, query, refund, and refund-status APIs use authenticated gateway requests', async () => {
  const requests: Array<{ url: string; headers: Headers; body: string }> = [];
  const provider = new BkashPaymentProvider(
    config,
    async (input, init) => {
      const url = String(input);
      requests.push({ url, headers: new Headers(init?.headers), body: String(init?.body ?? '') });
      if (url.endsWith('/auth/grant-token')) {
        return Response.json({ statusCode: '0000', id_token: 'cached-token', expires_in: 3600 });
      }
      if (url.endsWith('/payment/execute') || url.endsWith('/query/payment')) {
        return Response.json({
          paymentID: 'bkash-payment-1',
          trxId: 'gateway-trx-1',
          transactionStatus: 'Completed',
          verificationStatus: 'Complete',
          amount: '25.00',
          currency: 'BDT',
        });
      }
      if (url.endsWith('/refund/payment/transaction')) {
        return Response.json({
          refundTrxId: 'refund-trx-1',
          refundTransactionStatus: 'Completed',
          refundAmount: '5.00',
          completedTime: '2026-10-19T10:00:00.000 GMT+0600',
        });
      }
      return Response.json({
        refundTransactions: [
          {
            refundTrxId: 'refund-trx-1',
            refundTransactionStatus: 'Completed',
            refundAmount: '5.00',
            completedTime: '2026-10-19T10:00:00.000 GMT+0600',
          },
        ],
      });
    },
    Date.now,
    memoryTokenCache()
  );

  assert.equal((await provider.executePayment('bkash-payment-1')).trxId, 'gateway-trx-1');
  assert.equal((await provider.queryPayment('bkash-payment-1')).transactionStatus, 'Completed');
  const refund = await provider.refund({
    paymentId: 'bkash-payment-1',
    transactionId: 'gateway-trx-1',
    amount: '5.00',
    refundId: 'refund-uuid',
    reason: 'Customer request',
  });
  assert.equal(refund.refundTrxId, 'refund-trx-1');
  assert.equal((await provider.refundStatus('bkash-payment-1', 'gateway-trx-1')).length, 1);
  assert.equal(requests.filter((request) => request.url.endsWith('/auth/grant-token')).length, 1);
  assert.ok(
    requests.slice(1).every((request) => request.headers.get('authorization') === 'cached-token')
  );
  assert.deepEqual(
    JSON.parse(
      requests.find((request) => request.url.endsWith('/refund/payment/transaction'))!.body
    ),
    {
      paymentId: 'bkash-payment-1',
      trxId: 'gateway-trx-1',
      refundAmount: '5.00',
      sku: 'refund-uuid',
      reason: 'Customer request',
    }
  );
});

test('production configuration requires HTTPS for gateway and callback URLs', () => {
  assert.throws(
    () =>
      new BkashPaymentProvider({
        ...config,
        nodeEnv: 'production',
        baseUrl: 'http://gateway.example.test/v2/tokenized-checkout',
      })
  );
});
