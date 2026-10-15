import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
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
import { HttpSharedRateLimitStore } from './middleware/rate-limit.middleware';

// ─── App ─────────────────────────────────────────────────────────────────────

const app = new Hono().basePath('/api');

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
);

// ─── Liveness and Readiness ───────────────────────────────────────────────────

app.route('/', createHealthRoutes(checkDatabaseReadiness));

// ─── Feature Routes ───────────────────────────────────────────────────────────

app.route('/customers', customerRoutes);
app.route('/auth', createAuthRoutes(authService, new HttpSharedRateLimitStore()));
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
const administration = createAdministrationRoutes(administrationService, authService);
app.route('/admin', administration.admin);
app.route('/vendor', administration.vendor);

// ─── 404 Fallback ─────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found', path: c.req.path }, 404);
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  // Error objects from database drivers can include SQL and parameter details.
  // Keep normal logs useful without writing those internals or request data.
  console.error(`[Error] ${c.req.method} ${c.req.path} (${err instanceof Error ? err.name : 'UnknownError'})`);
  if (err instanceof ApiError) return c.json({ success: false, error: err.message }, err.status);
  const databaseError = normalizeDatabaseError(err);
  if (databaseError) return c.json({ success: false, error: databaseError.message }, databaseError.status);
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
  console.log(`🚀 API server running at http://localhost:${info.port}/api`);
});

export type AppType = typeof app;
