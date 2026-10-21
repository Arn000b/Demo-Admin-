import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { Hono } from 'hono';
import { createAuthRoutes } from './auth.routes';
import {
  FallbackRateLimitStore,
  InMemoryRateLimitStore,
  type SharedRateLimitStore,
} from '../../middleware/rate-limit.middleware';
import { hashPassword, verifyPassword } from './password';
import {
  createAuthMiddleware,
  requireCustomerOwner,
  requireRole,
  type Principal,
} from '../../middleware/auth.middleware';
import type { AuthResult, AuthService, PublicAccount } from './auth.types';

class MemoryAuthService implements AuthService {
  private readonly accounts = new Map<
    string,
    { account: PublicAccount; hash: string; salt: string }
  >();
  private readonly sessions = new Map<string, PublicAccount>();
  private readonly actionTokens = new Map<string, string>();

  async register(input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<AuthResult | null> {
    if (this.accounts.has(input.email)) return null;
    const account: PublicAccount = {
      userId: randomBytes(16).toString('hex'),
      email: input.email,
      role: 'customer',
      customerId: randomBytes(16).toString('hex'),
      vendorId: null,
    };
    const { hash, salt } = await hashPassword(input.password);
    this.accounts.set(input.email, { account, hash, salt });
    return this.createSession(account);
  }

  async login(email: string, password: string): Promise<AuthResult | null> {
    const entry = this.accounts.get(email);
    if (!entry || !(await verifyPassword(password, entry.hash, entry.salt))) return null;
    return this.createSession(entry.account);
  }

  async resolveSession(token: string): Promise<PublicAccount | null> {
    return this.sessions.get(token) ?? null;
  }
  async revokeSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }
  async requestPasswordReset(email: string): Promise<string | null> {
    if (!this.accounts.has(email)) return null;
    const token = randomBytes(32).toString('base64url');
    this.actionTokens.set(token, email);
    return token;
  }
  async resetPassword(token: string, password: string): Promise<boolean> {
    const email = this.actionTokens.get(token);
    const entry = email ? this.accounts.get(email) : undefined;
    if (!email || !entry) return false;
    const { hash, salt } = await hashPassword(password);
    this.accounts.set(email, { ...entry, hash, salt });
    this.actionTokens.delete(token);
    return true;
  }
  async requestEmailVerification(userId: string): Promise<string | null> {
    const [email] =
      [...this.accounts.entries()].find(([, entry]) => entry.account.userId === userId) ?? [];
    if (!email) return null;
    const token = randomBytes(32).toString('base64url');
    this.actionTokens.set(token, email);
    return token;
  }
  async verifyEmail(token: string): Promise<boolean> {
    return this.actionTokens.delete(token);
  }

  private createSession(account: PublicAccount): AuthResult {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 60_000);
    this.sessions.set(token, account);
    return { account, token, expiresAt };
  }
}

const cookieFrom = (response: Response) => {
  const header = response.headers.get('set-cookie');
  assert.ok(header);
  const pair = header.split(';')[0];
  assert.ok(pair.startsWith('anonna_session='));
  return pair;
};
class TestSharedLimiter implements SharedRateLimitStore {
  private readonly counts = new Map<string, number>();
  async consume(key: string, limit: number) {
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return count <= limit
      ? { allowed: true as const }
      : { allowed: false as const, retryAfterSeconds: 60 };
  }
}

const appFor = (service: AuthService, limiter: SharedRateLimitStore = new TestSharedLimiter()) =>
  new Hono().route('/auth', createAuthRoutes(service, limiter));

test('registration, duplicate account, login, and invalid credentials', async () => {
  const service = new MemoryAuthService();
  const app = appFor(service);
  const body = {
    email: 'USER@example.com',
    password: 'correct horse battery 42',
    fullName: 'A Customer',
  };
  const registration = await app.request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.equal(registration.status, 201);
  const registrationText = await registration.text();
  assert.match(registrationText, /userId|"id"/);
  assert.doesNotMatch(registrationText, /correct horse|password_hash|salt|token/i);
  assert.ok(registration.headers.get('set-cookie')?.includes('HttpOnly'));

  const duplicate = await app.request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.equal(duplicate.status, 409);
  const badRole = await app.request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, role: 'admin' }),
  });
  assert.equal(badRole.status, 400);

  const login = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: body.password }),
  });
  assert.equal(login.status, 200);
  assert.ok(login.headers.get('set-cookie'));
  const invalid = await app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: 'incorrect password' }),
  });
  assert.equal(invalid.status, 401);
  assert.equal((await invalid.json()).error, 'Invalid email or password');
});

