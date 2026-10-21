import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@repo/db';
import { paymentGatewayTokens } from '@repo/db/schema';

export type BkashTransaction = {
  paymentId: string;
  trxId?: string;
  transactionStatus: string;
  verificationStatus?: string;
  amount: string;
  currency: string;
};

export type BkashCheckout = {
  paymentId: string;
  redirectUrl: string;
};

export type BkashRefundStatus = {
  refundTrxId: string;
  refundTransactionStatus: string;
  refundAmount: string;
  completedTime: string;
};

export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}

type BkashConfig = {
  baseUrl?: string;
  username?: string;
  password?: string;
  appKey?: string;
  appSecret?: string;
  callbackUrl?: string;
  tokenEncryptionKey?: string;
  nodeEnv?: string;
};

type JsonObject = Record<string, unknown>;
type AccessToken = { token: string; expiresAt: Date };
type AccessTokenLoader = () => Promise<AccessToken>;
interface SharedAccessTokenCache {
  getOrLoad(accountKey: string, now: number, load: AccessTokenLoader): Promise<string>;
}

class PostgresAccessTokenCache implements SharedAccessTokenCache {
  constructor(private readonly encryptionKey: string) {}

  async getOrLoad(accountKey: string, now: number, load: AccessTokenLoader): Promise<string> {
    const key = this.key();
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(736241, 1)`);
      const [cached] = await tx
        .select()
        .from(paymentGatewayTokens)
        .where(
          and(
            eq(paymentGatewayTokens.provider, 'bkash'),
            eq(paymentGatewayTokens.accountKey, accountKey)
          )
        )
        .limit(1);
      if (cached && cached.expiresAt.getTime() > now + 60_000) {
        return this.decrypt(cached.encryptedAccessToken, key);
      }

      const accessToken = await load();
      await tx
        .insert(paymentGatewayTokens)
        .values({
          provider: 'bkash',
          accountKey,
          encryptedAccessToken: this.encrypt(accessToken.token, key),
          expiresAt: accessToken.expiresAt,
        })
        .onConflictDoUpdate({
          target: [paymentGatewayTokens.provider, paymentGatewayTokens.accountKey],
          set: {
            encryptedAccessToken: this.encrypt(accessToken.token, key),
            expiresAt: accessToken.expiresAt,
            updatedAt: new Date(),
          },
        });
      return accessToken.token;
    });
  }

  private key(): Buffer {
    if (!/^[a-f\d]{64}$/i.test(this.encryptionKey)) {
      throw new PaymentGatewayError(
        'BKASH_TOKEN_ENCRYPTION_KEY must be a 32-byte hexadecimal key',
        false
      );
    }
    return Buffer.from(this.encryptionKey, 'hex');
  }

  private encrypt(plaintext: string, key: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
  }

  private decrypt(value: string, key: Buffer): string {
    try {
      const [ivValue, tagValue, encryptedValue] = value.split('.');
      if (!ivValue || !tagValue || !encryptedValue) throw new Error('Malformed encrypted token');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new PaymentGatewayError('Could not decrypt the cached gateway token', false);
    }
  }
}

const checkoutPath = '/payment/create';
const requestTimeoutMs = 30_000;

function record(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PaymentGatewayError('Payment gateway returned an invalid response', false);
  }
  return value as JsonObject;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new PaymentGatewayError(`Payment gateway response is missing ${field}`, false);
  }
  return value;
}

export class BkashPaymentProvider {
  private readonly baseUrl: URL | null;
  private readonly username: string;
  private readonly password: string;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly callbackUrl: URL | null;
  private readonly tokenCache: SharedAccessTokenCache;
  private readonly accountKey: string;

  constructor(
    config: BkashConfig = {
      baseUrl: process.env.BKASH_API_BASE_URL,
      username: process.env.BKASH_USERNAME,
      password: process.env.BKASH_PASSWORD,
      appKey: process.env.BKASH_APP_KEY,
      appSecret: process.env.BKASH_APP_SECRET,
      callbackUrl: process.env.BKASH_CALLBACK_URL,
      tokenEncryptionKey: process.env.BKASH_TOKEN_ENCRYPTION_KEY,
      nodeEnv: process.env.NODE_ENV,
    },
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
    tokenCache?: SharedAccessTokenCache
  ) {
    const baseUrl = config.baseUrl?.trim();
    const callbackUrl = config.callbackUrl?.trim();
    this.username = config.username?.trim() ?? '';
    this.password = config.password?.trim() ?? '';
    this.appKey = config.appKey?.trim() ?? '';
    this.appSecret = config.appSecret?.trim() ?? '';
    this.accountKey = createHash('sha256').update(this.appKey).digest('hex');
    this.tokenCache =
      tokenCache ?? new PostgresAccessTokenCache(config.tokenEncryptionKey?.trim() ?? '');
    if (
      !baseUrl ||
      !this.username ||
      !this.password ||
      !this.appKey ||
      !this.appSecret ||
      !callbackUrl
    ) {
      this.baseUrl = null;
      this.callbackUrl = null;
      return;
    }
    this.baseUrl = new URL(baseUrl);
    this.callbackUrl = new URL(callbackUrl);
    if (
      !['http:', 'https:'].includes(this.baseUrl.protocol) ||
      !['http:', 'https:'].includes(this.callbackUrl.protocol)
    ) {
      throw new Error('bKash URLs must use HTTP or HTTPS');
    }
    if (
      config.nodeEnv === 'production' &&
      (this.baseUrl.protocol !== 'https:' || this.callbackUrl.protocol !== 'https:')
    ) {
      throw new Error('Production bKash URLs must use HTTPS');
    }
    if (
      this.baseUrl.username ||
      this.baseUrl.password ||
      this.baseUrl.search ||
      this.baseUrl.hash
    ) {
      throw new Error(
        'BKASH_API_BASE_URL must be an origin and API path without credentials or query parameters'
      );
    }
  }

  async createCheckout(input: {
    amount: string;
    payerReference: string;
    merchantInvoiceNumber: string;
  }): Promise<BkashCheckout> {
    const { callbackUrl } = this.configuration();
    const response = record(
      await this.request(checkoutPath, {
        callbackURL: callbackUrl.toString(),
        payerReference: input.payerReference,
        amount: input.amount,
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: input.merchantInvoiceNumber,
      })
    );
    const paymentId = requiredString(response.paymentID ?? response.paymentId, 'paymentId');
    const redirectUrl = requiredString(response.bKashURL ?? response.bkashURL, 'bKashURL');
    const redirect = new URL(redirectUrl);
    if (
      redirect.protocol !== 'https:' ||
      !(redirect.hostname === 'bkash.com' || redirect.hostname.endsWith('.bkash.com'))
    ) {
      throw new PaymentGatewayError('Payment gateway returned an invalid checkout URL', false);
    }
    return { paymentId, redirectUrl };
  }

  async executePayment(paymentId: string): Promise<BkashTransaction> {
    return this.transaction('/payment/execute', { paymentID: paymentId });
  }

  async queryPayment(paymentId: string): Promise<BkashTransaction> {
    return this.transaction('/query/payment', { paymentID: paymentId });
  }

  async refund(input: {
    paymentId: string;
    transactionId: string;
    amount: string;
    refundId: string;
    reason: string;
  }): Promise<BkashRefundStatus> {
    const response = record(
      await this.request('/refund/payment/transaction', {
        paymentId: input.paymentId,
        trxId: input.transactionId,
        refundAmount: input.amount,
        sku: input.refundId,
        reason: input.reason.slice(0, 255),
      })
    );
    if (response.refundTransactionStatus !== 'Completed') {
      throw new PaymentGatewayError('Payment gateway has not confirmed the refund', true);
    }
    return {
      refundTrxId: requiredString(response.refundTrxId, 'refundTrxId'),
      refundTransactionStatus: requiredString(
        response.refundTransactionStatus,
        'refundTransactionStatus'
      ),
      refundAmount: requiredString(response.refundAmount, 'refundAmount'),
      completedTime: requiredString(response.completedTime, 'completedTime'),
    };
  }

  async refundStatus(paymentId: string, transactionId: string): Promise<BkashRefundStatus[]> {
    const response = record(
      await this.request('/refund/payment/status', {
        paymentId,
        trxId: transactionId,
      })
    );
    if (!Array.isArray(response.refundTransactions)) return [];
    return response.refundTransactions.map((item) => {
      const refund = record(item);
      return {
        refundTrxId: requiredString(refund.refundTrxId, 'refundTrxId'),
        refundTransactionStatus: requiredString(
          refund.refundTransactionStatus,
          'refundTransactionStatus'
        ),
        refundAmount: requiredString(refund.refundAmount, 'refundAmount'),
        completedTime: requiredString(refund.completedTime, 'completedTime'),
      };
    });
  }

  private async transaction(path: string, body: JsonObject): Promise<BkashTransaction> {
    const response = record(await this.request(path, body));
    return {
      paymentId: requiredString(response.paymentID ?? response.paymentId, 'paymentId'),
      trxId:
        typeof response.trxId === 'string'
          ? response.trxId
          : typeof response.trxID === 'string'
            ? response.trxID
            : undefined,
      transactionStatus: requiredString(response.transactionStatus, 'transactionStatus'),
      verificationStatus:
        typeof response.verificationStatus === 'string' ? response.verificationStatus : undefined,
      amount: requiredString(response.amount, 'amount'),
      currency: requiredString(response.currency, 'currency'),
    };
  }

  private async request(path: string, body: JsonObject): Promise<unknown> {
    const { baseUrl } = this.configuration();
    const token = await this.accessToken();
    let response: Response;
    try {
      response = await this.fetcher(this.endpoint(baseUrl, path), {
        method: 'POST',
        headers: {
          authorization: token,
          'x-app-key': this.appKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch {
      throw new PaymentGatewayError('Payment gateway request failed', true);
    }
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new PaymentGatewayError(
        'Payment gateway returned an invalid response',
        response.status >= 500
      );
    }
    const result = record(parsed);
    if (!response.ok || (typeof result.statusCode === 'string' && result.statusCode !== '0000')) {
      throw new PaymentGatewayError(
        'Payment gateway rejected the request',
        response.status === 429 || response.status >= 500
      );
    }
    return result;
  }

  private async accessToken(): Promise<string> {
    return this.tokenCache.getOrLoad(this.accountKey, this.now(), () => this.grantToken());
  }

  private async grantToken(): Promise<AccessToken> {
    const { baseUrl } = this.configuration();
    let response: Response;
    try {
      response = await this.fetcher(this.endpoint(baseUrl, '/auth/grant-token'), {
        method: 'POST',
        headers: {
          username: this.username,
          password: this.password,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ app_key: this.appKey, app_secret: this.appSecret }),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch {
      throw new PaymentGatewayError('Payment gateway authentication failed', true);
    }
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new PaymentGatewayError(
        'Payment gateway authentication failed',
        response.status >= 500
      );
    }
    const result = record(parsed);
    if (!response.ok || result.statusCode !== '0000') {
      throw new PaymentGatewayError(
        'Payment gateway authentication failed',
        response.status === 429 || response.status >= 500
      );
    }
    const token = requiredString(result.id_token, 'access token');
    const expiresIn = Number(result.expires_in ?? 3600);
    return {
      token,
      expiresAt: new Date(
        this.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000
      ),
    };
  }

  private configuration(): { baseUrl: URL; callbackUrl: URL } {
    if (!this.baseUrl || !this.callbackUrl) {
      throw new PaymentGatewayError('bKash payment gateway is not configured', false);
    }
    return { baseUrl: this.baseUrl, callbackUrl: this.callbackUrl };
  }

  private endpoint(baseUrl: URL, path: string): URL {
    const basePath = baseUrl.pathname.replace(/\/+$/, '');
    const suffix = path.replace(/^\/+/, '');
    return new URL(`${basePath}/${suffix}`, baseUrl.origin);
  }
}

export const paymentProvider = new BkashPaymentProvider();
