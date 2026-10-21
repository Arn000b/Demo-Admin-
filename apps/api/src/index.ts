import dotenv from 'dotenv';
dotenv.config();
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { randomUUID } from 'node:crypto';
import { prettyJSON } from 'hono/pretty-json';
import { customerRoutes } from './features/customers/customer.routes';
import { createAuthRoutes } from './features/auth/auth.routes';
import { authService } from './features/auth/auth.service';
import { createCatalogRoutes } from './features/catalog/catalog.routes';
import { catalogService } from './features/catalog/catalog.service';
import { createCommerceRoutes } from './features/commerce/commerce.routes';
import { commerceService } from './features/commerce/commerce.service';
import { createPaymentRoutes } from './features/payments/payment.routes';
import { paymentService } from './features/payments/payment.service';
import { createFulfillmentRoutes } from './features/fulfillment/fulfillment.routes';
import { fulfillmentService } from './features/fulfillment/fulfillment.service';
import { createAdministrationRoutes } from './features/administration/administration.routes';
import { administrationService } from './features/administration/administration.service';
import { ApiError, normalizeDatabaseError } from './lib/api-error';
import { checkDatabaseReadiness } from '@repo/db';
import { createHealthRoutes } from './routes/health.routes';
import {
  FallbackRateLimitStore,
  HttpSharedRateLimitStore,
  InMemoryRateLimitStore,
} from './middleware/rate-limit.middleware';
import { RedisRateLimitStore } from './infra/cache/redis';
import { logger } from './lib/logger';

// ─── App ─────────────────────────────────────────────────────────────────────

const app = new Hono().basePath('/api');
const authRateLimitStore = new FallbackRateLimitStore(
  process.env.REDIS_URL ? new RedisRateLimitStore() : new HttpSharedRateLimitStore(),
  new InMemoryRateLimitStore(),
  (degraded) => {
    logger.warn(
      { degraded },
      `[AuthRateLimit] shared limiter ${degraded ? 'unavailable; using local fallback' : 'recovered'}`
    );
  }
);

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  c.header('x-request-id', requestId);
  await next();
  const durationMs = Date.now() - startedAt;
  const status = c.res.status;
  const method = c.req.method;
  const path = c.req.path;
  if (status >= 500) {
    logger.error(
      { event: 'http.request', requestId, method, path, status, durationMs },
      `${method} ${path} ${status} (${durationMs}ms)`
    );
  } else if (status >= 400) {
    logger.warn(
      { event: 'http.request', requestId, method, path, status, durationMs },
      `${method} ${path} ${status} (${durationMs}ms)`
    );
  } else {
    logger.info(
      { event: 'http.request', requestId, method, path, status, durationMs },
      `${method} ${path} ${status} (${durationMs}ms)`
    );
  }
});
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
);

// ─── Liveness and Readiness ───────────────────────────────────────────────────

app.route(
  '/',
  createHealthRoutes(checkDatabaseReadiness, () => authRateLimitStore.status)
);

// ─── Feature Routes ───────────────────────────────────────────────────────────

app.route('/customers', customerRoutes);
app.route('/auth', createAuthRoutes(authService, authRateLimitStore));
const catalog = createCatalogRoutes(catalogService, authService);
app.route('/categories', catalog.categories);
app.route('/products', catalog.products);
app.route('/variants', catalog.variants);
app.route('/warehouses', catalog.warehouses);
app.route('/inventory', catalog.inventory);
const commerce = createCommerceRoutes(commerceService, authService);
app.route('/cart', commerce.cart);
app.route('/wishlists', commerce.wishlists);
app.route('/orders', commerce.orders);
app.route('/coupons', commerce.coupon);
app.route('/payments', createPaymentRoutes(paymentService, authService));
app.route('/', createFulfillmentRoutes(fulfillmentService, authService));
const administration = createAdministrationRoutes(
  administrationService,
  authService,
  authRateLimitStore
);
app.route('/admin', administration.admin);
app.route('/vendor', administration.vendor);
app.route('/vendor-applications', administration.vendorApplications);

// ─── 404 Fallback ─────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found', path: c.req.path }, 404);
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  logger.error(
    {
      event: 'http.error',
      requestId: c.res.headers.get('x-request-id'),
      method: c.req.method,
      path: c.req.path,
      errorType: err instanceof Error ? err.name : 'UnknownError',
      errorMessage: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack : undefined,
    },
    `[Error] ${c.req.method} ${c.req.path}`
  );
  if (err instanceof ApiError) return c.json({ success: false, error: err.message }, err.status);
  const databaseError = normalizeDatabaseError(err);
  if (databaseError)
    return c.json({ success: false, error: databaseError.message }, databaseError.status);
  return c.json(
    {
      success: false,
      error: 'Internal Server Error',
    },
    500
  );
});

// ─── Server ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 4000;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  logger.info(
    { event: 'api.started', port: info.port },
    `🚀 API server running at http://localhost:${info.port}/api`
  );
});

export type AppType = typeof app;