test('logout revokes session and protected endpoints reject missing or revoked sessions', async () => {
  const service = new MemoryAuthService();
  const app = appFor(service);
  const registered = await app.request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'logout@example.com',
      password: 'long enough password',
      fullName: 'Customer',
    }),
  });
  const cookie = cookieFrom(registered);
  assert.equal((await app.request('/auth/me')).status, 401);
  assert.equal((await app.request('/auth/me', { headers: { Cookie: cookie } })).status, 200);
  const logout = await app.request('/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0|Expires=/i);
  assert.equal((await app.request('/auth/me', { headers: { Cookie: cookie } })).status, 401);
});

test('role and customer ownership middleware deny unauthorized access', async () => {
  const principal: Principal = {
    userId: 'u1',
    email: 'customer@example.com',
    role: 'customer',
    customerId: 'c1',
    vendorId: null,
  };
  const app = new Hono<{ Variables: { principal: Principal } }>();
  app.get(
    '/admin',
    async (c, next) => createAuthMiddleware(async () => principal)(c, next),
    requireRole('admin'),
    (c) => c.json({ ok: true })
  );
  app.get(
    '/customers/:id',
    async (c, next) => createAuthMiddleware(async () => principal)(c, next),
    requireCustomerOwner(),
    (c) => c.json({ ok: true })
  );
  const headers = { Cookie: 'anonna_session=test-token' };
  assert.equal((await app.request('/admin', { headers })).status, 403);
  assert.equal((await app.request('/customers/c2', { headers })).status, 403);
  assert.equal((await app.request('/customers/c1', { headers })).status, 200);
});

test('login rate limit returns 429 after ten requests in its window', async () => {
  const app = appFor(new MemoryAuthService());
  const send = () =>
    app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'invalid' }),
    });
  for (let i = 0; i < 10; i += 1) assert.equal((await send()).status, 401);
  const limited = await send();
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.get('retry-after'));
});

test('registration rate limit returns 429 after five requests in its window', async () => {
  const app = appFor(new MemoryAuthService());
  const send = () =>
    app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  for (let i = 0; i < 5; i += 1) assert.equal((await send()).status, 400);
  assert.equal((await send()).status, 429);
});

test('login and registration continue with local limits while the shared limiter is unavailable', async () => {
  const limiter = new FallbackRateLimitStore(
    {
      consume: async () => {
        throw new Error('shared limiter offline');
      },
    },
    new InMemoryRateLimitStore(),
    () => {}
  );
  const app = new Hono()
    .basePath('/api')
    .route('/auth', createAuthRoutes(new MemoryAuthService(), limiter));
  const login = () =>
    app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'invalid' }),
    });
  const register = () =>
    app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

  for (let i = 0; i < 10; i += 1) assert.equal((await login()).status, 401);
  assert.equal((await login()).status, 429);
  for (let i = 0; i < 5; i += 1) assert.equal((await register()).status, 400);
  assert.equal((await register()).status, 429);
});

test('password reset and email verification token endpoints consume one-time development tokens', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const service = new MemoryAuthService();
    const app = appFor(service);
    const registered = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'lifecycle@example.com',
        password: 'correct horse battery 42',
        fullName: 'Lifecycle',
      }),
    });
    const cookie = cookieFrom(registered);
    const verificationRequest = await app.request('/auth/email-verification/request', {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    assert.equal(verificationRequest.status, 202);
    const verificationToken = (
      (await verificationRequest.json()) as { data: { developmentToken: string } }
    ).data.developmentToken;
    assert.equal(
      (
        await app.request('/auth/email-verification/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: verificationToken }),
        })
      ).status,
      200
    );

    const resetRequest = await app.request('/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lifecycle@example.com' }),
    });
    const resetToken = ((await resetRequest.json()) as { data: { developmentToken: string } }).data
      .developmentToken;
    assert.equal(
      (
        await app.request('/auth/password-reset/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, password: 'a newer secure password' }),
        })
      ).status,
      200
    );
    assert.equal(
      (
        await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'lifecycle@example.com',
            password: 'correct horse battery 42',
          }),
        })
      ).status,
      401
    );
    assert.equal(
      (
        await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'lifecycle@example.com',
            password: 'a newer secure password',
          }),
        })
      ).status,
      200
    );
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test('production password reset responses never disclose action tokens', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const app = appFor(new MemoryAuthService());
    const response = await app.request('/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com' }),
    });
    assert.equal(response.status, 202);
    assert.doesNotMatch(await response.text(), /developmentToken|token/i);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});
