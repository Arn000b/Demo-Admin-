import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { customerRoutes } from './features/customers/customer.routes';

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

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.0',
  });
});

// ─── Feature Routes ───────────────────────────────────────────────────────────

app.route('/customers', customerRoutes);

// ─── 404 Fallback ─────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found', path: c.req.path }, 404);
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.path}:`, err);
  return c.json(
    {
      success: false,
      error: err.message ?? 'Internal Server Error',
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
