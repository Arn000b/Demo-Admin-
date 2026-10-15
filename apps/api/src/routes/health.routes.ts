import { Hono } from 'hono';

export type DatabaseReadinessCheck = () => Promise<boolean>;

export function createHealthRoutes(checkDatabase: DatabaseReadinessCheck) {
  const routes = new Hono();

  routes.get('/health', (c) => c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.0',
  }));

  routes.get('/ready', async (c) => {
    try {
      if (await checkDatabase()) return c.json({ status: 'ready' });
    } catch {
      // Keep connection and driver details out of the readiness response.
    }
    return c.json({ status: 'unavailable' }, 503);
  });

  return routes;
}
